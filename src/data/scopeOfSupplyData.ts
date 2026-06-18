export interface ScopeItem { id: string; title: string; description?: string; defaultIncluded?: boolean; }
export const scopeOfSupplyData: ScopeItem[] = [
  { id: "test-bench", title: "Advanced Transformer Test Bench", defaultIncluded: true },
  { id: "power-panel", title: "Power Distribution Panel", defaultIncluded: true },
  { id: "lv-trolley", title: "LV Test Trolley", defaultIncluded: true },
  { id: "control-desk", title: "Operator Control Desk", defaultIncluded: true },
  { id: "scada", title: "SCADA Workstation and Server", defaultIncluded: true },
  { id: "report-sw", title: "Report Generation Software License", defaultIncluded: true },
  { id: "instruments", title: "Calibrated Test Instruments (as per list)", defaultIncluded: true },
  { id: "cables", title: "Internal Power and Control Cables", defaultIncluded: true },
  { id: "earthing", title: "Earthing and Bonding Kit", defaultIncluded: true },
  { id: "docs", title: "Technical Documentation Set (5 copies)", defaultIncluded: true },
];
