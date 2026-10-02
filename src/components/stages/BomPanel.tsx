import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Download,
  ExternalLink,
  FileSpreadsheet,
  LoaderCircle,
  Minus,
  PencilLine,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/db";
import {
  analyzeWorkbook,
  BOM_FIELDS,
  extractItems,
  isSpreadsheet,
  readWorkbook,
  type BomField,
  type ImportedItem,
  type SheetTable,
} from "@/lib/bomParser";
import {
  downloadTemplate,
  formatQty,
  hasProgress,
  itemState,
  mapProcurement,
  planBomUpdate,
  type ProcurementItem,
} from "@/lib/procurement";
import { STAGE_PAGES } from "@/lib/stages";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StageUpdate } from "./DesignStage";
import { EASE, formatSize, timeAgo } from "./shared";

type Table = SheetTable & { itemCount: number; include: boolean };

// The BOM is uploaded in Design. Each row becomes a card in Material Procurement, and a new
// revision updates those cards instead of starting over, so stock checks and enquiries stay.
export function BomPanel({
  orderId,
  author,
  employees,
  onAuthor,
  loading,
  revisions,
  onSaveFile,
  onOpen,
  onDownload,
}: {
  orderId: string;
  author: string;
  employees: string[];
  onAuthor: (name: string) => void;
  loading: boolean;
  revisions: StageUpdate[];
  onSaveFile: (file: File, remarks: string) => Promise<StageUpdate | null>;
  onOpen: (update: StageUpdate) => void;
  onDownload: (update: StageUpdate) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [parsed, setParsed] = useState<{ file: File; tables: Table[] } | null>(null);
  const latest = revisions.at(-1);

  const loadItems = useCallback(async () => {
    const { data } = await supabase
      .from("procurement_items")
      .select("*")
      .eq("inward_order_id", orderId)
      .order("display_order");
    setItems((data ?? []).map(mapProcurement));
  }, [orderId]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function readFile(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!isSpreadsheet(file)) {
      toast.error("The BOM must be an Excel (.xlsx) or CSV file");
      return;
    }
    setReading(true);
    try {
      const { tables } = analyzeWorkbook(await readWorkbook(file));
      if (!tables.length)
        toast.error("No item list found in this file. Check that it has a description column.");
      else setParsed({ file, tables });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read this file");
    } finally {
      setReading(false);
    }
  }

  async function apply(values: {
    file: File;
    items: ImportedItem[];
    removeMissing: boolean;
    remarks: string;
  }) {
    const plan = planBomUpdate(items, values.items);
    const revision = revisions.length;
    const saved = await onSaveFile(values.file, values.remarks);
    if (!saved) return false;

    let failed = false;
    const start = items.reduce((max, item) => Math.max(max, item.displayOrder), 0);
    if (plan.added.length) {
      const { error } = await supabase.from("procurement_items").insert(
        plan.added.map((row, index) => ({
          inward_order_id: orderId,
          item_name: row.itemName,
          category: row.category,
          make: row.make,
          model: row.model,
          specification: row.specification,
          unit: row.unit,
          qty_required: row.qtyRequired,
          notes: row.notes,
          display_order: start + index + 1,
        })),
      );
      failed ||= Boolean(error);
    }
    for (const { item, next } of plan.changed) {
      // Blank cells in the new BOM keep what is already on the card.
      const { error } = await supabase
        .from("procurement_items")
        .update({
          qty_required: next.qtyRequired,
          category: next.category || item.category,
          make: next.make || item.make,
          model: next.model || item.model,
          specification: next.specification || item.specification,
          unit: next.unit || item.unit,
        })
        .eq("id", item.id);
      failed ||= Boolean(error);
    }
    const removed = values.removeMissing ? plan.removed : [];
    if (removed.length) {
      const { error } = await supabase
        .from("procurement_items")
        .delete()
        .in(
          "id",
          removed.map((item) => item.id),
        );
      failed ||= Boolean(error);
    }

    const summary = [
      plan.added.length ? `${plan.added.length} added` : "",
      plan.changed.length ? `${plan.changed.length} updated` : "",
      removed.length ? `${removed.length} removed` : "",
    ]
      .filter(Boolean)
      .join(", ");
    await supabase.from("stage_updates").insert({
      inward_order_id: orderId,
      stage_name: STAGE_PAGES.procurement.name,
      kind: "update",
      author,
      remarks: `BOM R${revision} uploaded in Design (${values.file.name})${summary ? `: ${summary}` : ": no changes"}`,
    });
    await loadItems();
    if (failed) toast.error("Some items could not be saved. Please check Material Procurement.");
    else
      toast.success(
        revision === 0
          ? `BOM uploaded · ${plan.added.length} cards created in Material Procurement`
          : `BOM R${revision} uploaded${summary ? ` · ${summary}` : ""}`,
      );
    return true;
  }

  const stats = useMemo(() => {
    const makes = new Map<string, { label: string; count: number }>();
    const categories = new Set<string>();
    let available = 0;
    for (const item of items) {
      const make = item.make.trim();
      if (make) {
        const k = make.toLowerCase();
        makes.set(k, { label: makes.get(k)?.label ?? make, count: (makes.get(k)?.count ?? 0) + 1 });
      }
      if (item.category.trim()) categories.add(item.category.trim().toLowerCase());
      if (itemState(item) === "complete") available++;
    }
    return {
      makes: [...makes.values()].sort((a, b) => b.count - a.count),
      categories: categories.size,
      available,
    };
  }, [items]);

  const dragProps = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDragging(false);
      void readFile(event.dataTransfer.files?.[0]);
    },
  };

  return (
    <div
      {...dragProps}
      className={`neo-surface relative overflow-hidden rounded-3xl p-5 transition-shadow sm:p-6 ${dragging ? "ring-4 ring-primary/40" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xlsm,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        className="hidden"
        onChange={(event) => void readFile(event.target.files?.[0])}
      />

      <div className="flex flex-wrap items-center gap-3">
        <span className="neo-pop grid h-11 w-11 place-items-center rounded-xl text-emerald-600">
          <FileSpreadsheet className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground">Bill of Materials</h2>
          <p className="text-xs text-muted-foreground">
            Upload the BOM here. Every item becomes a card in Material Procurement.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => void downloadTemplate()}>
            <Download /> Template
          </Button>
          {(latest || items.length > 0) && (
            <Button size="sm" onClick={() => inputRef.current?.click()} disabled={reading}>
              {reading ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
              {latest ? "Upload new revision" : "Upload BOM"}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="mt-5 h-28 animate-pulse rounded-2xl" />
      ) : !latest && items.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={reading}
          className="group/upload mt-5 flex w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-primary/25 px-6 py-10 text-center transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
        >
          <span className="neo-pop grid h-16 w-16 place-items-center rounded-2xl text-primary transition-transform group-hover/upload:scale-110">
            {reading ? (
              <LoaderCircle className="h-7 w-7 animate-spin" />
            ) : (
              <UploadCloud className="h-7 w-7" />
            )}
          </span>
          <span>
            <span className="block text-base font-bold text-foreground">Upload the BOM Excel</span>
            <span className="mt-1 block max-w-md text-sm text-muted-foreground">
              Any layout works: the header row, columns, sections and sheets are found
              automatically, and you can check them before the cards are created.
            </span>
          </span>
        </button>
      ) : (
        <div className="mt-5 space-y-4">
          {latest && (
            <div className="neo-inset flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-4 py-3 text-sm">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                BOM · R{revisions.length - 1}
              </span>
              <span className="flex min-w-0 items-center gap-2 font-medium">
                <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="truncate">{latest.fileName}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {[
                  formatSize(latest.fileSize),
                  latest.author ? `by ${latest.author}` : "",
                  timeAgo(latest.createdAt),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {revisions.length > 1 && (
                <span className="flex items-center gap-1">
                  {revisions.slice(0, -1).map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onDownload(item)}
                      title={`Download R${index}${item.remarks ? `: ${item.remarks}` : ""}`}
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    >
                      R{index}
                    </button>
                  ))}
                </span>
              )}
              <span className="ml-auto flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  title="Open"
                  aria-label="Open BOM"
                  onClick={() => onOpen(latest)}
                >
                  <ExternalLink />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  title="Download"
                  aria-label="Download BOM"
                  onClick={() => onDownload(latest)}
                >
                  <Download />
                </Button>
              </span>
              {latest.remarks && revisions.length > 1 && (
                <p className="w-full text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    R{revisions.length - 1} change:
                  </span>{" "}
                  {latest.remarks}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Items" value={items.length} />
            <Stat label="Makes" value={stats.makes.length} />
            <Stat label="Categories" value={stats.categories} />
            <Stat
              label="Available"
              value={items.length ? `${Math.round((stats.available / items.length) * 100)}%` : "—"}
              tone="good"
            />
          </div>

          {stats.makes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {stats.makes.slice(0, 10).map((make) => (
                <span
                  key={make.label}
                  className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {make.label} <span className="font-bold">{make.count}</span>
                </span>
              ))}
              {stats.makes.length > 10 && (
                <span className="text-xs text-muted-foreground">
                  +{stats.makes.length - 10} more
                </span>
              )}
            </div>
          )}

          <Link
            to="/inward-orders/$id/stages/$stage"
            params={{ id: orderId, stage: "procurement" }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Open the cards in Material Procurement <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 grid place-items-center bg-primary/10 backdrop-blur-[2px]"
          >
            <div className="neo-surface flex items-center gap-3 rounded-2xl px-6 py-4 text-base font-semibold text-primary">
              <UploadCloud className="h-6 w-6" /> Drop the BOM Excel
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BomImportDialog
        key={parsed ? `${parsed.file.name}-${parsed.file.lastModified}` : "closed"}
        data={parsed}
        current={items}
        isRevision={revisions.length > 0}
        nextRevision={revisions.length}
        author={author}
        employees={employees}
        onAuthor={onAuthor}
        onClose={() => setParsed(null)}
        onConfirm={async (values) => {
          if (!parsed) return;
          const ok = await apply({ file: parsed.file, ...values });
          if (ok) setParsed(null);
        }}
      />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "good" }) {
  return (
    <div className="neo-inset rounded-2xl px-3 py-2.5">
      <div
        className={`text-xl font-bold leading-none ${tone === "good" ? "text-emerald-600" : "text-foreground"}`}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

const NONE = "__none";

function BomImportDialog({
  data,
  current,
  isRevision,
  nextRevision,
  author,
  employees,
  onAuthor,
  onClose,
  onConfirm,
}: {
  data: { file: File; tables: Table[] } | null;
  current: ProcurementItem[];
  isRevision: boolean;
  nextRevision: number;
  author: string;
  employees: string[];
  onAuthor: (name: string) => void;
  onClose: () => void;
  onConfirm: (values: {
    items: ImportedItem[];
    removeMissing: boolean;
    remarks: string;
  }) => Promise<void>;
}) {
  const [tables, setTables] = useState<Table[]>(data?.tables ?? []);
  const [activeSheet, setActiveSheet] = useState(
    data?.tables.find((table) => table.include)?.sheet ?? data?.tables[0]?.sheet ?? "",
  );
  const [showColumns, setShowColumns] = useState(
    Boolean(data?.tables.some((table) => table.guessed)),
  );
  const [removeMissing, setRemoveMissing] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [tab, setTab] = useState<"items" | "changes">(current.length ? "changes" : "items");
  const [saving, setSaving] = useState(false);

  const items = useMemo(
    () => tables.filter((table) => table.include).flatMap((table) => extractItems(table).items),
    [tables],
  );
  const plan = useMemo(() => planBomUpdate(current, items), [current, items]);
  const missingQty = items.filter((item) => item.qtyMissing).length;
  const makes = new Set(items.map((item) => item.make.toLowerCase()).filter(Boolean)).size;
  const active = tables.find((table) => table.sheet === activeSheet) ?? tables[0];
  const removedWithProgress = plan.removed.filter(hasProgress).length;
  const valid = items.length > 0 && Boolean(author) && (!isRevision || Boolean(remarks.trim()));

  function updateTable(sheet: string, patch: (table: Table) => Table) {
    setTables((list) => list.map((table) => (table.sheet === sheet ? patch(table) : table)));
  }

  function setColumn(field: BomField, value: string) {
    if (!active) return;
    updateTable(active.sheet, (table) => {
      const columns = { ...table.columns };
      const index = value === NONE ? undefined : Number(value);
      // One column feeds one field.
      for (const key of Object.keys(columns) as BomField[])
        if (index !== undefined && columns[key] === index) delete columns[key];
      if (index === undefined) delete columns[field];
      else columns[field] = index;
      const next = { ...table, columns };
      return { ...next, itemCount: extractItems(next).items.length };
    });
  }

  async function confirm() {
    if (!valid) return;
    setSaving(true);
    await onConfirm({ items, removeMissing, remarks: remarks.trim() });
    setSaving(false);
  }

  const columnLabel = (table: Table, index: number) => {
    const header = table.headers[index];
    const letter = columnLetter(index);
    return header ? `${letter} · ${header}` : `Column ${letter}`;
  };
  const width = active
    ? Math.max(
        active.headers.length,
        ...active.rows.slice(active.headerRow + 1, active.headerRow + 30).map((row) => row.length),
      )
    : 0;

  return (
    <Dialog open={Boolean(data)} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="flex max-h-[92vh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            {isRevision ? `BOM revision R${nextRevision}` : "Upload BOM"}
          </DialogTitle>
          <DialogDescription className="truncate">
            {data?.file.name} · {items.length} items · {makes} makes
            {tables.length > 1 ? ` · ${tables.filter((t) => t.include).length} sheets` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {tables.length > 1 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-primary">Sheets with items</div>
              <div className="flex flex-wrap gap-2">
                {tables.map((table) => (
                  <label
                    key={table.sheet}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5 text-sm ${table.include ? "neo-pressed" : "neo-pop opacity-70"}`}
                  >
                    <Checkbox
                      checked={table.include}
                      onCheckedChange={(checked) =>
                        updateTable(table.sheet, (t) => ({ ...t, include: checked === true }))
                      }
                    />
                    <span className="font-medium">{table.sheet}</span>
                    <span className="text-xs text-muted-foreground">{table.itemCount}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="neo-inset rounded-2xl p-3">
            <button
              type="button"
              onClick={() => setShowColumns((value) => !value)}
              className="flex w-full items-center gap-2 text-left text-sm"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold">Columns found automatically</span>
              <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                {active &&
                  BOM_FIELDS.filter((field) => active.columns[field.key] !== undefined)
                    .map((field) => field.label.split(" ")[0])
                    .join(", ")}
              </span>
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <SlidersHorizontal className="h-3.5 w-3.5" /> {showColumns ? "Hide" : "Adjust"}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {showColumns && active && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="overflow-hidden"
                >
                  {tables.length > 1 && (
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Sheet</span>
                      <Select value={active.sheet} onValueChange={setActiveSheet}>
                        <SelectTrigger className="h-8 w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tables.map((table) => (
                            <SelectItem key={table.sheet} value={table.sheet}>
                              {table.sheet}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {active.guessed && (
                    <p className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      No header row was recognised, so the columns were guessed from the data.
                      Please check them.
                    </p>
                  )}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {BOM_FIELDS.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground">
                          {field.label}
                          {field.key === "itemName" && <span className="text-destructive"> *</span>}
                        </Label>
                        <Select
                          value={
                            active.columns[field.key] === undefined
                              ? NONE
                              : String(active.columns[field.key])
                          }
                          onValueChange={(value) => setColumn(field.key, value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>Not in this file</SelectItem>
                            {Array.from({ length: width }, (_, index) => (
                              <SelectItem key={index} value={String(index)}>
                                {columnLabel(active, index)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Header on row {active.headerRow + 1}. Section headings become the category, and
                    totals, notes and repeated headers are skipped.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {missingQty > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {missingQty} row{missingQty === 1 ? " has" : "s have"} no quantity and will be set to
              1. Check the Quantity column above, or change it on the card.
            </div>
          )}

          {current.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ChangeTile
                tone="text-emerald-600"
                icon={Plus}
                value={plan.added.length}
                label="New items"
              />
              <ChangeTile
                tone="text-sky-600"
                icon={PencilLine}
                value={plan.changed.length}
                label="Changed"
              />
              <ChangeTile tone="text-muted-foreground" value={plan.unchanged} label="Unchanged" />
              <ChangeTile
                tone="text-rose-600"
                icon={Minus}
                value={plan.removed.length}
                label="Not in new BOM"
              />
            </div>
          )}

          {current.length > 0 && (
            <div className="neo-inset grid w-full grid-cols-2 gap-1 rounded-xl p-1 sm:w-80">
              {(["changes", "items"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === value ? "neo-pop text-primary" : "text-muted-foreground"}`}
                >
                  {value === "changes" ? "What changes" : `All ${items.length} items`}
                </button>
              ))}
            </div>
          )}

          {tab === "changes" && current.length > 0 ? (
            <div className="neo-inset max-h-[36vh] space-y-1 overflow-y-auto rounded-xl p-2 text-sm">
              {plan.added.map((item, index) => (
                <ChangeRow
                  key={`a${index}`}
                  kind="add"
                  title={item.itemName}
                  detail={`${formatQty(item.qtyRequired)} ${item.unit}${item.make ? ` · ${item.make}` : ""}`}
                />
              ))}
              {plan.changed.map((change) => (
                <ChangeRow
                  key={change.item.id}
                  kind="change"
                  title={change.item.itemName}
                  detail={change.changes.join(", ")}
                />
              ))}
              {plan.removed.map((item) => (
                <ChangeRow
                  key={item.id}
                  kind="remove"
                  title={item.itemName}
                  detail={hasProgress(item) ? "has stock / enquiry recorded" : ""}
                />
              ))}
              {!plan.added.length && !plan.changed.length && !plan.removed.length && (
                <div className="px-2 py-6 text-center text-muted-foreground">
                  The material list already matches this BOM.
                </div>
              )}
            </div>
          ) : (
            <div className="neo-inset max-h-[36vh] overflow-auto rounded-xl">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--neo-bg)] text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Make / Model</th>
                    <th className="hidden px-3 py-2 md:table-cell">Specification</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-t border-border/40 align-top">
                      <td className="px-3 py-2">
                        <div className="font-medium">{item.itemName}</div>
                        {item.category && (
                          <div className="text-xs text-muted-foreground">{item.category}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {[item.make, item.model].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="hidden max-w-[260px] px-3 py-2 text-xs text-muted-foreground md:table-cell">
                        <span className="line-clamp-2">{item.specification || "—"}</span>
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-2 text-right font-semibold ${item.qtyMissing ? "text-amber-600" : ""}`}
                      >
                        {formatQty(item.qtyRequired)} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {plan.removed.length > 0 && current.length > 0 && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={removeMissing}
                onCheckedChange={(checked) => setRemoveMissing(checked === true)}
                className="mt-0.5"
              />
              <span>
                Remove the {plan.removed.length} item{plan.removed.length === 1 ? "" : "s"} no
                longer in the BOM
                {removedWithProgress > 0 && (
                  <span className="block text-xs text-amber-700">
                    {removedWithProgress} of them already have stock checks or enquiries recorded.
                  </span>
                )}
              </span>
            </label>
          )}

          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            {isRevision ? (
              <div className="space-y-1.5">
                <Label htmlFor="bom-remarks" className="text-xs font-semibold text-primary">
                  What changed in this revision? <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="bom-remarks"
                  rows={2}
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder="e.g. Relay make changed to Omron, 4 meters added after client review"
                />
              </div>
            ) : (
              <div />
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Uploaded by</Label>
              <Select value={author || undefined} onValueChange={onAuthor}>
                <SelectTrigger className={author ? "" : "ring-2 ring-amber-300"}>
                  <SelectValue placeholder="Select your name" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void confirm()} disabled={!valid || saving}>
            {saving ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
            {current.length
              ? `Apply to ${current.length + plan.added.length - (removeMissing ? plan.removed.length : 0)} cards`
              : `Create ${items.length} cards`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangeTile({
  tone,
  icon: Icon,
  value,
  label,
}: {
  tone: string;
  icon?: typeof Plus;
  value: number;
  label: string;
}) {
  return (
    <div className="neo-pop rounded-xl px-3 py-2">
      <div className={`flex items-center gap-1 text-lg font-bold ${tone}`}>
        {Icon && <Icon className="h-4 w-4" />}
        {value}
      </div>
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
    </div>
  );
}

function ChangeRow({
  kind,
  title,
  detail,
}: {
  kind: "add" | "change" | "remove";
  title: string;
  detail: string;
}) {
  const tone =
    kind === "add"
      ? "bg-emerald-100 text-emerald-700"
      : kind === "change"
        ? "bg-sky-100 text-sky-700"
        : "bg-rose-100 text-rose-700";
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
      <span
        className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-[10px] font-bold uppercase ${tone}`}
      >
        {kind === "add" ? "New" : kind === "change" ? "Changed" : "Removed"}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
      {detail && <span className="truncate text-xs text-muted-foreground">{detail}</span>}
    </div>
  );
}

function columnLetter(index: number) {
  let label = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}
