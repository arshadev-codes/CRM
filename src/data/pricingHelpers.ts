import type { PriceEntry } from "@/store/proposalStore";
import type { Money } from "@/data/currency";

export function getEntry(map: Record<string, PriceEntry> | undefined, key: string): PriceEntry {
  return map?.[key] ?? { unitPrice: "", qty: "1" };
}

export function formatINR(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

/** Derived line total — never stored, always computed from unitPrice × qty. */
export function lineTotal(entry: PriceEntry | undefined, money?: Money): string {
  const unit = Number(entry?.unitPrice);
  const qty = Number(entry?.qty);
  if (!entry?.unitPrice || Number.isNaN(unit) || !entry?.qty || Number.isNaN(qty)) return "---";
  return money ? money.fromInr(unit * qty) : formatINR(unit * qty);
}