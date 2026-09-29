import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Boxes,
  Check,
  FileSpreadsheet,
  FlaskConical,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/db";
import { formatQty, readSpreadsheet, rowsToItems, type InventoryRow } from "@/lib/procurement";
import { EASE, timeAgo } from "@/components/stages/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory (beta) — Electrosoft Proposal Engine" },
      {
        name: "description",
        content: "Shared stock list used to suggest stock numbers during material procurement.",
      },
      { property: "og:title", content: "Inventory (beta) — Electrosoft Proposal Engine" },
      {
        property: "og:description",
        content: "Shared stock list used to suggest stock numbers during material procurement.",
      },
    ],
  }),
  component: InventoryPage,
});

type Draft = {
  item_name: string;
  category: string;
  make: string;
  model: string;
  unit: string;
  qty_in_stock: string;
  location: string;
};
const EMPTY: Draft = {
  item_name: "",
  category: "",
  make: "",
  model: "",
  unit: "Nos",
  qty_in_stock: "0",
  location: "",
};

function InventoryPage() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void supabase
      .from("inventory_items")
      .select("*")
      .order("item_name")
      .then(({ data, error }) => {
        if (error) toast.error("Could not load the inventory list");
        setRows(data ?? []);
        setLoading(false);
      });
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.item_name, row.category, row.make, row.model, row.location]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [rows, query]);

  async function create(draft: Draft) {
    const { data, error } = await supabase
      .from("inventory_items")
      .insert({
        item_name: draft.item_name.trim(),
        category: draft.category.trim(),
        make: draft.make.trim(),
        model: draft.model.trim(),
        unit: draft.unit.trim() || "Nos",
        qty_in_stock: Math.max(0, Number(draft.qty_in_stock) || 0),
        location: draft.location.trim(),
      })
      .select("*")
      .single();
    if (error || !data) {
      toast.error("Could not add the item");
      return false;
    }
    setRows((current) => [...current, data].sort((a, b) => a.item_name.localeCompare(b.item_name)));
    return true;
  }

  async function save(row: InventoryRow, patch: Partial<InventoryRow>) {
    const { data, error } = await supabase
      .from("inventory_items")
      .update(patch)
      .eq("id", row.id)
      .select("*")
      .single();
    if (error || !data) {
      toast.error("Could not save the change");
      return;
    }
    setRows((current) => current.map((entry) => (entry.id === data.id ? data : entry)));
  }

  async function remove(row: InventoryRow) {
    const { error } = await supabase.from("inventory_items").delete().eq("id", row.id);
    if (error) {
      toast.error("Could not delete the item");
      return;
    }
    setRows((current) => current.filter((entry) => entry.id !== row.id));
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    setImporting(true);
    try {
      const result = rowsToItems(await readSpreadsheet(file), true);
      if (result.error || !result.items.length) {
        toast.error(result.error ?? "No items found in this file");
        return;
      }
      const { data, error } = await supabase
        .from("inventory_items")
        .insert(
          result.items.map((item) => ({
            item_name: item.itemName,
            category: item.category,
            make: item.make,
            model: item.model,
            unit: item.unit,
            qty_in_stock: item.qtyRequired,
          })),
        )
        .select("*");
      if (error || !data) {
        toast.error("Could not import the file");
        return;
      }
      setRows((current) =>
        [...current, ...data].sort((a, b) => a.item_name.localeCompare(b.item_name)),
      );
      toast.success(`${data.length} items imported`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read this file");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.csv"
        className="hidden"
        onChange={(event) => void importFile(event.target.files?.[0])}
      />
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="mb-6 flex flex-wrap items-center gap-4"
      >
        <span className="neo-pop grid h-11 w-11 place-items-center rounded-xl text-primary">
          <Boxes className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
            Inventory
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-violet-700">
              Beta
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} item{rows.length === 1 ? "" : "s"} in the shared stock list
          </p>
        </div>
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
          {importing ? <LoaderCircle className="animate-spin" /> : <FileSpreadsheet />} Import Excel
        </Button>
        <Button onClick={() => setAdding(true)}>
          <Plus /> Add item
        </Button>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.05 }}
        className="mb-6 flex items-start gap-3 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-900"
      >
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          This list is a backup while inventory tracking is being set up. On each order's Material
          Procurement page, the store team's own stock check is what counts. "Fill from inventory"
          only suggests numbers from here, and stock is not reduced automatically yet.
        </div>
      </motion.div>

      <div className="neo-surface rounded-3xl p-4 sm:p-6">
        <div className="relative mb-4 sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search inventory…"
            className="pl-9"
            aria-label="Search inventory"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-[26%] px-2 py-2">Item</th>
                <th className="px-2 py-2">Category</th>
                <th className="px-2 py-2">Make</th>
                <th className="px-2 py-2">Model</th>
                <th className="px-2 py-2">Location</th>
                <th className="px-2 py-2 text-right">In stock</th>
                <th className="px-2 py-2">Unit</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {adding && (
                  <NewRow
                    key="new"
                    onCancel={() => setAdding(false)}
                    onSave={async (draft) => {
                      if (await create(draft)) setAdding(false);
                    }}
                  />
                )}
                {visible.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ duration: 0.3, delay: Math.min(index, 15) * 0.02 }}
                    className="group border-t border-border/40 transition-colors hover:bg-white/40"
                  >
                    <EditableCell
                      value={row.item_name}
                      onSave={(v) => v && save(row, { item_name: v })}
                      bold
                    />
                    <EditableCell value={row.category} onSave={(v) => save(row, { category: v })} />
                    <EditableCell value={row.make} onSave={(v) => save(row, { make: v })} />
                    <EditableCell value={row.model} onSave={(v) => save(row, { model: v })} />
                    <EditableCell value={row.location} onSave={(v) => save(row, { location: v })} />
                    <EditableCell
                      value={formatQty(Number(row.qty_in_stock) || 0)}
                      numeric
                      onSave={(v) => save(row, { qty_in_stock: Math.max(0, Number(v) || 0) })}
                      title={`Updated ${timeAgo(row.updated_at)}`}
                    />
                    <EditableCell
                      value={row.unit}
                      onSave={(v) => save(row, { unit: v || "Nos" })}
                    />
                    <td className="px-2 py-1 text-right">
                      <button
                        type="button"
                        aria-label={`Delete ${row.item_name}`}
                        className="rounded-full p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                        onClick={() => void remove(row)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {loading ? (
            <div className="grid place-items-center py-12">
              <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            !visible.length &&
            !adding && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {rows.length
                  ? "No items match your search."
                  : "No stock recorded yet. Add items or import an Excel sheet with Item and Stock columns."}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function EditableCell({
  value,
  onSave,
  numeric,
  bold,
  title,
}: {
  value: string;
  onSave: (value: string) => unknown;
  numeric?: boolean;
  bold?: boolean;
  title?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const next = draft.trim();
    if (next !== value) void onSave(next);
  };
  return (
    <td className="px-1 py-1" title={title}>
      <input
        data-no-neo
        value={draft}
        type={numeric ? "number" : "text"}
        min={numeric ? 0 : undefined}
        step={numeric ? "any" : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") setDraft(value);
        }}
        className={`w-full rounded-lg bg-transparent px-2 py-1.5 outline-none transition-shadow focus:bg-white/70 focus:ring-2 focus:ring-primary/30 ${numeric ? "text-right font-semibold text-primary" : ""} ${bold ? "font-medium text-foreground" : "text-foreground/80"}`}
      />
    </td>
  );
}

function NewRow({
  onSave,
  onCancel,
}: {
  onSave: (draft: Draft) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const cell = (key: keyof Draft, placeholder: string, numeric = false) => (
    <td className="px-1 py-1">
      <Input
        value={draft[key]}
        type={numeric ? "number" : "text"}
        placeholder={placeholder}
        onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
        className={`h-9 ${numeric ? "text-right" : ""}`}
        autoFocus={key === "item_name"}
      />
    </td>
  );
  async function submit() {
    if (!draft.item_name.trim()) {
      toast.error("Item name is required");
      return;
    }
    setSaving(true);
    await onSave(draft);
    setSaving(false);
  }
  return (
    <motion.tr
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="bg-primary/5"
      onKeyDown={(event) => {
        if (event.key === "Enter") void submit();
        if (event.key === "Escape") onCancel();
      }}
    >
      {cell("item_name", "Item name")}
      {cell("category", "Category")}
      {cell("make", "Make")}
      {cell("model", "Model")}
      {cell("location", "Rack / bin")}
      {cell("qty_in_stock", "0", true)}
      {cell("unit", "Nos")}
      <td className="px-1 py-1">
        <div className="flex gap-1">
          <Button
            size="icon"
            className="h-8 w-8"
            onClick={() => void submit()}
            disabled={saving}
            aria-label="Save"
          >
            {saving ? <LoaderCircle className="animate-spin" /> : <Check />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onCancel}
            aria-label="Cancel"
          >
            <X />
          </Button>
        </div>
      </td>
    </motion.tr>
  );
}
