import type { SystemType } from "./systemTypesData";

export interface Subsystem {
  id: string; title: string; preview: string;
  description: string; image?: string;
  systemTypes: SystemType[];
}

const allTypes: SystemType[] = ["Advanced","FullyAutomatic","SemiAutomatic","Conventional"];

export const subsystemsData: Subsystem[] = [
  { id: "control-desk", title: "Control Desk", preview: "Operator console with HMI and emergency controls",
    description: "Ergonomic operator control desk with dual 24\" HMI displays, mimic panel, emergency stop, mode selector, and integrated voice communication. Houses primary control PC and SCADA workstation.", systemTypes: allTypes },
  { id: "power-panel", title: "Power Panel", preview: "MV/LV distribution with VFDs and protection",
    description: "Floor-mounted power distribution panel with incomer, outgoing feeders, VFD bank for MG set control, capacitor switching contactors, microprocessor relays, and full protection suite per IEC 61439.", systemTypes: allTypes },
  { id: "scada", title: "SCADA System", preview: "Real-time supervision and data logging",
    description: "Industrial SCADA platform with real-time data acquisition, alarm management, historical trending, and OPC-UA integration. Stores all test data in time-series DB with role-based access.", systemTypes: ["Advanced","FullyAutomatic"] },
  { id: "plc", title: "PLC System", preview: "Redundant PLC controller with safety I/O",
    description: "Siemens S7-1500 redundant PLC system with safety-rated I/O modules, distributed I/O over PROFINET, and integrated TIA Portal engineering. Manages all sequencing and interlocks.", systemTypes: ["Advanced","FullyAutomatic"] },
  { id: "hv-switching", title: "HV Switching", preview: "Motorized HV connection switchyard",
    description: "Outdoor/indoor HV switching arrangement with motorized disconnectors, earthing switches, surge arresters, and CT/PT for metering. Fully interlocked with control system.", systemTypes: allTypes },
  { id: "ct-pt-rack", title: "CT/PT Rack", preview: "Metering CT and PT rack assembly",
    description: "Modular CT/PT rack housing precision metering current and voltage transformers with secondary wiring, test blocks, and short-circuiting links. Calibrated and certified.", systemTypes: allTypes },
  { id: "lv-trolley", title: "LV Test Trolley", preview: "Mobile LV connection trolley",
    description: "Mobile LV test trolley with automated cable handling, pneumatic clamping, motorized positioning, and integrated CTs. Reduces test setup time by 60%.", systemTypes: ["Advanced","FullyAutomatic"] },
  { id: "safety", title: "Safety System", preview: "SIL-2 interlock and access control",
    description: "SIL-2 rated safety system with light curtains, door interlocks, emergency stops, two-hand controls, and grounding interlocks. Fail-safe design per IEC 61508.", systemTypes: allTypes },
  { id: "busbar", title: "Busbar System", preview: "Insulated copper busbar distribution",
    description: "Air-insulated copper busbar system rated for full test current, with expansion joints, support insulators, and access platforms. Designed for short-circuit withstand.", systemTypes: ["Advanced"] },
  { id: "cable-mgmt", title: "Cable Management", preview: "Cable trays and routing infrastructure",
    description: "Galvanized cable tray system with separate trays for power, control, and signal cables. Includes ladder racks, conduits, junction boxes, and proper segregation per IEEE 422.", systemTypes: ["Advanced"] },
  { id: "report-sw", title: "Report Generation Software", preview: "Automated test report engine",
    description: "Electrosoft Report Generator with customizable templates, automatic data import from instruments, statistical analysis, and PDF/Excel export. Supports multi-language reports.", systemTypes: ["Advanced","FullyAutomatic","SemiAutomatic"] },
];
