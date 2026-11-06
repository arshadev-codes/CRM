import { cellText, type ImportedItem, type SheetData } from "@/lib/bomParser";

/*
 * Reads a panel cost sheet ("SWITCHBOARD/PANEL NAME ... FEEDER NAME ... BOQDESCRIPTION |
 * MAKE | CATALOG NUMBER | PRICE | QTY | TOTAL QTY ...") into panels, feeders and items.
 *
 * Nothing is read by fixed position: labels are found by name anywhere in a row, so columns
 * can move and one sheet (or one sheet per panel) can hold several panels. Prices, discounts,
 * costs and the fabrication / busbar / wire / labour sections are never read.
 */

export type CostItem = {
  key: string;
  description: string;
  make: string;
  catalog: string;
  unit: string;
  /** Quantity for the whole order: total feeder quantity × number of boards. */
  qty: number;
  qtyPerFeeder: number;
  consumable: boolean;
};

export type CostFeeder = { name: string; qty: number; items: CostItem[] };
export type CostPanel = { name: string; boardQty: number; sheet: string; feeders: CostFeeder[] };
export type CostSheet = { panels: CostPanel[] };

const norm = (value: unknown) =>
  cellText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const PANEL_LABEL = /^(SWITCHBOARD|PANEL|BOARD)(PANEL)?NAME$|^SWITCHBOARDPANELNAME$|^PANELNAME$/;
const BOARD_QTY = /^(BOARD|PANEL|SWITCHBOARD)QTY$|^(BOARD|PANEL)QUANTITY$|^NOOFPANELS?$/;
const FEEDER_LABEL = /^FEEDERNAME$|^FEEDER$/;
const FEEDER_QTY = /^FEEDERQTY$|^FEEDERQUANTITY$|^NOOFFEEDERS?$/;

const DESC = /^(BOQ)?DESCRIPTION$|^ITEMDESCRIPTION$|^BOQDESC$|^ITEM$|^PARTICULARS$/;
const MAKE = /^MAKE$|^BRAND$|^MANUFACTURER$/;
const CATALOG = /^CATALOG(UE)?(NUMBER|NO)?$|^CATNO$|^PARTNO$|^PARTNUMBER$|^MODEL(NO)?$|^ORDERCODE$/;
const QTY = /^QTY$|^QUANTITY$|^QTYPERFEEDER$/;
const TOTAL_QTY = /^TOTALQTY$|^TOTALQUANTITY$|^TQTY$/;
const UNIT = /^UNIT$|^UOM$/;

// Rows that end an item list: totals and the costing / fabrication blocks under it.
const STOP_ROW =
  /^TOTAL|FABRICATION|BUSBAR|WIREDETAILS|WIRECOST|MISCDETAILS|LABOU?R|OVERHEAD|FINAL(SWITCHBOARD|PANEL)|RAWMATERIAL/;
const CONSUMABLE =
  /\b(pvc|wiring|wirings|wires?|ferrul\w*|lugs?|hardware|consumables?|accessories|misc\w*|sleeves?|cable ties?|glands? kit)\b/i;

function numberIn(value: unknown) {
  const n = Number(cellText(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

// The value of a "LABEL | value" pair: the first filled cell to the right of the label,
// or to its left when the sheet is laid out the other way round.
function valueAfter(row: unknown[], index: number, wantNumber = false): string | number {
  const right = valueOnSide(row, index, 1, wantNumber);
  if (wantNumber ? Number.isFinite(right) : right) return right;
  return valueOnSide(row, index, -1, wantNumber);
}

function valueOnSide(row: unknown[], index: number, step: 1 | -1, wantNumber: boolean) {
  for (let i = index + step; i >= 0 && i < row.length; i += step) {
    const text = cellText(row[i]);
    if (!text) continue;
    if (wantNumber) {
      const n = numberIn(text);
      if (Number.isFinite(n)) return n;
      continue;
    }
    // Skip a neighbouring label such as "BOARD QTY".
    if (BOARD_QTY.test(norm(text)) || FEEDER_QTY.test(norm(text))) return "";
    return text;
  }
  return wantNumber ? NaN : "";
}

type Columns = {
  desc: number;
  make?: number;
  catalog?: number;
  qty?: number;
  totalQty?: number;
  unit?: number;
};

function headerColumns(row: unknown[]): Columns | null {
  const cols: Partial<Columns> = {};
  row.forEach((cell, index) => {
    const key = norm(cell);
    if (!key) return;
    if (cols.desc === undefined && DESC.test(key)) cols.desc = index;
    else if (cols.make === undefined && MAKE.test(key)) cols.make = index;
    else if (cols.catalog === undefined && CATALOG.test(key)) cols.catalog = index;
    else if (cols.totalQty === undefined && TOTAL_QTY.test(key)) cols.totalQty = index;
    else if (cols.qty === undefined && QTY.test(key)) cols.qty = index;
    else if (cols.unit === undefined && UNIT.test(key)) cols.unit = index;
  });
  const hasQty = cols.qty !== undefined || cols.totalQty !== undefined;
  const hasIdentity = cols.make !== undefined || cols.catalog !== undefined;
  return cols.desc !== undefined && hasQty && hasIdentity ? (cols as Columns) : null;
}

// "�." and "-" mean "no catalogue number".
function cleanCode(text: string) {
  return /[a-z0-9]/i.test(text) ? text.trim() : "";
}

export function parseCostSheet(sheets: SheetData[]): CostSheet {
  const panels: CostPanel[] = [];
  let counter = 0;

  for (const sheet of sheets) {
    let panel: CostPanel | null = null;
    let feeder: CostFeeder | null = null;
    let columns: Columns | null = null;

    const ensurePanel = () => {
      if (!panel) {
        panel = { name: sheet.name.trim() || "Panel", boardQty: 1, sheet: sheet.name, feeders: [] };
        panels.push(panel);
      }
      return panel;
    };
    const ensureFeeder = () => {
      const current = ensurePanel();
      if (!feeder) {
        feeder = { name: "", qty: 1, items: [] };
        current.feeders.push(feeder);
      }
      return feeder;
    };

    for (const row of sheet.rows) {
      const keys = row.map(norm);
      if (!keys.some(Boolean)) continue;

      const panelAt = keys.findIndex((k) => PANEL_LABEL.test(k));
      if (panelAt >= 0) {
        const qtyAt = keys.findIndex((k) => BOARD_QTY.test(k));
        const boardQty = qtyAt >= 0 ? numberIn(valueAfter(row, qtyAt, true)) : NaN;
        panel = {
          name: String(valueAfter(row, panelAt)) || sheet.name,
          boardQty: Number.isFinite(boardQty) && boardQty > 0 ? boardQty : 1,
          sheet: sheet.name,
          feeders: [],
        };
        panels.push(panel);
        feeder = null;
        columns = null;
        continue;
      }

      const feederAt = keys.findIndex((k) => FEEDER_LABEL.test(k));
      if (feederAt >= 0) {
        const qtyAt = keys.findIndex((k) => FEEDER_QTY.test(k));
        const qty = qtyAt >= 0 ? numberIn(valueAfter(row, qtyAt, true)) : NaN;
        feeder = {
          name: String(valueAfter(row, feederAt)),
          qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
          items: [],
        };
        ensurePanel().feeders.push(feeder);
        columns = null;
        continue;
      }

      const header = headerColumns(row);
      if (header) {
        columns = header;
        continue;
      }
      if (!columns) continue;

      const description = cellText(row[columns.desc]);
      if (!description || /^n\/?a$/i.test(description)) continue;
      // A different table (fabrication, busbar, totals) ends the item list.
      if (STOP_ROW.test(norm(description)) || keys.filter(Boolean).every((k) => k === "NA")) {
        columns = null;
        continue;
      }

      const current = ensureFeeder();
      const perFeeder = columns.qty !== undefined ? numberIn(row[columns.qty]) : NaN;
      const total = columns.totalQty !== undefined ? numberIn(row[columns.totalQty]) : NaN;
      const feederTotal = Number.isFinite(total)
        ? total
        : Number.isFinite(perFeeder)
          ? perFeeder * current.qty
          : NaN;
      if (!Number.isFinite(feederTotal)) continue;

      const make = columns.make !== undefined ? cellText(row[columns.make]) : "";
      current.items.push({
        key: `i${counter++}`,
        description,
        make: /^n\/?a$/i.test(make) ? "" : make,
        catalog: columns.catalog !== undefined ? cleanCode(cellText(row[columns.catalog])) : "",
        unit: (columns.unit !== undefined && cellText(row[columns.unit])) || "Nos",
        qty: feederTotal * ensurePanel().boardQty,
        qtyPerFeeder: Number.isFinite(perFeeder) ? perFeeder : feederTotal / current.qty,
        consumable: CONSUMABLE.test(description),
      });
    }
  }

  // Drop empty feeders and panels (a title block with no item list under it).
  const kept = panels
    .map((p) => ({ ...p, feeders: p.feeders.filter((f) => f.items.length) }))
    .filter((p) => p.feeders.length);
  return { panels: kept };
}

export function costSheetItemCount(sheet: CostSheet) {
  return sheet.panels.reduce(
    (sum, p) => sum + p.feeders.reduce((s, f) => s + f.items.length, 0),
    0,
  );
}

/** Items as BOM rows for Material Procurement, one per panel and feeder. */
export function costSheetToItems(sheet: CostSheet, skip: Set<string>): ImportedItem[] {
  const items: ImportedItem[] = [];
  for (const panel of sheet.panels) {
    for (const feeder of panel.feeders) {
      for (const item of feeder.items) {
        if (skip.has(item.key)) continue;
        items.push({
          itemName: item.description,
          category: item.consumable ? "Consumables" : feeder.name,
          make: item.make,
          model: item.catalog,
          specification: "",
          unit: item.unit,
          qtyRequired: item.qty,
          notes:
            feeder.qty > 1 || panel.boardQty > 1
              ? `${item.qtyPerFeeder} per feeder × ${feeder.qty} feeder${feeder.qty === 1 ? "" : "s"}${panel.boardQty > 1 ? ` × ${panel.boardQty} boards` : ""}`
              : "",
          qtyMissing: false,
          sheet: panel.sheet,
          panel: panel.name,
          consumable: item.consumable,
        });
      }
    }
  }
  return items;
}
