/**
 * Offer number format:  Q{seq3}/{FY}/{CompanyShort}/TTS/R{rev}
 * Example: Q001/2025-26/Neo/TTS/R0
 */

export function getFY(dateISO: string): string {
  const d = new Date(dateISO || new Date().toISOString());
  const y = d.getFullYear();
  const m = d.getMonth() + 1; // 1..12
  // Indian fiscal year: April → March
  const startYear = m >= 4 ? y : y - 1;
  const endShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endShort}`;
}

export function slugCompany(name: string): string {
  const clean = (name || "").trim();
  if (!clean) return "XXX";
  // Take first "word" (letters/digits), capitalize first letter, keep rest lower.
  const first = clean.split(/[\s\-_/\\]+/)[0].replace(/[^A-Za-z0-9]/g, "");
  if (!first) return "XXX";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export function pad3(n: number): string {
  return String(Math.max(0, n)).padStart(3, "0");
}

export function buildOfferNumber(opts: {
  seq: number;
  fy: string;
  companyShort: string;
  revision: number;
}): string {
  return `Q${pad3(opts.seq)}/${opts.fy}/${slugCompany(opts.companyShort)}/TTS/R${opts.revision}`;
}

export function buildOfferBase(opts: {
  seq: number;
  fy: string;
  companyShort: string;
}): string {
  return `Q${pad3(opts.seq)}/${opts.fy}/${slugCompany(opts.companyShort)}/TTS`;
}
