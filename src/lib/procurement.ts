import type { Database } from "@/integrations/supabase/types";

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

export type ImportedItem = {
  itemName: string;
  category: string;
  make: string;
  model: string;
  specification: string;
  unit: string;
  qtyRequired: number;
  notes: string;
  qtyMissing: boolean;
};

type Field = Exclude<keyof ImportedItem, "qtyMissing">;

// Header names are matched loosely, so "Qty.", "Quantity" and "Req Qty" all work.
const HEADER_ALIASES: Record<Field, string[]> = {
  itemName: [
    "item",
    "itemname",
    "items",
    "description",
    "itemdescription",
    "material",
    "materialdescription",
    "particulars",
    "component",
    "equipment",
    "name",
  ],
  category: ["category", "type", "group", "itemtype", "section"],
  make: ["make", "brand", "manufacturer", "mfr", "oem"],
  model: ["model", "modelno", "partno", "partnumber", "catno", "catalogueno", "catalogno", "code"],
  specification: ["specification", "specifications", "spec", "specs", "rating", "details"],
  unit: ["unit", "units", "uom", "unitofmeasure"],
  qtyRequired: [
    "qty",
    "quantity",
    "qtyrequired",
    "requiredqty",
    "reqqty",
    "required",
    "nos",
    "qtynos",
  ],
  notes: ["remarks", "remark", "notes", "note", "comments", "comment"],
};

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Inventory sheets carry a stock count instead of a required quantity.
const STOCK_ALIASES = ["stock", "qtyinstock", "instock", "stockqty", "available", "balance"];

function matchHeader(cell: unknown, stockSheet = false): Field | undefined {
  const key = normalizeHeader(cell);
  if (!key) return undefined;
  const aliases = (field: Field) =>
    field === "qtyRequired" && stockSheet
      ? [...STOCK_ALIASES, ...HEADER_ALIASES.qtyRequired]
      : HEADER_ALIASES[field];
  const fields = Object.keys(HEADER_ALIASES) as Field[];
  return (
    fields.find((field) => aliases(field).includes(key)) ??
    fields.find((field) => aliases(field).some((alias) => alias.length > 3 && key.includes(alias)))
  );
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  const parsed = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && String(value ?? "").trim() !== "" ? parsed : NaN;
}

// For an inventory sheet (stockSheet), qtyRequired holds the stock count.
export function rowsToItems(
  rows: unknown[][],
  stockSheet = false,
): { items: ImportedItem[]; error?: string } {
  const headerIndex = rows
    .slice(0, 15)
    .findIndex((row) => row.some((cell) => matchHeader(cell) === "itemName"));
  if (headerIndex === -1)
    return {
      items: [],
      error: "Could not find a header row with an Item / Description column.",
    };

  const columns = new Map<Field, number>();
  rows[headerIndex].forEach((cell, index) => {
    const field = matchHeader(cell, stockSheet);
    if (field && !columns.has(field)) columns.set(field, index);
  });

  const read = (row: unknown[], field: Field) => {
    const index = columns.get(field);
    return index === undefined ? "" : String(row[index] ?? "").trim();
  };

  const items: ImportedItem[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const itemName = read(row, "itemName");
    if (!itemName) continue;
    const qtyIndex = columns.get("qtyRequired");
    const qty = qtyIndex === undefined ? NaN : toNumber(row[qtyIndex]);
    items.push({
      itemName,
      category: read(row, "category"),
      make: read(row, "make"),
      model: read(row, "model"),
      specification: read(row, "specification"),
      unit: read(row, "unit") || "Nos",
      qtyRequired: Number.isFinite(qty) && qty >= 0 ? qty : stockSheet ? 0 : 1,
      notes: read(row, "notes"),
      qtyMissing: !Number.isFinite(qty),
    });
  }
  return { items };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const delimiter =
    text.split("\n", 1)[0].split(";").length > text.split("\n", 1)[0].split(",").length ? ";" : ",";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export async function readSpreadsheet(file: File): Promise<unknown[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type === "text/csv") return parseCsv(await file.text());
  if (name.endsWith(".xls"))
    throw new Error("Old .xls files are not supported. Save it as .xlsx or .csv and try again.");
  const { default: readXlsxFile } = await import("read-excel-file/universal");
  const sheets = await readXlsxFile(file);
  // Use the first sheet that has an item column.
  for (const sheet of sheets) {
    if (rowsToItems(sheet.data as unknown[][]).items.length) return sheet.data as unknown[][];
  }
  return (sheets[0]?.data as unknown[][]) ?? [];
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

export async function downloadTemplate(fileName = "material-list-template.xlsx") {
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
