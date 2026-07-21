import type { Project } from "@/store/proposalStore";
import { proprietaryItemsData } from "@/data/proprietaryItemsData";

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
export function getOnSiteServiceRows(project: Project): ServiceRow[] {
  const selected = new Set(project.data.proprietary);
  const rows: ServiceRow[] = [];

  proprietaryItemsData
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
      const text = `${p.title} ${p.scopeSummary ?? p.description ?? ""}`;
      if (EXCLUDED_FROM_ONSITE.test(text)) return; // skip software / documentation entries
      rows.push({ key: p.id, description: p.scopeSummary ?? p.description });
    });

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