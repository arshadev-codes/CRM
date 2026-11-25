import type { Project, PriceEntry } from "@/store/proposalStore";
import type { ProprietaryItem } from "@/data/proprietaryItemsData";
import { getMajorSubsystems, isPricedInScopeOfSupply, quotationSubsystems, resolveSubsystemTitle, type SubsystemContent } from "@/data/proposalContent";
import { getOnSiteServiceRows, type ServiceRow } from "@/data/scopeOfServiceRows";
import { getEntry } from "@/data/pricingHelpers";

// One place that says which rows a quotation prices and what they add up to.
// The Pricing step, the PDF tables and the Commercial Terms total all use it,
// so a price typed for an item that was later unticked never counts.

const lineInr = (e: PriceEntry | undefined) => (Number(e?.unitPrice) || 0) * (Number(e?.qty) || 0);

/** Price filled in from the Installation dialog (Proprietary step) until one is typed in Pricing. */
export function installationDefaultPrice(project: Project): number | null {
  const d = project.data;
  if (!d.installationType) return null;
  const ip = d.installationPricing;
  if (!ip || ip.pricingType === "inclusive") return null;
  if (d.installationType === "full" && ip.lumpSum) return Number(ip.lumpSum) || null;
  if (d.installationType === "supervision" && ip.days && ip.perDayCost) return Number(ip.days) * Number(ip.perDayCost) || null;
  return null;
}

export interface SupplyRow {
  key: string;
  title: string;
  /** Second line in the PDF table. */
  summary: string;
}

/**
 * Scope of Supply rows: the ticked Major Subsystems priced here (items priced
 * as equipment are left out; "pricing only" items are in), then any proprietary
 * item flagged "Print under Scope of Supply".
 */
export function supplyRows(project: Project, cmsOverrides: Record<string, unknown>, proprietary: ProprietaryItem[]): SupplyRow[] {
  const all: SubsystemContent[] = getMajorSubsystems(project.data.systemType, cmsOverrides);
  const variants = project.data.subsystemVariants ?? {};
  const subs = quotationSubsystems(all, project.data)
    .filter(s => isPricedInScopeOfSupply(s.id))
    .map(s => ({ key: s.id, title: resolveSubsystemTitle(s, variants), summary: s.preview ?? "" }));
  const selected = new Set(project.data.proprietary);
  const props = proprietary
    .filter(p => p.inScopeOfSupply && selected.has(p.id))
    .map(p => ({ key: p.id, title: p.title, summary: p.scopeSummary || p.description }));
  return [...subs, ...props];
}

/** Rows that have a name (an "own" row left empty is not printed or priced). */
export const namedInstruments = (project: Project) =>
  (project.data.instruments ?? []).filter(
    i => i.included !== false && (String(i.instrument ?? "").trim() || String(i.model ?? "").trim()),
  );
export const namedEquipment = (project: Project) =>
  (project.data.equipment ?? []).filter(e => e.included && String(e.equipment ?? "").trim());

/** Price of an on-site service row: typed in Pricing, else the installation default. */
export function servicePriceInr(project: Project, key: string): number {
  const typed = project.data.pricing?.scopeOfServices?.[key];
  if (typed !== undefined && typed !== "") return Number(typed) || 0;
  return key === "installation" ? installationDefaultPrice(project) ?? 0 : 0;
}

export interface QuotationTotals {
  supply: number;
  instruments: number;
  equipment: number;
  services: number;
  serviceRows: ServiceRow[];
}

export function quotationTotals(project: Project, cmsOverrides: Record<string, unknown>, proprietary: ProprietaryItem[]): QuotationTotals {
  const p = project.data.pricing;
  const serviceRows = getOnSiteServiceRows(project, proprietary);
  return {
    supply: supplyRows(project, cmsOverrides, proprietary).reduce((s, r) => s + lineInr(getEntry(p?.scopeOfSupply, r.key)), 0),
    instruments: namedInstruments(project).reduce((s, r) => s + lineInr(getEntry(p?.instruments, r.id)), 0),
    equipment: namedEquipment(project).reduce((s, r) => s + lineInr(getEntry(p?.equipment, r.id)), 0),
    services: serviceRows.reduce((s, r) => s + servicePriceInr(project, r.key), 0),
    serviceRows,
  };
}
