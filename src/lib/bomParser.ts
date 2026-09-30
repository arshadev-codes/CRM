// Reads a BOM / material list from Excel or CSV without assuming one fixed format.
// It finds the header row (even a two-row header, or one far down the sheet), works out
// which column is which from loose header names and the data itself, skips serial numbers,
// prices, totals and repeated headers, turns heading rows into sections, and reads every
// sheet that holds an item table.

export type BomField =
  | "itemName"
  | "category"
  | "make"
  | "model"
  | "specification"
  | "unit"
  | "qtyRequired"
  | "notes";

export const BOM_FIELDS: { key: BomField; label: string }[] = [
  { key: "itemName", label: "Item / description" },
  { key: "qtyRequired", label: "Quantity" },
  { key: "unit", label: "Unit" },
  { key: "make", label: "Make" },
  { key: "model", label: "Model / part no" },
  { key: "specification", label: "Specification" },
  { key: "category", label: "Category / section" },
  { key: "notes", label: "Remarks" },
];

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
  sheet?: string;
};

export type SheetData = { name: string; rows: unknown[][] };

export type SheetTable = {
  sheet: string;
  rows: unknown[][];
  // Index of the last header row; data starts on the next row.
  headerRow: number;
  headers: string[];
  columns: Partial<Record<BomField, number>>;
  // True when no header row was recognised and the columns were guessed from the data.
  guessed: boolean;
};

// Header names are matched loosely, so "Qty.", "Total Quantity" and "Req Qty" all work.
const ALIASES: Record<BomField, string[]> = {
  itemName: [
    "item",
    "itemname",
    "items",
    "description",
    "itemdescription",
    "itemdesc",
    "descriptionofitem",
    "descriptionofitems",
    "descriptionofmaterial",
    "descriptionofgoods",
    "descriptionofequipment",
    "material",
    "materialname",
    "materialdescription",
    "particulars",
    "component",
    "componentname",
    "equipment",
    "equipmentname",
    "equipmentdescription",
    "product",
    "productname",
    "productdescription",
    "article",
    "name",
  ],
  category: [
    "category",
    "type",
    "group",
    "itemtype",
    "section",
    "panel",
    "panelname",
    "location",
    "area",
    "subsystem",
    "system",
  ],
  make: [
    "make",
    "makes",
    "brand",
    "brandname",
    "manufacturer",
    "mfr",
    "mfg",
    "oem",
    "preferredmake",
    "approvedmake",
  ],
  model: [
    "model",
    "modelno",
    "modelnumber",
    "partno",
    "partnumber",
    "partcode",
    "catno",
    "catalogueno",
    "catalogno",
    "cataloguenumber",
    "catalognumber",
    "code",
    "itemcode",
    "itemno",
    "ordercode",
    "orderingcode",
    "productcode",
    "refno",
    "reference",
    "typeno",
  ],
  specification: [
    "specification",
    "specifications",
    "spec",
    "specs",
    "rating",
    "ratings",
    "details",
    "technicalspecification",
    "technicaldetails",
    "techspec",
    "size",
    "capacity",
  ],
  unit: ["unit", "units", "uom", "unitofmeasure", "unitofmeasurement", "measure"],
  qtyRequired: [
    "qty",
    "qnty",
    "qnt",
    "qtys",
    "quantity",
    "quantities",
    "qtyrequired",
    "requiredqty",
    "reqqty",
    "qtyreqd",
    "reqdqty",
    "totalqty",
    "totalquantity",
    "required",
    "nos",
    "qtynos",
    "noofunits",
    "count",
  ],
  notes: ["remarks", "remark", "notes", "note", "comments", "comment"],
};

// Inventory sheets carry a stock count instead of a required quantity.
const STOCK_ALIASES = ["stock", "qtyinstock", "instock", "stockqty", "available", "balance"];
const SERIAL = new Set(["sno", "srno", "slno", "sn", "serialno", "serialnumber", "sr", "sl", "no"]);
const PRICE = ["rate", "price", "amount", "value", "cost", "gst", "tax", "discount", "inr", "rs"];
const FIELDS = Object.keys(ALIASES) as BomField[];

function norm(value: unknown) {
  return cellText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  return String(value).replace(/\s+/g, " ").trim();
}

function isNumeric(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value);
  const text = cellText(value);
  return text !== "" && /^[\d.,\s]+$/.test(text) && /\d/.test(text);
}

function aliasesFor(field: BomField, stockSheet: boolean) {
  return field === "qtyRequired" && stockSheet
    ? [...STOCK_ALIASES, ...ALIASES.qtyRequired]
    : ALIASES[field];
}

export function matchField(label: unknown, stockSheet = false): BomField | undefined {
  const key = norm(label);
  if (!key || SERIAL.has(key)) return undefined;
  // "Unit price", "Total amount" and the like are money, not quantities or units.
  if (PRICE.some((word) => key.includes(word)) && !key.includes("qty")) return undefined;
  // "Quantity Panel A" or "Qty (Nos)" is a quantity, whatever else the label says.
  if (/qty|quantity|qnty/.test(key)) return "qtyRequired";
  return (
    FIELDS.find((field) => aliasesFor(field, stockSheet).includes(key)) ??
    FIELDS.find((field) =>
      aliasesFor(field, stockSheet).some((alias) => alias.length > 3 && key.includes(alias)),
    ) ??
    (/(^|[^a-z])qty|qty$/.test(key) ? "qtyRequired" : undefined)
  );
}

function sampleColumn(rows: unknown[][], start: number, column: number, limit = 40) {
  const values: string[] = [];
  for (let r = start; r < rows.length && values.length < limit; r++) {
    const text = cellText(rows[r]?.[column]);
    if (text) values.push(text);
  }
  return values;
}

function averageLength(values: string[]) {
  return values.length ? values.reduce((sum, value) => sum + value.length, 0) / values.length : 0;
}

// Part numbers and item codes: no spaces, contain a digit, or are plain numbers.
function codeLike(values: string[]) {
  if (!values.length) return false;
  const codes = values.filter((value) => /^[A-Za-z0-9\-/._#]+$/.test(value) && /\d/.test(value));
  return codes.length / values.length > 0.6;
}

function numericShare(values: string[]) {
  return values.length ? values.filter((value) => isNumeric(value)).length / values.length : 0;
}

// Several columns can look like the same field; pick the best and move the rest where they fit.
function resolveColumns(
  headers: string[],
  rows: unknown[][],
  dataStart: number,
  stockSheet: boolean,
) {
  const candidates = new Map<BomField, number[]>();
  headers.forEach((label, index) => {
    const field = matchField(label, stockSheet);
    if (!field) return;
    candidates.set(field, [...(candidates.get(field) ?? []), index]);
  });

  const columns: Partial<Record<BomField, number>> = {};
  const taken = new Set<number>();
  const assign = (field: BomField, index: number) => {
    if (columns[field] !== undefined || taken.has(index)) return false;
    columns[field] = index;
    taken.add(index);
    return true;
  };

  // Item name: skip code-like columns (item codes), prefer "Item" over "Description",
  // and keep the description as the specification.
  const nameColumns = candidates.get("itemName") ?? [];
  const described = (index: number) => norm(headers[index]).includes("desc");
  const textual = nameColumns.filter((index) => {
    const values = sampleColumn(rows, dataStart, index);
    if (codeLike(values) || numericShare(values) > 0.6) {
      if (!candidates.get("model")?.length) assign("model", index);
      return false;
    }
    return values.length > 0;
  });
  const primary = textual.find((index) => !described(index)) ?? textual[0] ?? nameColumns[0];
  if (primary !== undefined) assign("itemName", primary);
  for (const index of textual) {
    if (index === primary) continue;
    if (!candidates.get("specification")?.length && assign("specification", index)) continue;
    if (!candidates.get("notes")?.length) assign("notes", index);
  }

  // Quantity: "Total qty" beats "Qty per panel", and the column must hold numbers.
  const qtyColumns = (candidates.get("qtyRequired") ?? []).filter(
    (index) => numericShare(sampleColumn(rows, dataStart, index)) > 0.3 || !rows[dataStart],
  );
  const qtyRank = (index: number) => {
    const key = norm(headers[index]);
    return key.includes("total") ? 3 : key.includes("req") ? 2 : 1;
  };
  const qty = [...qtyColumns].sort((a, b) => qtyRank(b) - qtyRank(a))[0];
  if (qty !== undefined) assign("qtyRequired", qty);

  for (const field of FIELDS) {
    for (const index of candidates.get(field) ?? []) if (assign(field, index)) break;
  }
  return columns;
}

// A merged top cell ("Quantity" over "Panel A | Panel B | Total") spreads to the right.
function combineHeaderRows(top: unknown[], bottom: unknown[]) {
  const width = Math.max(top.length, bottom.length);
  const labels: string[] = [];
  let carry = "";
  for (let i = 0; i < width; i++) {
    const upper = cellText(top[i]);
    const lower = cellText(bottom[i]);
    if (upper) carry = upper;
    const spread = upper || (lower ? carry : "");
    labels.push([spread, lower].filter(Boolean).join(" "));
  }
  return labels;
}

// A second header row sits under merged cells: it is sparser than the row above and has
// labels under blank cells ("Quantity" spanning "Panel A | Panel B | Total").
function isSubHeader(top: unknown[], bottom: unknown[]) {
  const topCount = top.map(cellText).filter(Boolean).length;
  const cells = bottom.map(cellText);
  const underBlank = cells.some((cell, i) => cell && !cellText(top[i]));
  return underBlank && cells.filter(Boolean).length < topCount;
}

function headerScore(columns: Partial<Record<BomField, number>>) {
  const fields = Object.keys(columns).length;
  return (
    fields + (columns.itemName !== undefined ? 3 : 0) + (columns.qtyRequired !== undefined ? 2 : 0)
  );
}

function looksLikeHeaderRow(row: unknown[]) {
  const cells = row.map(cellText).filter(Boolean);
  return cells.length >= 2 && cells.every((cell) => !isNumeric(cell));
}

export function detectTable(sheet: SheetData, stockSheet = false): SheetTable | null {
  const { rows } = sheet;
  let best: { score: number; table: SheetTable } | null = null;
  const consider = (headers: string[], headerRow: number, penalty: number) => {
    const columns = resolveColumns(headers, rows, headerRow + 1, stockSheet);
    if (columns.itemName === undefined) return;
    const score = headerScore(columns) - penalty;
    if (!best || score > best.score)
      best = {
        score,
        table: { sheet: sheet.name, rows, headerRow, headers, columns, guessed: false },
      };
  };

  const scan = Math.min(rows.length, 40);
  for (let r = 0; r < scan; r++) {
    const row = rows[r] ?? [];
    if (!row.some((cell) => matchField(cell, stockSheet))) continue;
    consider(row.map(cellText), r, 0);
    const next = rows[r + 1];
    if (next && looksLikeHeaderRow(next))
      consider(combineHeaderRows(row, next), r + 1, isSubHeader(row, next) ? -0.5 : 0.5);
  }
  if (best) return (best as { table: SheetTable }).table;
  return guessTable(sheet);
}

// No recognisable header: take the first row of labels and read the columns from the data.
function guessTable(sheet: SheetData): SheetTable | null {
  const { rows } = sheet;
  const headerRow = rows
    .slice(0, 40)
    .findIndex((row) => row.map(cellText).filter((cell) => cell && !isNumeric(cell)).length >= 2);
  if (headerRow === -1) return null;
  const width = Math.max(...rows.slice(headerRow, headerRow + 40).map((row) => row.length), 0);
  let name = -1;
  let longest = 0;
  let qty = -1;
  for (let c = 0; c < width; c++) {
    const values = sampleColumn(rows, headerRow + 1, c);
    const numeric = numericShare(values);
    const length = averageLength(values);
    if (numeric < 0.5 && !codeLike(values) && length > longest) {
      longest = length;
      name = c;
    }
    if (numeric > 0.7 && qty === -1 && c > 0) qty = c;
  }
  if (name === -1) return null;
  const columns: Partial<Record<BomField, number>> = { itemName: name };
  if (qty !== -1 && qty !== name) columns.qtyRequired = qty;
  return {
    sheet: sheet.name,
    rows,
    headerRow,
    headers: (rows[headerRow] ?? []).map(cellText),
    columns,
    guessed: true,
  };
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  const text = cellText(value).replace(/,/g, "");
  const match = text.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

const TOTAL_ROW = /^(sub[\s-]*)?(grand[\s-]*)?total\b/i;
const NOTE_ROW = /^(note|notes|nb|n\.b\.)\b/i;
const MEANINGLESS_SHEET = /^(sheet|table|page)\s*\d*$/i;

// Heading rows such as "A. MCC Panel" or "Section 2 - Field Instruments" lose their numbering.
function cleanSection(text: string) {
  return text.replace(/^([a-z]|[ivx]+|\d+)[.)]\s+/i, "").trim();
}

export function extractItems(table: SheetTable, stockSheet = false) {
  const { rows, columns, headerRow } = table;
  const read = (row: unknown[], field: BomField) => {
    const index = columns[field];
    return index === undefined ? "" : cellText(row[index]);
  };
  const headerKeys = new Set(table.headers.map(norm).filter(Boolean));
  const dataRows = rows.slice(headerRow + 1);
  const qtyIndex = columns.qtyRequired;
  const withQty =
    qtyIndex === undefined
      ? 0
      : dataRows.filter((row) => Number.isFinite(toNumber(row[qtyIndex]))).length;
  const detectSections = qtyIndex !== undefined && withQty / Math.max(dataRows.length, 1) > 0.3;
  const sheetLabel = MEANINGLESS_SHEET.test(table.sheet.trim()) ? "" : table.sheet.trim();

  const items: ImportedItem[] = [];
  let section = "";
  let lastCategory = "";
  let sections = 0;

  for (const row of dataRows) {
    const cells = row.map(cellText);
    const filled = cells.filter(Boolean);
    if (!filled.length) continue;
    // Headers repeated on every printed page.
    if (filled.filter((cell) => headerKeys.has(norm(cell))).length >= 2) continue;

    const itemName = read(row, "itemName");
    const qtyRaw = qtyIndex === undefined ? "" : cellText(row[qtyIndex]);
    const qty = toNumber(row[qtyIndex ?? -1]);
    const others = (["make", "model", "specification", "unit"] as BomField[]).some((field) =>
      read(row, field),
    );

    if (!itemName) {
      // A heading typed in another column (often the serial-number column).
      const text = filled.find((cell) => !isNumeric(cell));
      if (filled.length === 1 && text && !qtyRaw && detectSections) {
        section = cleanSection(text);
        sections++;
        continue;
      }
      // A description that wraps onto the next row.
      const extra = read(row, "specification");
      const last = items.at(-1);
      if (last && extra && !qtyRaw)
        last.specification = [last.specification, extra].filter(Boolean).join(" ");
      continue;
    }
    if (TOTAL_ROW.test(itemName) || NOTE_ROW.test(itemName)) continue;
    if (detectSections && !qtyRaw && !others) {
      // "with socket and clip" under an item continues its description; headings are
      // capitalised, numbered ("A", "II", "3.") or end with a colon.
      const marked = filled.some(
        (cell) => cell !== itemName && /^([a-z]|[ivx]+|\d+)[.)]?$/i.test(cell),
      );
      const heading =
        marked ||
        itemName.endsWith(":") ||
        itemName === itemName.toUpperCase() ||
        !/^[a-z]/.test(itemName);
      const last = items.at(-1);
      if (!heading && last) {
        last.specification = [last.specification, itemName].filter(Boolean).join(" ");
        continue;
      }
      section = cleanSection(itemName.replace(/:$/, ""));
      sections++;
      continue;
    }

    // Merged category cells only fill the first row, so carry them down.
    const categoryCell = read(row, "category");
    if (categoryCell) lastCategory = categoryCell;
    const category = (columns.category !== undefined ? lastCategory : "") || section || sheetLabel;

    // "150 m" or "2 Nos" in the quantity cell also gives the unit.
    const unitFromQty = qtyRaw.replace(/[\d.,\s-]/g, "");
    const qtyValid = Number.isFinite(qty) && qty >= 0;
    items.push({
      itemName,
      category,
      make: read(row, "make"),
      model: read(row, "model"),
      specification: read(row, "specification"),
      unit: read(row, "unit") || (unitFromQty.length <= 5 ? unitFromQty : "") || "Nos",
      qtyRequired: qtyValid ? qty : stockSheet ? 0 : 1,
      notes: read(row, "notes"),
      qtyMissing: !qtyValid,
      sheet: table.sheet,
    });
  }
  return { items, sections };
}

const SUMMARY_SHEET = /summary|abstract|cover|index|revision|notes|instructions|total/i;

export type WorkbookAnalysis = {
  tables: (SheetTable & { itemCount: number; include: boolean })[];
};

export function analyzeWorkbook(sheets: SheetData[], stockSheet = false): WorkbookAnalysis {
  const tables = sheets
    .map((sheet) => detectTable(sheet, stockSheet))
    .filter((table): table is SheetTable => Boolean(table))
    .map((table) => ({ ...table, itemCount: extractItems(table, stockSheet).items.length }))
    .filter((table) => table.itemCount > 0);
  // Read every item sheet, except summaries that would count items twice.
  const detailed = tables.filter((table) => !SUMMARY_SHEET.test(table.sheet) && !table.guessed);
  const chosen = detailed.length ? detailed : tables.slice(0, 1);
  return {
    tables: tables.map((table) => ({ ...table, include: chosen.includes(table) })),
  };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const firstLine = text.split("\n", 1)[0];
  const delimiter =
    firstLine.split("\t").length > 2
      ? "\t"
      : firstLine.split(";").length > firstLine.split(",").length
        ? ";"
        : ",";
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

export function isSpreadsheet(file: File) {
  return /\.(xlsx|xlsm|csv|tsv)$/i.test(file.name);
}

export async function readWorkbook(file: File): Promise<SheetData[]> {
  const name = file.name.toLowerCase();
  if (/\.(csv|tsv)$/.test(name) || file.type === "text/csv")
    return [{ name: file.name.replace(/\.[^.]+$/, ""), rows: parseCsv(await file.text()) }];
  if (name.endsWith(".xls"))
    throw new Error("Old .xls files are not supported. Save it as .xlsx or .csv and try again.");
  const { default: readXlsxFile } = await import("read-excel-file/universal");
  const sheets = await readXlsxFile(file);
  return sheets.map((sheet) => ({ name: sheet.sheet, rows: sheet.data as unknown[][] }));
}
