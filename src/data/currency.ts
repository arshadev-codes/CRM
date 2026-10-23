// Quotation currency. Prices are always typed in INR; when a quotation is set
// to another currency, the PDF shows every price divided by the saved rate
// (rupees per 1 unit of that currency). The rate is saved with the quotation,
// so a PDF printed later shows the same numbers.

export interface CurrencyInfo { code: string; name: string; symbol: string }

export const CURRENCIES: CurrencyInfo[] = [
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "AED", name: "UAE Dirham", symbol: "AED " },
  { code: "SAR", name: "Saudi Riyal", symbol: "SAR " },
  { code: "QAR", name: "Qatari Riyal", symbol: "QAR " },
  { code: "OMR", name: "Omani Rial", symbol: "OMR " },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KWD " },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BHD " },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF " },
];

export const currencyInfo = (code: string): CurrencyInfo =>
  CURRENCIES.find(c => c.code === code) ?? { code, name: code, symbol: `${code} ` };

/** Saved on the quotation. rate = rupees for 1 unit of `code`. */
export interface QuoteCurrency { code: string; rate: number }

export interface Money {
  code: string;
  /** Rupee amount → text in the quotation currency, e.g. "$12,500". */
  fromInr: (inr: number) => string;
  /** Amount already in the quotation currency → text. */
  format: (amount: number) => string;
}

export function makeMoney(c?: QuoteCurrency): Money {
  if (!c || c.code === "INR" || !(c.rate > 0)) {
    const format = (n: number) => `₹${n.toLocaleString("en-IN")}`;
    return { code: "INR", fromInr: format, format };
  }
  const { symbol } = currencyInfo(c.code);
  const format = (n: number) => `${symbol}${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  // Each line is rounded to whole units so the rows add up to the printed total.
  return { code: c.code, fromInr: inr => format(Math.round(inr / c.rate)), format };
}

/**
 * Today's rates as rupees per 1 unit of each currency, from a free public
 * service (no key, nothing about the quotation is sent).
 */
export async function fetchInrRates(): Promise<{ rates: Record<string, number>; date: string }> {
  const res = await fetch("https://open.er-api.com/v6/latest/INR");
  if (!res.ok) throw new Error(`Rate service answered ${res.status}`);
  const body = await res.json() as { result?: string; rates?: Record<string, number>; time_last_update_utc?: string };
  if (body.result !== "success" || !body.rates) throw new Error("Rate service gave no rates");
  const rates: Record<string, number> = {};
  for (const { code } of CURRENCIES) {
    const perInr = body.rates[code];
    if (perInr > 0) rates[code] = 1 / perInr;
  }
  return { rates, date: body.time_last_update_utc ?? "" };
}
