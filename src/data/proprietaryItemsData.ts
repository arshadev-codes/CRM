import type { SystemType } from "@/data/systemTypesData";

export interface ProprietaryItem {
  id: string;
  title: string;
  description: string;
  /** Which system types show this item. Empty array = show for all. */
  systemTypes: SystemType[];
  /**
   * If true, this item (when selected) appears as its own row in the
   * Scope of Supply table/PDF with an editable unit price + qty. Only
   * Power Panel and LV Test Trolley are flagged this way — every other
   * proprietary item, when selected, instead appears in Scope of
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
    id: "power-panel",
    title: "Power Panel",
    description:
      "Main power distribution and control panel supplying regulated HV and LV feeds to all test stations. Includes MCBs, contactors, energy meters, surge protection, and interlocked emergency-stop provisions.",
    systemTypes: [],
    inScopeOfSupply: true,
    scopeSummary:
      "Centralized power distribution and control panel feeding regulated supply to the complete test setup.",
  },
  {
    id: "lv-trolley",
    title: "LV Test Trolley",
    description:
      "Motorised low-voltage test trolley for manoeuvring and connecting large power transformers at the test bay. Features adjustable clamping arms, cable reels, and a locking mechanism rated for safe handling of transformers up to the specified MVA rating.",
    systemTypes: [],
    inScopeOfSupply: true,
    scopeSummary:
      "Mobile trolley assembly for safely positioning and connecting the transformer during low-voltage testing.",
  },
  {
    id: "report-sw",
    title: "Report Software",
    description:
      "Dedicated test-report generation software with auto-population of measured values, tolerance checks, and formatted output compliant with IEC 60076 reporting requirements. Supports PDF, Excel, and XML export formats.",
    systemTypes: [],
    scopeSummary: "Supply of dedicated test-report generation software with automated, IEC-compliant output.",
  },
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