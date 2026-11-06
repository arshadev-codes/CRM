import type { Database } from "@/integrations/supabase/types";
import {
  analyzeWorkbook,
  detectTable,
  extractItems,
  readWorkbook,
  type ImportedItem,
} from "./bomParser";

export type ProcurementRow = Database["public"]["Tables"]["procurement_items"]["Row"];
export type ProcurementInsert = Database["public"]["Tables"]["procurement_items"]["Insert"];
export type InventoryRow = Database["public"]["Tables"]["inventory_items"]["Row"];

export type ProcurementItem = {
  id: string;
  itemName: string;
  category: string;
  make: string;
  model: string;
  specification: string;
  unit: string;
  qtyRequired: number;
  qtyInStock: number | null;
  stockCheckedBy: string;
  stockCheckedAt?: string;
  supplier: string;
  enquiryDate?: string;
  expectedDate?: string;
  qtyReceived: number;
  receivedAt?: string;
  notes: string;
  /** Panel of the order this item is for ("" when the BOM is not panel-wise). */
  panel: string;
  panelId: string | null;
  consumable: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export function mapProcurement(row: ProcurementRow): ProcurementItem {
  return {
    id: row.id,
    itemName: row.item_name,
    category: row.category,
    make: row.make,
    model: row.model,
    specification: row.specification,
    unit: row.unit || "Nos",
    qtyRequired: Number(row.qty_required) || 0,
    qtyInStock: row.qty_in_stock === null ? null : Number(row.qty_in_stock),
    stockCheckedBy: row.stock_checked_by,
    stockCheckedAt: row.stock_checked_at ?? undefined,
    supplier: row.supplier,
    enquiryDate: row.enquiry_date ?? undefined,
    expectedDate: row.expected_date ?? undefined,
    qtyReceived: Number(row.qty_received) || 0,
    receivedAt: row.received_at ?? undefined,
    notes: row.notes,
    panel: row.panel ?? "",
    panelId: row.panel_id ?? null,
    consumable: Boolean(row.consumable),
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Where an item stands, from most to least urgent.
export type ItemState =
  | "today" // expected to arrive today
  | "overdue" // expected date has passed and it is still short
  | "shortage" // short, and nobody has enquired yet
  | "enquired" // enquiry made, arrival date not known yet
  | "incoming" // arrival date set in the future
  | "unchecked" // store has not checked stock yet
  | "complete"; // enough in stock + received

export const STATE_ORDER: ItemState[] = [
  "today",
  "overdue",
  "shortage",
  "enquired",
  "incoming",
  "unchecked",
  "complete",
];

export const STATE_META: Record<
  ItemState,
  { label: string; short: string; chip: string; accent: string; dot: string }
> = {
  today: {
    label: "Arriving today",
    short: "Today",
    chip: "bg-sky-100 text-sky-700",
    accent: "from-sky-400 to-primary",
    dot: "bg-sky-500",
  },
  overdue: {
    label: "Overdue",
    short: "Overdue",
    chip: "bg-rose-100 text-rose-700",
    accent: "from-rose-400 to-rose-600",
    dot: "bg-rose-500",
  },
  shortage: {
    label: "Needs enquiry",
    short: "Needs enquiry",
    chip: "bg-amber-100 text-amber-800",
    accent: "from-amber-300 to-orange-500",
    dot: "bg-amber-500",
  },
  enquired: {
    label: "Enquiry sent",
    short: "Enquired",
    chip: "bg-violet-100 text-violet-700",
    accent: "from-violet-400 to-indigo-500",
    dot: "bg-violet-500",
  },
  incoming: {
    label: "On the way",
    short: "On the way",
    chip: "bg-primary/10 text-primary",
    accent: "from-primary to-chart-2",
    dot: "bg-primary",
  },
  unchecked: {
    label: "Stock check pending",
    short: "Not checked",
    chip: "bg-slate-200/70 text-slate-600",
    accent: "from-slate-300 to-slate-400",
    dot: "bg-slate-400",
  },
  complete: {
    label: "Available",
    short: "Available",
    chip: "bg-emerald-100 text-emerald-700",
    accent: "from-emerald-400 to-emerald-600",
    dot: "bg-emerald-500",
  },
};

export function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function qtyAvailable(item: ProcurementItem) {
  return (item.qtyInStock ?? 0) + item.qtyReceived;
}
export function qtyToProcure(item: ProcurementItem) {
  return Math.max(0, item.qtyRequired - qtyAvailable(item));
}

export function itemState(item: ProcurementItem, today = todayIso()): ItemState {
  if (item.qtyInStock === null && item.qtyReceived === 0) return "unchecked";
  if (qtyToProcure(item) === 0) return "complete";
  if (item.expectedDate) {
    if (item.expectedDate === today) return "today";
    if (item.expectedDate < today) return "overdue";
    return "incoming";
  }
  return item.enquiryDate || item.supplier ? "enquired" : "shortage";
}

export function sortItems(items: ProcurementItem[], today = todayIso()) {
  return [...items].sort((a, b) => {
    const byState =
      STATE_ORDER.indexOf(itemState(a, today)) - STATE_ORDER.indexOf(itemState(b, today));
    if (byState) return byState;
    if (a.expectedDate && b.expectedDate && a.expectedDate !== b.expectedDate)
      return a.expectedDate.localeCompare(b.expectedDate);
    return a.displayOrder - b.displayOrder;
  });
}

export function formatQty(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

export function formatDay(value?: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(date);
}

export function daysFromToday(value: string, today = todayIso()) {
  const ms = new Date(`${value}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime();
  return Math.round(ms / 86400000);
}

/* ---------- Excel / CSV import ---------- */

export type { ImportedItem } from "./bomParser";

// For an inventory sheet (stockSheet), qtyRequired holds the stock count.
export function rowsToItems(
  rows: unknown[][],
  stockSheet = false,
): { items: ImportedItem[]; error?: string } {
  const table = detectTable({ name: "", rows }, stockSheet);
  if (!table)
    return {
      items: [],
      error: "Could not find a header row with an Item / Description column.",
    };
  return { items: extractItems(table, stockSheet).items };
}

// Rows of the sheet with the most items.
export async function readSpreadsheet(file: File): Promise<unknown[][]> {
  const sheets = await readWorkbook(file);
  const { tables } = analyzeWorkbook(sheets);
  const best = [...tables].sort((a, b) => b.itemCount - a.itemCount)[0];
  return best?.rows ?? sheets[0]?.rows ?? [];
}

const TEMPLATE_HEADERS = [
  "Item",
  "Category",
  "Make",
  "Model / Part No",
  "Specification",
  "Qty",
  "Unit",
  "Remarks",
];
const TEMPLATE_EXAMPLES: (string | number)[][] = [
  ["PLC CPU", "PLC", "Siemens", "6ES7214-1AG40-0XB0", "S7-1200, 24V DC", 1, "Nos", ""],
  ["Auxiliary relay", "Relay", "Omron", "MY4N-D2", "24V DC, 4 C/O", 12, "Nos", ""],
  ["Multifunction meter", "Meter", "Schneider", "PM2220", "Class 1.0, RS485", 4, "Nos", ""],
  ["Control cable", "Cable", "Polycab", "", "1.5 sq mm, 12 core", 150, "m", ""],
];

export async function downloadTemplate(fileName = "bom-template.xlsx") {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const header = TEMPLATE_HEADERS.map((value) => ({
    value,
    fontWeight: "bold" as const,
    backgroundColor: "#DCE8FA",
  }));
  const rows = TEMPLATE_EXAMPLES.map((row) =>
    row.map((value) => (typeof value === "number" ? { value, type: Number } : { value })),
  );
  await writeXlsxFile([header, ...rows], {
    columns: [28, 14, 14, 24, 26, 8, 8, 24].map((width) => ({ width })),
    stickyRowsCount: 1,
  }).toFile(fileName);
}

/* ---------- Inventory (beta) matching ---------- */

function key(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// A match needs the same item name, and the same model when both sides have one.
export function findInventoryMatch(item: ProcurementItem, inventory: InventoryRow[]) {
  const name = key(item.itemName);
  const model = key(item.model);
  return inventory.find((entry) => {
    if (key(entry.item_name) !== name) return false;
    const entryModel = key(entry.model);
    return !model || !entryModel || entryModel === model;
  });
}

/* ---------- BOM revisions ---------- */

export type BomChange = {
  item: ProcurementItem;
  next: ImportedItem;
  changes: string[];
};
export type BomPlan = {
  added: ImportedItem[];
  changed: BomChange[];
  unchanged: number;
  removed: ProcurementItem[];
};

// The same item on two panels is two cards, so the panel is part of the match.
function bomKey(item: { itemName: string; model: string; panel?: string }) {
  return `${key(item.itemName)}|${key(item.model)}|${key(item.panel ?? "")}`;
}

// Compares a new BOM with the current material list, so a revision keeps the stock checks,
// enquiries and deliveries already recorded against matching items.
export function planBomUpdate(current: ProcurementItem[], incoming: ImportedItem[]): BomPlan {
  const pool = new Map<string, ProcurementItem[]>();
  for (const item of [...current].sort((a, b) => a.displayOrder - b.displayOrder)) {
    const k = bomKey(item);
    pool.set(k, [...(pool.get(k) ?? []), item]);
  }
  const takeMatch = (next: ImportedItem) => {
    const exact = pool.get(bomKey(next));
    if (exact?.length) return exact.shift();
    // Same item name where one side has no model number.
    for (const [k, list] of pool) {
      const [name, model, panel] = k.split("|");
      if (
        name === key(next.itemName) &&
        panel === key(next.panel ?? "") &&
        (!model || !key(next.model)) &&
        list.length
      )
        return list.shift();
    }
    return undefined;
  };

  const plan: BomPlan = { added: [], changed: [], unchanged: 0, removed: [] };
  for (const next of incoming) {
    const item = takeMatch(next);
    if (!item) {
      plan.added.push(next);
      continue;
    }
    const changes: string[] = [];
    if (item.qtyRequired !== next.qtyRequired)
      changes.push(`qty ${formatQty(item.qtyRequired)} → ${formatQty(next.qtyRequired)}`);
    if (next.make && item.make !== next.make) changes.push(`make ${next.make}`);
    if (next.model && item.model !== next.model) changes.push(`model ${next.model}`);
    if (next.specification && item.specification !== next.specification)
      changes.push("specification");
    if (next.unit && item.unit !== next.unit) changes.push(`unit ${next.unit}`);
    if (next.category && item.category !== next.category) changes.push(`category ${next.category}`);
    if (changes.length) plan.changed.push({ item, next, changes });
    else plan.unchanged++;
  }
  plan.removed = [...pool.values()].flat();
  return plan;
}

// Items with stock checked, an enquiry or a delivery recorded.
export function hasProgress(item: ProcurementItem) {
  return (
    item.qtyInStock !== null ||
    item.qtyReceived > 0 ||
    Boolean(item.supplier || item.enquiryDate || item.expectedDate)
  );
}
