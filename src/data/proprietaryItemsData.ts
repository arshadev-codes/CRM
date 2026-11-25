import type { SystemType } from "@/data/systemTypesData";

export interface ProprietaryItem {
  id: string;
  title: string;
  description: string;
  /** Which system types show this item. Empty array = show for all. */
  systemTypes: SystemType[];
  /**
   * If true, this item (when selected) appears as its own row in the
   * Scope of Supply table/PDF with an editable unit price + qty (none of the
   * built-in items: Power Panel and LV Test Trolley are Major Subsystems now).
   * Every other proprietary item, when selected, appears in Scope of
   * Services (on-site table) with a single direct price, no qty.
   */
  inScopeOfSupply?: boolean;
  /**
   * One-line sentence shown in place of the short library title whenever
   * this item appears in a formal table (Scope of Supply or Scope of
   * Services). User picks the one-word item in the wizard; this is the
   * full sentence that prints.
   */
  scopeSummary?: string;
}

export const proprietaryItemsData: ProprietaryItem[] = [
  {
    id: "commissioning",
    title: "Commissioning",
    description:
      "On-site commissioning service covering installation verification, functional checkout of all subsystems, calibration confirmation, safety interlock testing, and formal handover with signed commissioning checklist.",
    systemTypes: [],
    scopeSummary: "On-site commissioning of the complete system with formal checklist-based handover.",
  },
  {
    id: "training",
    title: "Training",
    description:
      "Structured operator and maintenance training programme covering system operation, test procedure execution, safety protocols, routine maintenance, and basic troubleshooting. Conducted at the customer's site after commissioning.",
    systemTypes: [],
    scopeSummary: "Structured operator and maintenance training programme conducted at the customer's site.",
  },
  {
    id: "documentation",
    title: "Documentation",
    description:
      "Comprehensive documentation package including system architecture drawings, electrical schematics, operation and maintenance manuals, calibration certificates, and spare-parts list — supplied in both hard copy and digital formats.",
    systemTypes: [],
    scopeSummary: "Complete documentation package covering drawings, manuals, certificates and spares list.",
  },
  {
    id: "additional-warranty",
    title: "Additional Warranty",
    description:
      "Extended warranty coverage beyond the standard 12-month warranty period, for added assurance on critical system components.",
    systemTypes: [],
    // scopeSummary intentionally omitted — generated dynamically with the
    // selected number of months (see scopeOfServiceRows.ts).
  },
];