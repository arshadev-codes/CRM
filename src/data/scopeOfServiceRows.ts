import type { Project } from "@/store/proposalStore";
import { proprietaryItemsData, type ProprietaryItem } from "@/data/proprietaryItemsData";

export interface ServiceRow {
  key: string;
  description: string;
}

// Proprietary items whose text matches this pattern are excluded from the
// on-site Scope of Services table entirely — even if selected in the
// Proprietary step. "Software" and "documentation" are shown/handled
// elsewhere in the proposal and shouldn't appear as a priced on-site line.
const EXCLUDED_FROM_ONSITE = /dedicated .*software|report generation software|documentation package|complete documentation/i;

/**
 * Builds the on-site Scope of Services rows:
 *   - every selected proprietary item EXCEPT the two flagged
 *     inScopeOfSupply (Power Panel, LV Test Trolley), AND except anything
 *     matching EXCLUDED_FROM_ONSITE above
 *   - "Additional Warranty" renders dynamically with the chosen month count
 *     (and is skipped entirely if selected but no month count was set)
 *   - Installation (full or supervision), if selected
 */
const COMMISSIONING_KEY = "commissioning";
const TRAINING_KEY = "training";

/**
 * Service prices that count in the totals: when Commissioning and Training are
 * one row, a price typed earlier for Training alone is left out.
 */
export function countedServicePrices(project: Project, prices: Record<string, string> = {}): Record<string, string> {
  const selected = new Set(project.data.proprietary);
  if (!(selected.has(COMMISSIONING_KEY) && selected.has(TRAINING_KEY))) return prices;
  const { [TRAINING_KEY]: _training, ...rest } = prices;
  return rest;
}

export function getOnSiteServiceRows(project: Project, items: ProprietaryItem[] = proprietaryItemsData): ServiceRow[] {
  const selected = new Set(project.data.proprietary);
  const rows: ServiceRow[] = [];

  items
    .filter((p) => !p.inScopeOfSupply && selected.has(p.id))
    .forEach((p) => {
      if (p.id === "additional-warranty") {
        const months = project.data.additionalWarrantyMonths;
        if (months && months > 0) {
          rows.push({
            key: p.id,
            description: `Additional warranty of ${months} month${months === 1 ? "" : "s"} over and above the standard 12-month coverage.`,
          });
        }
        return;
      }
      const text = `${p.title} ${p.scopeSummary || p.description || ""}`;
      if (EXCLUDED_FROM_ONSITE.test(text)) return; // skip software / documentation entries
      rows.push({ key: p.id, description: p.scopeSummary || p.description });
    });

  // Commissioning and Training are priced together: one row, under the commissioning price.
  const commissioning = rows.find((r) => r.key === COMMISSIONING_KEY);
  const training = rows.find((r) => r.key === TRAINING_KEY);
  if (commissioning && training) {
    commissioning.description = `${commissioning.description.trim()} ${training.description.trim()}`;
    rows.splice(rows.indexOf(training), 1);
  }

  if (project.data.installationType) {
    rows.push({
      key: "installation",
      description:
        project.data.installationType === "full"
          ? "Full Installation — complete on-site installation of all supplied equipment and subsystems by Electrosoft's certified engineers."
          : "Supervision of Installation — Electrosoft's engineers supervise the customer's team during installation, providing technical guidance and sign-off.",
    });
  }

  return rows;
}