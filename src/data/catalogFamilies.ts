// Groups library items into families, so the wizard's "Add from list" dialog can
// show variants of the same thing together (e.g. every HV Transformer rating
// under one "HV Transformer" heading).
//
// How an item's family is decided (first match wins):
//   1. the item's own `family` field (set in Settings → Equipment / Instruments)
//   2. the lists below, by item id
//   3. otherwise the item is its own one-item family, named after the item
//
// Kept apart from equipmentData.ts / instrumentsData.ts so adding rows there
// never conflicts with grouping changes here. When you add a new variant to the
// data, add its id to the matching family below.

export const EQUIPMENT_FAMILIES: Record<string, string[]> = {
  "HT Capacitor Bank": [
    "ht-cap",
    "ht-cap-10mvar",
    "ht-cap-4mvar",
    "ht-cap-24mvar",
    "ht-cap-166kvar",
    "ht-cap-31mvar",
  ],
  "LT Capacitor Bank": [
    "lt-cap",
    "lt-cap-600kvar",
    "lt-cap-1500kvar",
    "lt-cap-700kvar",
    "lt-cap-4000kvar",
    "lt-cap-6mvar-600v",
  ],
  "LT Capacitor Panel": ["lt-cap-panel", "lt-cap-panel-625kvar", "lt-cap-panel-6000kvar"],
  "Capacitor Unit / Rack": ["cap-unit-170kvar", "cap-rack"],
  "Main MG Set": [
    "mg-set",
    "mg-500kva",
    "mg-100kva-200hz",
    "mg-20kva-150hz",
    "mg-150kva",
    "mg-800kva",
    "mg-30kva",
    "mg-main-2mva",
  ],
  "MG Set for IOVT": ["mg-iovt", "mg-iovt-1mva"],
  CT: [
    "ct-1",
    "ct-2",
    "ct-3",
    "ct-1000-5",
    "ct-multi-600",
    "ct-multi-100",
    "ct-200-5",
    "ct-200-100-5",
    "ct-50-5",
    "ct-5-20-5",
    "ct-75-300-5",
    "ct-10-100-tap",
    "ct-2-5-15-1a",
  ],
  "NLL / LL CT": ["ct-nll", "ct-ll", "ct-nll-1a-100", "ct-nll-1a-800"],
  "132 kV CT": ["ct-132kv-50a", "ct-132kv-1000a", "ct-132kv-2500a"],
  PT: [
    "pt-1",
    "pt-2",
    "pt-3",
    "pt-multi-12kv",
    "pt-multi-33kv",
    "pt-multi-3kv",
    "pt-11kv-110",
    "pt-3300-1100",
    "pt-c01-3kv",
    "pt-c01-11kv",
    "pt-660-3300-tap",
    "pt-1-1-6-6kv",
    "pt-11kv-tap-c01",
  ],
  "NLL / LL PT": ["pt-nll", "pt-ll", "pt-nll-2kv", "pt-nll-6kv", "pt-nll-96kv"],
  "132 kV PT": ["pt-132kv-33kv", "pt-132kv-132kv"],
  "Primary Sensing": ["primary-sensing-kv"],
  "HV Transformer": [
    "hv-trans",
    "hv-300kv-1000ma",
    "hv-150kv-300ma",
    "hv-75kv-300ma",
    "hv-100kv-500ma",
    "hv-500kv-1000ma",
    "hv-80kv-300ma",
  ],
  "HV Tester": ["hv-tester-75kv", "hv-tester-3-5kv"],
  "Intermediate Transformer": [
    "intermediate-trafo-100kva", "intermediate-trafo-2-4mva", "booster", "booster-500kva", "booster-100kva",
  ],
  "3-Phase Transformer": ["trafo-150kva-3ph"],
  "Current Injection Transformer": ["current-injection-3000a"],
  "Dimmer / Voltage Regulator": [
    "dimmer",
    "dimmer-900a",
    "dimmer-600a",
    "dimmer-250a",
    "dimmer-100a",
    "dimmer-800a",
    "dimmer-1200a",
    "dimmer-2000a",
    "dimmer-150a",
  ],
  "Independent Dimmer": ["ind-dimmer", "ind-dimmer-800a-hv"],
  "Test Source": ["current-source-25kva", "source-ac-1000v", "source-dc-1000v"],
  "HT Isolator": [
    "ht-isolator-cap-800a",
    "ht-isolator-cap-manual",
    "ht-isolator-trh",
    "ht-isolator-trh-33kv",
    "ht-isolator-trh-220kv",
    "ht-isolator-trh-800a-36kv",
    "ht-isolator-cap-2000a-33kv",
    "ht-isolator-cap-1200a-36kv",
    "ht-isolator-cap-1600a-145kv",
    "isolator-hv-test-motorized",
  ],
  "Knife Switch": [
    "knife-switch-ctpt",
    "knife-switch-ctpt-pneumatic",
    "knife-switch-pneumatic-900a",
  ],
  "CT/PT Rack": ["ct-pt-rack"],
  "Temperature Sensing": ["rtd-pt100", "scanner"],
  "RTD Junction Box": [
    "rtd-jb-48ch-15mva",
    "rtd-jb-48ch-5mva",
    "rtd-jb-32ch-15mva",
    "rtd-jb-40mva",
    "rtd-jb-12-5mva",
    "rtd-jb-48ch-7-5mva",
    "rtd-jb-48ch-1mva",
  ],
  "HV Test Leads": ["hv-test-leads"],
  "Test Bench / Console": ["test-bench-conv", "test-bench-auto-43", "test-console-scada-40"],
  "LV Test Trolley": ["lv-trolley", "lv-trolley-auto"],
  "Control Desk": ["control-desk-pa", "control-desk-basic", "control-desk-scada"],
  Software: ["xmer-edge-software", "report-software-pc"],
  "Power Panel": ["power-panel", "control-power-panel", "automation-power-panel-lv"],
  "PLC / Automation Panel": [
    "machine-room-panel-siemens",
    "control-room-panel-schneider",
    "plc-main",
    "rio-panel",
    "plc-automation",
  ],
  "Fibre Optic": ["fo-cable-kit", "fo-cable", "media-converter"],
  "Generator Control Panel": ["gen-panel"],
  "Excitation Panel": [
    "excit-1mva",
    "excit-2mva",
    "excit-5mva",
    "excit-6mva",
    "excit-12-5mva",
    "excit-15mva",
    "excit-40mva",
    "excit-170vdc",
    "ct-pt-excit-panel",
  ],
  "Generator Protection Panel": [
    "gen-prot-1mva",
    "gen-prot-2mva",
    "gen-prot-2mva-60hz",
    "gen-prot-2-5mva-3ph",
    "gen-prot-2-5mva-1ph",
    "gen-prot-6mva",
    "gen-prot-7-5mva",
    "gen-prot-15mva",
  ],
  "Transformer Protection Panel": [
    "trafo-prot-6-6kv",
    "trafo-prot-11kv-60hz",
    "trafo-prot-11kv-200hz",
  ],
  "VCB / Switching Panel": [
    "vcb-panel-ab",
    "vcb-panel-1",
    "vcb-panel-2",
    "incomer-dual-outgoing",
    "changeover-panel",
    "changeover-panel-two-winding",
  ],
  "Bus Bar Section": ["busbar-1600a", "busbar-600a"],
  "LT / MCC / Distribution Panel": [
    "lt-dist-panel",
    "lt-panel-dol",
    "lt-panel-vfd-220kw",
    "mcc-panel",
    "control-dist-panel",
  ],
  "CT-PT Selection Panel": ["ct-pt-selection-panel"],
  "NGR Panel": ["ngr-panel"],
  "Marshalling Box": ["marshalling-box"],
  "RTCC Panel": ["rtcc-panel"],
  UPS: ["ups-2kva-50hz", "ups-2kva-60hz", "ups-5kva-60hz"],
  "VFD / VVFC Panel": [
    "vvfc-690v-12p",
    "vvfc-690v-12p-lineup",
    "vvfc-415v-6p",
    "lineup-vfd-incomer",
    "lineup-vfd-outgoing",
    "vfd-30kw",
  ],
  "Local Push Button Station": ["lpbs"],
  "Breaker Testing Panel": ["breaker-testing-panel"],
  "Safety Interlock System": ["hv-safety-interlock"],
  "Flexible Cable": ["cable-16c-2-5", "cable-16c-1-5", "cable-8c-1-5"],
};

export const INSTRUMENT_FAMILIES: Record<string, string[]> = {
  "Power Analyzer": ["power-analyzer", "power-analyzer-wt333e", "power-analyzer-wt500"],
  "Voltage Ratio Meter": ["vrm", "vrm-motwane", "vrm-veer", "vrm-raytech"],
  "Winding Resistance Meter": ["wrm", "wrm-motwane", "wrm-rts", "wrm-raytech", "wrm-prestige"],
  "Insulation Resistance Meter": [
    "irm",
    "irm-megger-mit515",
    "irm-motwane-5kpi",
    "irm-metrel-rishab",
    "irm-5kv",
    "irm-3kv",
  ],
  "Impulse Tester": ["li-tester", "impulse-170kv", "impulse-1600kv", "impulse-8kv"],
  "Partial Discharge Meter": ["pd-meter"],
  "Capacitance & Tan Delta Meter": ["tan-delta", "tan-delta-megger-delta4000"],
  "Oil BDV Test Set": ["oil-bdv"],
  "Transformer Observing System": ["atos"],
  Scope: ["scope-adison"],
};

export type CatalogKind = "equipment" | "instruments";

const invert = (families: Record<string, string[]>) => {
  const byId = new Map<string, string>();
  for (const [family, ids] of Object.entries(families)) for (const id of ids) byId.set(id, family);
  return byId;
};

const FAMILY_BY_ID: Record<CatalogKind, Map<string, string>> = {
  equipment: invert(EQUIPMENT_FAMILIES),
  instruments: invert(INSTRUMENT_FAMILIES),
};

const NAME_KEY: Record<CatalogKind, string> = { equipment: "equipment", instruments: "instrument" };

/** The family a library item belongs to (see the rules at the top of this file). */
export function familyOf(kind: CatalogKind, item: { id: string; family?: string }): string {
  const own = typeof item.family === "string" ? item.family.trim() : "";
  if (own) return own;
  const name = (item as unknown as Record<string, unknown>)[NAME_KEY[kind]];
  return FAMILY_BY_ID[kind].get(item.id) ?? String(name ?? "Other");
}
