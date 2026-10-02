import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  FileSpreadsheet,
  Filter as FilterIcon,
  History,
  LayoutGrid,
  LoaderCircle,
  PackageCheck,
  PackageOpen,
  Plus,
  Rows3,
  Search,
  Send,
  Sparkles,
  Trash2,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/db";
import type { Database } from "@/integrations/supabase/types";
import {
  daysFromToday,
  findInventoryMatch,
  formatDay,
  formatQty,
  itemState,
  mapProcurement,
  qtyAvailable,
  qtyToProcure,
  sortItems,
  STATE_META,
  STATE_ORDER,
  todayIso,
  type ImportedItem,
  type InventoryRow,
  type ItemState,
  type ProcurementItem,
  type ProcurementRow,
} from "@/lib/procurement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { StageBodyProps } from "./DesignStage";
import { EASE, initials, timeAgo } from "./shared";

type ItemPatch = Database["public"]["Tables"]["procurement_items"]["Update"];
type ActivityRow = Database["public"]["Tables"]["stage_updates"]["Row"];
type Filter = "all" | ItemState;
type View = "cards" | "list";
type GroupBy = "status" | "make" | "category";
const VIEW_KEY = "procurement_view";
const NO_VALUE = "__none";

// Makes and categories are grouped ignoring case and spacing ("SIEMENS" = "Siemens ").
function facetKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ") || NO_VALUE;
}

type FacetOption = { value: string; label: string; count: number };
function facetOptions(
  items: ProcurementItem[],
  field: "make" | "category",
  emptyLabel: string,
): FacetOption[] {
  const map = new Map<string, FacetOption>();
  for (const item of items) {
    const value = facetKey(item[field]);
    const current = map.get(value);
    map.set(value, {
      value,
      label: current?.label ?? (value === NO_VALUE ? emptyLabel : item[field].trim()),
      count: (current?.count ?? 0) + 1,
    });
  }
  return [...map.values()].sort((a, b) =>
    a.value === NO_VALUE
      ? 1
      : b.value === NO_VALUE
        ? -1
        : b.count - a.count || a.label.localeCompare(b.label),
  );
}

function without(set: Set<string>, value: string) {
  const next = new Set(set);
  next.delete(value);
  return next;
}

const GROUPS: { key: string; title: string; hint: string; states: ItemState[] }[] = [
  {
    key: "today",
    title: "Arriving today",
    hint: "Check and mark as received",
    states: ["today"],
  },
  {
    key: "attention",
    title: "Needs attention",
    hint: "Late deliveries, shortages with no enquiry, and stock still to check",
    states: ["overdue", "shortage", "unchecked"],
  },
  {
    key: "incoming",
    title: "On the way",
    hint: "Enquired or ordered, waiting for delivery",
    states: ["enquired", "incoming"],
  },
  {
    key: "complete",
    title: "Available",
    hint: "Enough in stock or received",
    states: ["complete"],
  },
];

export function ProcurementStage({
  orderId,
  stageName,
  stage,
  setStageStatus,
  author,
  employees,
  onAuthor,
}: StageBodyProps) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ProcurementItem | "new" | null>(null);
  const [inventoryPlan, setInventoryPlan] = useState<
    { item: ProcurementItem; match: InventoryRow }[] | null
  >(null);
  const [makes, setMakes] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [viewPref, setViewPref] = useState<View | null>(null);
  const today = todayIso();

  const upsertLocal = useCallback((row: ProcurementRow) => {
    const next = mapProcurement(row);
    setItems((current) =>
      current.some((item) => item.id === next.id)
        ? current.map((item) => (item.id === next.id ? next : item))
        : [...current, next],
    );
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      const [itemResult, activityResult] = await Promise.all([
        supabase
          .from("procurement_items")
          .select("*")
          .eq("inward_order_id", orderId)
          .order("display_order"),
        supabase
          .from("stage_updates")
          .select("*")
          .eq("inward_order_id", orderId)
          .eq("stage_name", stageName)
          .order("created_at", { ascending: false })
          .limit(40),
      ]);
      if (!active) return;
      if (itemResult.error) toast.error("Could not load the material list");
      setItems((itemResult.data ?? []).map(mapProcurement));
      setActivity(activityResult.data ?? []);
      setLoading(false);
    }
    void load();

    // Live: the store and purchase teams see each other's changes as they happen.
    const channel = supabase
      .channel(`procurement-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "procurement_items",
          filter: `inward_order_id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const removed = (payload.old as Partial<ProcurementRow>).id;
            if (removed) setItems((current) => current.filter((item) => item.id !== removed));
          } else upsertLocal(payload.new as ProcurementRow);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stage_updates",
          filter: `inward_order_id=eq.${orderId}`,
        },
        (payload) => {
          const row = payload.new as ActivityRow;
          if (row.stage_name !== stageName) return;
          setActivity((current) =>
            current.some((entry) => entry.id === row.id) ? current : [row, ...current],
          );
        },
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [orderId, stageName, upsertLocal]);

  const logActivity = useCallback(
    async (remarks: string) => {
      const { data } = await supabase
        .from("stage_updates")
        .insert({
          inward_order_id: orderId,
          stage_name: stageName,
          kind: "update",
          author,
          remarks,
        })
        .select("*")
        .single();
      if (data)
        setActivity((current) =>
          current.some((entry) => entry.id === data.id) ? current : [data, ...current],
        );
    },
    [orderId, stageName, author],
  );

  const startStage = useCallback(async () => {
    if (stage?.status === "not started") await setStageStatus("in progress");
  }, [stage?.status, setStageStatus]);

  async function updateItem(item: ProcurementItem, patch: ItemPatch, log?: string) {
    const { data, error } = await supabase
      .from("procurement_items")
      .update(patch)
      .eq("id", item.id)
      .select("*")
      .single();
    if (error || !data) {
      toast.error(`Could not update ${item.itemName}`);
      return false;
    }
    upsertLocal(data);
    if (log) void logActivity(log);
    void startStage();
    return true;
  }

  async function addItems(rows: ImportedItem[], replace: boolean, source: string) {
    if (replace && items.length) {
      const { error } = await supabase
        .from("procurement_items")
        .delete()
        .eq("inward_order_id", orderId);
      if (error) {
        toast.error("Could not clear the current list");
        return false;
      }
      setItems([]);
    }
    const start = replace ? 0 : items.reduce((max, item) => Math.max(max, item.displayOrder), 0);
    const { data, error } = await supabase
      .from("procurement_items")
      .insert(
        rows.map((row, index) => ({
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
      )
      .select("*");
    if (error || !data) {
      toast.error("Could not save the items");
      return false;
    }
    data.forEach(upsertLocal);
    void logActivity(
      `${replace ? "Replaced the material list with" : "Added"} ${data.length} item${data.length === 1 ? "" : "s"}${source ? ` from ${source}` : ""}`,
    );
    void startStage();
    toast.success(`${data.length} item${data.length === 1 ? "" : "s"} added`);
    return true;
  }

  async function deleteItem(item: ProcurementItem) {
    const { error } = await supabase.from("procurement_items").delete().eq("id", item.id);
    if (error) {
      toast.error(`Could not delete ${item.itemName}`);
      return;
    }
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    void logActivity(`Removed ${item.itemName} from the list`);
    toast.success("Item removed");
  }

  async function planInventoryFill() {
    const { data, error } = await supabase.from("inventory_items").select("*");
    if (error) {
      toast.error("Could not load the inventory list");
      return;
    }
    if (!data?.length) {
      toast.info("The inventory list is empty. Add stock on the Inventory (beta) page first.");
      return;
    }
    const plan = items
      .filter((item) => item.qtyInStock === null)
      .map((item) => ({ item, match: findInventoryMatch(item, data) }))
      .filter((entry): entry is { item: ProcurementItem; match: InventoryRow } =>
        Boolean(entry.match),
      );
    if (!plan.length) {
      toast.info("No unchecked items match the inventory list.");
      return;
    }
    setInventoryPlan(plan);
  }

  async function applyInventoryFill() {
    if (!inventoryPlan) return;
    const plan = inventoryPlan;
    setInventoryPlan(null);
    const checkedBy = `${author || "Inventory"} (from inventory)`;
    let done = 0;
    for (const { item, match } of plan) {
      const { data } = await supabase
        .from("procurement_items")
        .update({
          qty_in_stock: Number(match.qty_in_stock) || 0,
          stock_checked_by: checkedBy,
          stock_checked_at: new Date().toISOString(),
        })
        .eq("id", item.id)
        .select("*")
        .single();
      if (data) {
        upsertLocal(data);
        done++;
      }
    }
    void logActivity(
      `Filled stock for ${done} item${done === 1 ? "" : "s"} from the inventory list (beta)`,
    );
    void startStage();
    toast.success(`Stock filled for ${done} item${done === 1 ? "" : "s"}. Please verify.`);
  }

  const counts = useMemo(() => {
    const result = Object.fromEntries(STATE_ORDER.map((state) => [state, 0])) as Record<
      ItemState,
      number
    >;
    for (const item of items) result[itemState(item, today)]++;
    return result;
  }, [items, today]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortItems(items, today).filter((item) => {
      if (filter !== "all" && itemState(item, today) !== filter) return false;
      if (makes.size && !makes.has(facetKey(item.make))) return false;
      if (categories.size && !categories.has(facetKey(item.category))) return false;
      if (!needle) return true;
      return [
        item.itemName,
        item.category,
        item.make,
        item.model,
        item.specification,
        item.supplier,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [items, filter, query, today, makes, categories]);

  const makeOptions = useMemo(() => facetOptions(items, "make", "No make"), [items]);
  const categoryOptions = useMemo(() => facetOptions(items, "category", "No category"), [items]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_KEY);
      if (stored === "cards" || stored === "list") setViewPref(stored);
    } catch {
      /* storage unavailable */
    }
  }, []);
  // Long lists read better as rows; a choice made with the toggle is remembered.
  const view: View = viewPref ?? (items.length > 24 ? "list" : "cards");
  function chooseView(next: View) {
    setViewPref(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }

  const groups = useMemo(() => {
    if (groupBy === "status")
      return GROUPS.map((group) => ({
        key: group.key,
        title: group.title,
        hint: group.hint,
        tone: group.key,
        items: visible.filter((item) => group.states.includes(itemState(item, today))),
      }));
    const field = groupBy === "make" ? "make" : "category";
    return facetOptions(visible, field, groupBy === "make" ? "No make" : "No category").map(
      (option) => {
        const groupItems = visible.filter((item) => facetKey(item[field]) === option.value);
        const done = groupItems.filter((item) => itemState(item, today) === "complete").length;
        return {
          key: option.value,
          title: option.label,
          hint: `${done} of ${groupItems.length} available`,
          tone: "",
          items: groupItems,
        };
      },
    );
  }, [groupBy, visible, today]);
  const filtersActive = makes.size + categories.size > 0 || filter !== "all" || Boolean(query);

  const readyPercent = items.length ? Math.round((counts.complete / items.length) * 100) : 0;
  const allReady = items.length > 0 && counts.complete === items.length;

  return (
    <div className="mx-auto w-full max-w-[80vw] space-y-6 max-lg:max-w-full">
      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
        className="neo-surface overflow-hidden rounded-3xl p-5 sm:p-7"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Materials ready
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <motion.span
                key={readyPercent}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold text-foreground"
              >
                {readyPercent}%
              </motion.span>
              <span className="text-sm text-muted-foreground">
                {counts.complete} of {items.length} items available
              </span>
            </div>
          </div>
          <WorkingAs author={author} employees={employees} onAuthor={onAuthor} />
        </div>

        <div className="neo-inset mt-4 h-3 overflow-hidden rounded-full">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-primary to-chart-2"
            initial={{ width: 0 }}
            animate={{ width: `${readyPercent}%` }}
            transition={{ duration: 1, ease: EASE }}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
          {STATE_ORDER.map((state, index) => (
            <StatTile
              key={state}
              state={state}
              count={counts[state]}
              active={filter === state}
              delay={0.1 + index * 0.04}
              onClick={() => setFilter((current) => (current === state ? "all" : state))}
            />
          ))}
        </div>
      </motion.section>

      <AnimatePresence>
        {allReady && stage?.status !== "done" && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white shadow-xl shadow-emerald-500/25">
              <motion.span
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 14 }}
                className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20"
              >
                <PackageCheck className="h-6 w-6" />
              </motion.span>
              <div className="flex-1">
                <div className="text-lg font-bold">All materials are available</div>
                <div className="text-sm text-white/85">
                  Every item is in stock or received. Mark this stage as done to move the order
                  forward.
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  void setStageStatus("done").then((ok) => {
                    if (ok) {
                      void logActivity("Marked Material Procurement as done");
                      toast.success("Material Procurement marked done");
                    }
                  })
                }
              >
                <Check /> Mark stage done
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.16 }}
        className="flex flex-wrap items-center gap-3"
      >
        <Button asChild variant="outline">
          <Link to="/inward-orders/$id/stages/$stage" params={{ id: orderId, stage: "design" }}>
            <FileSpreadsheet /> BOM in Design
          </Link>
        </Button>
        <Button variant="outline" onClick={() => setEditing("new")}>
          <Plus /> Add item
        </Button>
        <Button
          variant="outline"
          onClick={() => void planInventoryFill()}
          disabled={!items.some((item) => item.qtyInStock === null)}
          title="Suggest stock numbers from the inventory list"
        >
          <Boxes /> Fill from inventory
          <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-700">
            Beta
          </span>
        </Button>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search item, make, model, supplier…"
            className="pl-9"
            aria-label="Search items"
          />
        </div>
      </motion.div>

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <FilterMenu label="Make" options={makeOptions} selected={makes} onChange={setMakes} />
          <FilterMenu
            label="Category"
            options={categoryOptions}
            selected={categories}
            onChange={setCategories}
          />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Group by
            </span>
            <Segmented
              value={groupBy}
              onChange={setGroupBy}
              options={[
                { value: "status", label: "Status" },
                { value: "make", label: "Make" },
                { value: "category", label: "Category" },
              ]}
            />
            <Segmented
              value={view}
              onChange={chooseView}
              options={[
                { value: "cards", label: "Cards", icon: LayoutGrid },
                { value: "list", label: "List", icon: Rows3 },
              ]}
            />
          </div>
        </div>
      )}

      {filtersActive && items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            Showing {visible.length} of {items.length}
          </span>
          {filter !== "all" && (
            <FilterChip
              className={STATE_META[filter].chip}
              label={STATE_META[filter].label}
              onRemove={() => setFilter("all")}
            />
          )}
          {[...makes].map((value) => (
            <FilterChip
              key={`m-${value}`}
              label={makeOptions.find((option) => option.value === value)?.label ?? value}
              onRemove={() => setMakes((current) => without(current, value))}
            />
          ))}
          {[...categories].map((value) => (
            <FilterChip
              key={`c-${value}`}
              label={categoryOptions.find((option) => option.value === value)?.label ?? value}
              onRemove={() => setCategories((current) => without(current, value))}
            />
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            onClick={() => {
              setFilter("all");
              setMakes(new Set());
              setCategories(new Set());
              setQuery("");
            }}
          >
            <X className="h-3 w-3" /> Clear all
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="h-48 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyList orderId={orderId} onAdd={() => setEditing("new")} />
      ) : visible.length === 0 ? (
        <div className="neo-inset rounded-3xl px-6 py-14 text-center text-sm text-muted-foreground">
          No items match this view.
        </div>
      ) : filter !== "all" && groupBy === "status" ? (
        <ItemCollection
          view={view}
          items={visible}
          today={today}
          onOpen={setEditing}
          onUpdate={updateItem}
          author={author}
        />
      ) : (
        groups.map((group) =>
          group.items.length ? (
            <ItemGroup
              key={`${groupBy}-${group.key}`}
              title={group.title}
              hint={group.hint}
              count={group.items.length}
              tone={group.tone}
              defaultOpen={groupBy === "status" || groups.length <= 6}
            >
              <ItemCollection
                view={view}
                items={group.items}
                today={today}
                onOpen={setEditing}
                onUpdate={updateItem}
                author={author}
                spotlight={group.key === "today" && groupBy === "status"}
              />
            </ItemGroup>
          ) : null,
        )
      )}

      <ActivityFeed activity={activity} />

      <ItemSheet
        key={editing === "new" ? "new" : editing?.id}
        item={editing}
        author={author}
        onClose={() => setEditing(null)}
        onCreate={async (row) => {
          const ok = await addItems([row], false, "");
          if (ok) setEditing(null);
        }}
        onSave={async (item, patch, log) => {
          const ok = await updateItem(item, patch, log);
          if (ok) setEditing(null);
        }}
        onDelete={async (item) => {
          setEditing(null);
          await deleteItem(item);
        }}
      />

      <AlertDialog
        open={Boolean(inventoryPlan)}
        onOpenChange={(open) => {
          if (!open) setInventoryPlan(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fill stock from inventory (beta)?</AlertDialogTitle>
            <AlertDialogDescription>
              {inventoryPlan?.length} unchecked item{inventoryPlan?.length === 1 ? "" : "s"} match
              the inventory list. Their stock numbers will be filled in, and the store team should
              still verify them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="neo-inset max-h-56 space-y-1 overflow-y-auto rounded-xl p-3 text-sm">
            {inventoryPlan?.map(({ item, match }) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="truncate">{item.itemName}</span>
                <span className="shrink-0 font-semibold text-primary">
                  {formatQty(Number(match.qty_in_stock) || 0)} {item.unit}
                </span>
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void applyInventoryFill()}>
              Fill stock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterMenu({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: FacetOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [search, setSearch] = useState("");
  const needle = search.trim().toLowerCase();
  const shown = options.filter((option) => option.label.toLowerCase().includes(needle));
  if (options.length < 2 && !selected.size) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={selected.size ? "border-primary/50 text-primary" : ""}
        >
          <FilterIcon className="h-3.5 w-3.5" /> {label}
          {selected.size > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {selected.size}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        {options.length > 6 && (
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="h-8 pl-8 text-sm"
              aria-label={`Search ${label.toLowerCase()}`}
            />
          </div>
        )}
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {shown.map((option) => {
            const checked = selected.has(option.value);
            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() =>
                    onChange(
                      checked
                        ? without(selected, option.value)
                        : new Set(selected).add(option.value),
                    )
                  }
                />
                <span
                  className={`min-w-0 flex-1 truncate ${option.value === NO_VALUE ? "italic text-muted-foreground" : ""}`}
                >
                  {option.label}
                </span>
                <span className="text-xs text-muted-foreground">{option.count}</span>
              </label>
            );
          })}
          {!shown.length && (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">No match</div>
          )}
        </div>
        {selected.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full"
            onClick={() => onChange(new Set())}
          >
            Clear {label.toLowerCase()} filter
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function FilterChip({
  label,
  onRemove,
  className = "bg-primary/10 text-primary",
}: {
  label: string;
  onRemove: () => void;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full py-1 pl-3 pr-1.5 text-xs font-semibold ${className}`}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="rounded-full p-0.5 hover:bg-black/10"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: typeof Clock }[];
}) {
  return (
    <div className="neo-inset flex gap-0.5 rounded-xl p-0.5" role="radiogroup">
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${active ? "neo-pop text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function WorkingAs({
  author,
  employees,
  onAuthor,
}: {
  author: string;
  employees: string[];
  onAuthor: (name: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <UserRound className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Working as
      </span>
      <Select value={author || undefined} onValueChange={onAuthor}>
        <SelectTrigger className={`h-9 w-[170px] ${author ? "" : "ring-2 ring-amber-300"}`}>
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
  );
}

const STATE_ICONS: Record<ItemState, typeof Clock> = {
  today: Truck,
  overdue: AlertTriangle,
  shortage: PackageOpen,
  enquired: Send,
  incoming: CalendarClock,
  unchecked: ClipboardCheck,
  complete: CheckCircle2,
};

function StatTile({
  state,
  count,
  active,
  delay,
  onClick,
}: {
  state: ItemState;
  count: number;
  active: boolean;
  delay: number;
  onClick: () => void;
}) {
  const meta = STATE_META[state];
  const Icon = STATE_ICONS[state];
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      aria-pressed={active}
      className={`relative overflow-hidden rounded-2xl p-3 text-left transition-shadow ${active ? "neo-pressed" : "neo-pop"} ${count === 0 ? "opacity-60" : ""}`}
    >
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${meta.accent}`} />
      <div className="flex items-center justify-between">
        <Icon className={`h-4 w-4 ${meta.chip.split(" ").find((c) => c.startsWith("text-"))}`} />
        {state === "today" && count > 0 && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold text-foreground">{count}</div>
      <div className="text-[11px] font-medium leading-tight text-muted-foreground">
        {meta.label}
      </div>
    </motion.button>
  );
}

function ItemGroup({
  title,
  hint,
  count,
  tone,
  defaultOpen = true,
  children,
}: {
  title: string;
  hint: string;
  count: number;
  tone: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toneClass =
    tone === "today"
      ? "text-sky-600"
      : tone === "attention"
        ? "text-amber-600"
        : tone === "complete"
          ? "text-emerald-600"
          : "text-primary";
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mb-3 flex w-full cursor-pointer items-center gap-3 text-left"
        aria-expanded={open}
      >
        <h2 className={`text-lg font-bold ${toneClass}`}>{title}</h2>
        <span className="neo-pressed rounded-full px-2.5 py-0.5 text-xs font-bold text-foreground">
          {count}
        </span>
        <span className="hidden text-xs text-muted-foreground sm:inline">{hint}</span>
        <ChevronDown
          className={`ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden p-2 -m-2"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function ItemCollection({
  view,
  ...props
}: {
  view: View;
  items: ProcurementItem[];
  today: string;
  onOpen: (item: ProcurementItem) => void;
  onUpdate: (item: ProcurementItem, patch: ItemPatch, log?: string) => Promise<boolean>;
  author: string;
  spotlight?: boolean;
}) {
  return view === "list" ? <ItemList {...props} /> : <CardGrid {...props} />;
}

// Compact rows for long material lists: one line per item, the same quick actions as a card.
function ItemList({
  items,
  today,
  onOpen,
  onUpdate,
  author,
}: {
  items: ProcurementItem[];
  today: string;
  onOpen: (item: ProcurementItem) => void;
  onUpdate: (item: ProcurementItem, patch: ItemPatch, log?: string) => Promise<boolean>;
  author: string;
}) {
  return (
    <div className="neo-surface overflow-hidden rounded-2xl">
      <div className="hidden grid-cols-[minmax(0,2.4fr)_76px_76px_84px_minmax(0,1.5fr)_minmax(150px,auto)] items-center gap-3 border-b border-border/50 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:grid">
        <span>Item</span>
        <span className="text-right">Required</span>
        <span className="text-right">In stock</span>
        <span className="text-right">To procure</span>
        <span>Status</span>
        <span className="text-right">Action</span>
      </div>
      <ul className="divide-y divide-border/40">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            state={itemState(item, today)}
            today={today}
            onOpen={() => onOpen(item)}
            onUpdate={onUpdate}
            author={author}
          />
        ))}
      </ul>
    </div>
  );
}

function ItemRow({
  item,
  state,
  today,
  onOpen,
  onUpdate,
  author,
}: {
  item: ProcurementItem;
  state: ItemState;
  today: string;
  onOpen: () => void;
  onUpdate: (item: ProcurementItem, patch: ItemPatch, log?: string) => Promise<boolean>;
  author: string;
}) {
  const meta = STATE_META[state];
  const quick = useQuickEntry(item, onUpdate, author);
  const unit = item.unit || "Nos";
  const unchecked = item.qtyInStock === null && item.qtyReceived === 0;
  const toProcure = qtyToProcure(item);
  return (
    <li
      className={`group/row relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-2.5 transition-colors hover:bg-primary/[0.04] lg:grid-cols-[minmax(0,2.4fr)_76px_76px_84px_minmax(0,1.5fr)_minmax(150px,auto)] ${state === "today" ? "bg-sky-50/60" : ""}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${meta.accent}`} />
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 text-left focus-visible:outline-none"
      >
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
          <span
            className={`truncate text-sm font-semibold group-hover/row:text-primary ${state === "complete" ? "text-foreground/70" : "text-foreground"}`}
          >
            {item.itemName}
          </span>
          {item.category && (
            <span className="hidden shrink-0 truncate rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground xl:inline">
              {item.category}
            </span>
          )}
        </div>
        {(item.make || item.model || item.specification) && (
          <div className="truncate pl-4 text-xs text-muted-foreground">
            {item.make && <span className="font-semibold text-foreground/70">{item.make}</span>}
            {item.make && (item.model || item.specification) ? " · " : ""}
            {[item.model, item.specification].filter(Boolean).join(" · ")}
          </div>
        )}
        {/* Quantities on small screens, where the columns are hidden. */}
        <div className="mt-0.5 pl-4 text-xs lg:hidden">
          <span className="font-semibold">{formatQty(item.qtyRequired)}</span> {unit} req ·{" "}
          {unchecked ? (
            <span className="text-muted-foreground">stock not checked</span>
          ) : (
            <span className={toProcure > 0 ? "font-semibold text-amber-600" : "text-emerald-600"}>
              {toProcure > 0 ? `${formatQty(toProcure)} to procure` : "available"}
            </span>
          )}
        </div>
      </button>
      <RowQty value={formatQty(item.qtyRequired)} unit={unit} />
      <RowQty
        value={item.qtyInStock === null ? "—" : formatQty(item.qtyInStock)}
        unit={item.qtyInStock === null ? "" : unit}
        tone={
          item.qtyInStock === null
            ? "text-muted-foreground"
            : item.qtyInStock === 0
              ? "text-rose-600"
              : "text-emerald-600"
        }
      />
      <RowQty
        value={unchecked ? "?" : formatQty(toProcure)}
        unit={unchecked ? "" : unit}
        tone={
          unchecked
            ? "text-muted-foreground"
            : toProcure > 0
              ? "text-amber-600"
              : "text-emerald-600"
        }
      />
      <div className="hidden min-w-0 lg:block">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.chip}`}
        >
          {meta.short}
        </span>
        <div
          className={`mt-0.5 truncate text-[11px] ${state === "overdue" ? "text-rose-600" : "text-muted-foreground"}`}
        >
          {itemFooter(item, state, today)}
        </div>
      </div>
      <div className="flex justify-end">
        <QuickArea quick={quick} state={state} unit={unit} onOpen={onOpen} compact />
      </div>
    </li>
  );
}

function RowQty({ value, unit, tone }: { value: string; unit: string; tone?: string }) {
  return (
    <div className={`hidden text-right text-sm font-bold lg:block ${tone ?? "text-foreground"}`}>
      {value}
      {unit && <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">{unit}</span>}
    </div>
  );
}

function CardGrid({
  items,
  today,
  onOpen,
  onUpdate,
  author,
  spotlight,
}: {
  items: ProcurementItem[];
  today: string;
  onOpen: (item: ProcurementItem) => void;
  onUpdate: (item: ProcurementItem, patch: ItemPatch, log?: string) => Promise<boolean>;
  author: string;
  spotlight?: boolean;
}) {
  return (
    <div className={`grid gap-4 ${spotlight ? "md:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
      <AnimatePresence initial={true}>
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ duration: 0.45, ease: EASE, delay: Math.min(index, 12) * 0.035 }}
            className="min-w-0"
          >
            <ItemCard
              item={item}
              state={itemState(item, today)}
              today={today}
              onOpen={() => onOpen(item)}
              onUpdate={onUpdate}
              author={author}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function QuantityBar({ item }: { item: ProcurementItem }) {
  const required = Math.max(item.qtyRequired, 0.0001);
  const stock = Math.min(item.qtyInStock ?? 0, item.qtyRequired);
  const received = Math.min(item.qtyReceived, item.qtyRequired - stock);
  const unchecked = item.qtyInStock === null && item.qtyReceived === 0;
  return (
    <div className="neo-inset flex h-2.5 overflow-hidden rounded-full">
      {unchecked ? (
        <div className="h-full w-full bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgba(148,163,184,0.35)_6px_12px)]" />
      ) : (
        <>
          <motion.div
            className="h-full bg-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${(stock / required) * 100}%` }}
            transition={{ duration: 0.8, ease: EASE }}
          />
          <motion.div
            className="h-full bg-sky-500"
            initial={{ width: 0 }}
            animate={{ width: `${(received / required) * 100}%` }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
          />
          <div className="h-full flex-1 bg-[repeating-linear-gradient(135deg,transparent_0_5px,rgba(244,63,94,0.18)_5px_10px)]" />
        </>
      )}
    </div>
  );
}

function ItemCard({
  item,
  state,
  today,
  onOpen,
  onUpdate,
  author,
}: {
  item: ProcurementItem;
  state: ItemState;
  today: string;
  onOpen: () => void;
  onUpdate: (item: ProcurementItem, patch: ItemPatch, log?: string) => Promise<boolean>;
  author: string;
}) {
  const meta = STATE_META[state];
  const Icon = STATE_ICONS[state];
  const quick = useQuickEntry(item, onUpdate, author);
  const toProcure = qtyToProcure(item);
  const unit = item.unit || "Nos";
  const footer = itemFooter(item, state, today);

  const card = (
    <div
      className={`group/item relative flex h-full flex-col overflow-hidden rounded-2xl p-4 transition-all duration-300 ${
        state === "today"
          ? "bg-[var(--neo-bg)]"
          : state === "complete"
            ? "neo-pop bg-gradient-to-br from-emerald-50/80 to-transparent"
            : "neo-pop"
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${meta.accent}`} />
      <div className="flex items-start gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.chip}`}
        >
          {state === "today" ? (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" />
            </span>
          ) : (
            <Icon className="h-3 w-3" />
          )}
          {meta.label}
        </span>
        {item.category && (
          <span className="truncate rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
            {item.category}
          </span>
        )}
        {state === "complete" && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </motion.span>
        )}
      </div>

      <button type="button" onClick={onOpen} className="mt-3 text-left focus-visible:outline-none">
        <div
          className={`line-clamp-2 font-semibold leading-snug group-hover/item:text-primary ${state === "complete" ? "text-foreground/75" : "text-foreground"}`}
        >
          {item.itemName}
        </div>
        {(item.make || item.model || item.specification) && (
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {[item.make, item.model, item.specification].filter(Boolean).join(" · ")}
          </div>
        )}
      </button>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Qty label="Required" value={formatQty(item.qtyRequired)} unit={unit} />
        <Qty
          label="In stock"
          value={item.qtyInStock === null ? "—" : formatQty(item.qtyInStock)}
          unit={item.qtyInStock === null ? "" : unit}
          tone={item.qtyInStock === null ? "muted" : item.qtyInStock === 0 ? "danger" : "good"}
        />
        <Qty
          label={item.qtyReceived > 0 ? "Still needed" : "To procure"}
          value={item.qtyInStock === null && item.qtyReceived === 0 ? "?" : formatQty(toProcure)}
          unit={item.qtyInStock === null && item.qtyReceived === 0 ? "" : unit}
          tone={toProcure > 0 ? "warn" : "good"}
        />
      </div>
      <div className="mt-3">
        <QuantityBar item={item} />
      </div>

      <div
        className={`mt-3 text-xs font-medium ${state === "overdue" ? "text-rose-600" : state === "today" ? "text-sky-700" : "text-muted-foreground"}`}
      >
        {footer}
      </div>

      <div className="mt-auto pt-3">
        <QuickArea quick={quick} state={state} unit={unit} onOpen={onOpen} />
      </div>
    </div>
  );

  if (state !== "today")
    return (
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="h-full"
      >
        {card}
      </motion.div>
    );

  // Arriving today: a slowly rotating glowing border sets these apart from everything else.
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="relative h-full overflow-hidden rounded-[18px] p-[2px] shadow-[0_12px_32px_-12px_rgba(14,165,233,0.55)]"
    >
      <motion.span
        aria-hidden
        className="absolute -inset-[60%] bg-[conic-gradient(from_0deg,#38bdf8,#6366f1,#22d3ee,#38bdf8)]"
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative h-full rounded-2xl bg-[var(--neo-bg)]">{card}</div>
    </motion.div>
  );
}

function itemFooter(item: ProcurementItem, state: ItemState, today: string) {
  const unit = item.unit || "Nos";
  const toProcure = qtyToProcure(item);
  switch (state) {
    case "today":
      return `Arriving today${item.supplier ? ` from ${item.supplier}` : ""}`;
    case "overdue": {
      const late = -daysFromToday(item.expectedDate!, today);
      return `${late} day${late === 1 ? "" : "s"} late · expected ${formatDay(item.expectedDate)}${item.supplier ? ` · ${item.supplier}` : ""}`;
    }
    case "incoming": {
      const days = daysFromToday(item.expectedDate!, today);
      return `Arrives ${days === 1 ? "tomorrow" : `in ${days} days`} · ${formatDay(item.expectedDate)}${item.supplier ? ` · ${item.supplier}` : ""}`;
    }
    case "enquired":
      return `Enquired${item.enquiryDate ? ` on ${formatDay(item.enquiryDate)}` : ""}${item.supplier ? ` with ${item.supplier}` : ""} · awaiting date`;
    case "shortage":
      return `Short by ${formatQty(toProcure)} ${unit} · no enquiry yet`;
    case "unchecked":
      return "Waiting for the store to check stock";
    case "complete":
      return item.qtyReceived > 0
        ? `All ${formatQty(item.qtyRequired)} ${unit} available · ${formatQty(item.qtyReceived)} received`
        : `All ${formatQty(item.qtyRequired)} ${unit} in stock`;
  }
}

// Inline "check stock" / "mark received" entry, shared by cards and list rows.
function useQuickEntry(
  item: ProcurementItem,
  onUpdate: (item: ProcurementItem, patch: ItemPatch, log?: string) => Promise<boolean>,
  author: string,
) {
  const [kind, setKind] = useState<"stock" | "receive" | null>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const toProcure = qtyToProcure(item);
  const unit = item.unit || "Nos";

  function open(next: "stock" | "receive") {
    setKind(next);
    setValue(next === "receive" ? formatQty(toProcure) : "");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || value.trim() === "") return;
    setSaving(true);
    const ok =
      kind === "stock"
        ? await onUpdate(
            item,
            {
              qty_in_stock: amount,
              stock_checked_by: author,
              stock_checked_at: new Date().toISOString(),
            },
            `Stock checked: ${item.itemName}, ${formatQty(amount)} of ${formatQty(item.qtyRequired)} ${unit} in stock`,
          )
        : await onUpdate(
            item,
            { qty_received: item.qtyReceived + amount, received_at: new Date().toISOString() },
            `Received ${formatQty(amount)} ${unit} of ${item.itemName}`,
          );
    setSaving(false);
    if (ok) {
      setKind(null);
      if (kind === "receive" && amount >= toProcure)
        toast.success(`${item.itemName} is now complete`);
    }
  }

  return { kind, value, setValue, saving, open, close: () => setKind(null), submit };
}

function QuickArea({
  quick,
  state,
  unit,
  onOpen,
  compact,
}: {
  quick: ReturnType<typeof useQuickEntry>;
  state: ItemState;
  unit: string;
  onOpen: () => void;
  compact?: boolean;
}) {
  const size = compact ? "h-8" : "h-9";
  return (
    <AnimatePresence mode="wait" initial={false}>
      {quick.kind ? (
        <motion.form
          key="quick"
          onSubmit={quick.submit}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="flex items-center gap-2"
        >
          <Input
            autoFocus
            type="number"
            min={0}
            step="any"
            value={quick.value}
            onChange={(event) => quick.setValue(event.target.value)}
            className={`${size} ${compact ? "w-24" : ""}`}
            aria-label={quick.kind === "stock" ? "Quantity in stock" : "Quantity received"}
            placeholder={quick.kind === "stock" ? "Qty in stock" : "Qty received"}
          />
          <span className="text-xs text-muted-foreground">{unit}</span>
          <Button
            size="icon"
            type="submit"
            className={`${size} w-8 shrink-0`}
            disabled={quick.saving}
            aria-label="Save"
          >
            {quick.saving ? <LoaderCircle className="animate-spin" /> : <Check />}
          </Button>
          <Button
            size="icon"
            type="button"
            variant="ghost"
            className={`${size} w-8 shrink-0`}
            onClick={quick.close}
            aria-label="Cancel"
          >
            <X />
          </Button>
        </motion.form>
      ) : (
        <motion.div
          key="actions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`flex flex-wrap gap-2 ${compact ? "justify-end" : ""}`}
        >
          {state === "unchecked" && (
            <Button size="sm" className={compact ? "h-8" : ""} onClick={() => quick.open("stock")}>
              <ClipboardCheck /> Check stock
            </Button>
          )}
          {(state === "today" ||
            state === "overdue" ||
            state === "incoming" ||
            state === "enquired") && (
            <Button
              size="sm"
              className={compact ? "h-8" : ""}
              variant={state === "today" ? "default" : "outline"}
              onClick={() => quick.open("receive")}
            >
              <PackageCheck /> {compact ? "Received" : "Mark received"}
            </Button>
          )}
          {state === "shortage" && (
            <Button size="sm" className={compact ? "h-8" : ""} onClick={onOpen}>
              <Send /> {compact ? "Enquiry" : "Log enquiry"}
            </Button>
          )}
          {!compact && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onOpen}
              className={state === "complete" ? "text-muted-foreground" : ""}
            >
              Details
            </Button>
          )}
          {compact && state === "complete" && (
            <span className="inline-flex h-8 items-center gap-1 px-2 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Available
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Qty({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone?: "good" | "warn" | "danger" | "muted";
}) {
  const color =
    tone === "good"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "danger"
          ? "text-rose-600"
          : tone === "muted"
            ? "text-muted-foreground"
            : "text-foreground";
  return (
    <div className="neo-inset rounded-xl px-1 py-2">
      <div className={`text-lg font-bold leading-none ${color}`}>
        {value}
        {unit && (
          <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">{unit}</span>
        )}
      </div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function EmptyList({ orderId, onAdd }: { orderId: string; onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="neo-surface rounded-3xl p-3"
    >
      <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed border-primary/25 px-6 py-16 text-center">
        <motion.span
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="neo-pop grid h-20 w-20 place-items-center rounded-3xl text-primary"
        >
          <FileSpreadsheet className="h-9 w-9" />
        </motion.span>
        <div>
          <div className="text-xl font-bold text-foreground">No BOM yet</div>
          <div className="mt-1 max-w-md text-sm text-muted-foreground">
            The Bill of Materials is uploaded in the Design stage. Each item in it becomes a card
            here for stock checks, enquiries and deliveries.
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/inward-orders/$id/stages/$stage" params={{ id: orderId, stage: "design" }}>
              <FileSpreadsheet /> Upload BOM in Design
            </Link>
          </Button>
          <Button variant="ghost" onClick={onAdd}>
            <Plus /> Add by hand
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

type SheetForm = {
  itemName: string;
  category: string;
  make: string;
  model: string;
  specification: string;
  unit: string;
  qtyRequired: string;
  qtyInStock: string;
  supplier: string;
  enquiryDate: string;
  expectedDate: string;
  qtyReceived: string;
  notes: string;
};

function toForm(item?: ProcurementItem): SheetForm {
  return {
    itemName: item?.itemName ?? "",
    category: item?.category ?? "",
    make: item?.make ?? "",
    model: item?.model ?? "",
    specification: item?.specification ?? "",
    unit: item?.unit ?? "Nos",
    qtyRequired: item ? formatQty(item.qtyRequired) : "1",
    qtyInStock: item?.qtyInStock === null || !item ? "" : formatQty(item.qtyInStock),
    supplier: item?.supplier ?? "",
    enquiryDate: item?.enquiryDate ?? "",
    expectedDate: item?.expectedDate ?? "",
    qtyReceived: item ? formatQty(item.qtyReceived) : "0",
    notes: item?.notes ?? "",
  };
}

function ItemSheet({
  item,
  author,
  onClose,
  onCreate,
  onSave,
  onDelete,
}: {
  item: ProcurementItem | "new" | null;
  author: string;
  onClose: () => void;
  onCreate: (row: ImportedItem) => Promise<void>;
  onSave: (item: ProcurementItem, patch: ItemPatch, log?: string) => Promise<void>;
  onDelete: (item: ProcurementItem) => Promise<void>;
}) {
  const existing = item && item !== "new" ? item : undefined;
  const [form, setForm] = useState<SheetForm>(() => toForm(existing));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (key: keyof SheetForm) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const preview = useMemo<ProcurementItem | undefined>(() => {
    const base =
      existing ??
      ({
        id: "new",
        stockCheckedBy: "",
        displayOrder: 0,
        createdAt: "",
        updatedAt: "",
      } as ProcurementItem);
    return {
      ...base,
      itemName: form.itemName,
      unit: form.unit || "Nos",
      qtyRequired: Number(form.qtyRequired) || 0,
      qtyInStock: form.qtyInStock.trim() === "" ? null : Number(form.qtyInStock) || 0,
      qtyReceived: Number(form.qtyReceived) || 0,
      supplier: form.supplier,
      enquiryDate: form.enquiryDate || undefined,
      expectedDate: form.expectedDate || undefined,
    };
  }, [form, existing]);
  const previewState = preview ? itemState(preview) : "unchecked";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.itemName.trim()) {
      toast.error("Item name is required");
      return;
    }
    setSaving(true);
    const qtyRequired = Math.max(0, Number(form.qtyRequired) || 0);
    if (!existing) {
      await onCreate({
        itemName: form.itemName.trim(),
        category: form.category.trim(),
        make: form.make.trim(),
        model: form.model.trim(),
        specification: form.specification.trim(),
        unit: form.unit.trim() || "Nos",
        qtyRequired,
        notes: form.notes.trim(),
        qtyMissing: false,
      });
      setSaving(false);
      return;
    }
    const qtyInStock =
      form.qtyInStock.trim() === "" ? null : Math.max(0, Number(form.qtyInStock) || 0);
    const qtyReceived = Math.max(0, Number(form.qtyReceived) || 0);
    const patch: ItemPatch = {
      item_name: form.itemName.trim(),
      category: form.category.trim(),
      make: form.make.trim(),
      model: form.model.trim(),
      specification: form.specification.trim(),
      unit: form.unit.trim() || "Nos",
      qty_required: qtyRequired,
      qty_in_stock: qtyInStock,
      supplier: form.supplier.trim(),
      enquiry_date: form.enquiryDate || null,
      expected_date: form.expectedDate || null,
      qty_received: qtyReceived,
      notes: form.notes.trim(),
    };
    const changes: string[] = [];
    if (qtyInStock !== existing.qtyInStock) {
      patch.stock_checked_by = author;
      patch.stock_checked_at = new Date().toISOString();
      changes.push(qtyInStock === null ? "stock cleared" : `${formatQty(qtyInStock)} in stock`);
    }
    if (qtyReceived !== existing.qtyReceived) {
      patch.received_at = new Date().toISOString();
      changes.push(`${formatQty(qtyReceived)} received in total`);
    }
    if (
      form.supplier.trim() !== existing.supplier ||
      (form.enquiryDate || undefined) !== existing.enquiryDate
    )
      changes.push(`enquiry${form.supplier.trim() ? ` with ${form.supplier.trim()}` : ""}`);
    if ((form.expectedDate || undefined) !== existing.expectedDate)
      changes.push(
        form.expectedDate ? `expected ${formatDay(form.expectedDate)}` : "expected date cleared",
      );
    await onSave(
      existing,
      patch,
      `Updated ${form.itemName.trim()}${changes.length ? `: ${changes.join(", ")}` : ""}`,
    );
    setSaving(false);
  }

  return (
    <Sheet open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{existing ? existing.itemName : "Add item"}</SheetTitle>
          <SheetDescription asChild>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATE_META[previewState].chip}`}
              >
                {STATE_META[previewState].label}
              </span>
              {preview && preview.qtyInStock !== null && (
                <span className="text-xs text-muted-foreground">
                  {formatQty(qtyAvailable(preview))} of {formatQty(preview.qtyRequired)}{" "}
                  {preview.unit} available
                </span>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="mt-6 space-y-6 pb-6">
          <FormSection icon={PackageOpen} title="Item" hint="What is required for this project">
            <Field label="Item name" value={form.itemName} onChange={set("itemName")} required />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Category"
                value={form.category}
                onChange={set("category")}
                placeholder="PLC, Relay, Meter…"
              />
              <Field label="Make" value={form.make} onChange={set("make")} />
              <Field label="Model / Part no" value={form.model} onChange={set("model")} />
              <Field
                label="Specification"
                value={form.specification}
                onChange={set("specification")}
              />
              <Field
                label="Qty required"
                type="number"
                value={form.qtyRequired}
                onChange={set("qtyRequired")}
              />
              <Field
                label="Unit"
                value={form.unit}
                onChange={set("unit")}
                placeholder="Nos, m, set…"
              />
            </div>
          </FormSection>

          {existing && (
            <>
              <FormSection
                icon={ClipboardCheck}
                title="Stock check"
                hint={
                  existing.stockCheckedBy
                    ? `Last checked by ${existing.stockCheckedBy}${existing.stockCheckedAt ? `, ${timeAgo(existing.stockCheckedAt)}` : ""}`
                    : "Store team: how many do we already have?"
                }
              >
                <Field
                  label="Qty in stock"
                  type="number"
                  value={form.qtyInStock}
                  onChange={set("qtyInStock")}
                  placeholder="Leave empty if not checked yet"
                />
              </FormSection>

              <FormSection
                icon={Send}
                title="Enquiry & delivery"
                hint="Purchase team: who supplies it and when it arrives"
              >
                <Field label="Supplier / vendor" value={form.supplier} onChange={set("supplier")} />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Enquiry date"
                    type="date"
                    value={form.enquiryDate}
                    onChange={set("enquiryDate")}
                  />
                  <Field
                    label="Expected arrival"
                    type="date"
                    value={form.expectedDate}
                    onChange={set("expectedDate")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="item-notes" className="text-xs font-semibold text-primary">
                    Notes
                  </Label>
                  <Textarea
                    id="item-notes"
                    rows={3}
                    value={form.notes}
                    onChange={(event) => set("notes")(event.target.value)}
                    placeholder="Quotation no., lead time, follow-up remarks…"
                  />
                </div>
              </FormSection>

              <FormSection
                icon={PackageCheck}
                title="Receiving"
                hint="Total quantity received from suppliers so far"
              >
                <Field
                  label="Qty received"
                  type="number"
                  value={form.qtyReceived}
                  onChange={set("qtyReceived")}
                />
              </FormSection>
            </>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? <LoaderCircle className="animate-spin" /> : <Check />}
              {existing ? "Save changes" : "Add item"}
            </Button>
            {existing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete item"
              >
                <Trash2 />
              </Button>
            )}
          </div>
        </form>

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this item?</AlertDialogTitle>
              <AlertDialogDescription>
                {existing?.itemName} will be removed from this order's material list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={() => existing && void onDelete(existing)}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

function FormSection({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof Clock;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="neo-surface space-y-3 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <span className="neo-pop grid h-8 w-8 place-items-center rounded-lg text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const id = `field-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-primary">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

function ActivityFeed({ activity }: { activity: ActivityRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? activity : activity.slice(0, 6);
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
      className="neo-surface rounded-3xl p-6"
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="neo-pop grid h-10 w-10 place-items-center rounded-xl text-primary">
          <History className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Activity</h2>
          <p className="text-xs text-muted-foreground">Who changed what, latest first</p>
        </div>
        <Link
          to="/inventory"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100"
        >
          <Boxes className="h-3.5 w-3.5" /> Inventory
          <span className="rounded-full bg-violet-100 px-1.5 text-[9px] uppercase">Beta</span>
        </Link>
      </div>
      {activity.length === 0 ? (
        <div className="neo-inset flex items-center gap-3 rounded-2xl px-4 py-6 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary/60" />
          Imports, stock checks, enquiries and deliveries will be listed here.
        </div>
      ) : (
        <ol className="space-y-2">
          <AnimatePresence initial={false}>
            {shown.map((entry) => (
              <motion.li
                key={entry.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/50"
              >
                <span className="neo-pop grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold text-primary">
                  {initials(entry.author)}
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold text-foreground">{entry.author || "Someone"}</span>{" "}
                  <span className="text-foreground/80">{entry.remarks}</span>
                  <div className="text-xs text-muted-foreground">{timeAgo(entry.created_at)}</div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
      {activity.length > 6 && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : `Show all ${activity.length}`}
        </Button>
      )}
    </motion.section>
  );
}
