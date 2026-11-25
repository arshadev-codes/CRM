export interface InstrumentRow {
  id: string; instrument: string; make: string; model: string;
  spec1: string; spec2: string; spec3: string; spec4: string; spec5: string;
  aliases?: string[];
  family?: string; // optional: groups variants in the wizard's picker (see catalogFamilies.ts)
  /** In a quotation: false = listed but not ticked (not printed or priced). Missing = ticked. */
  included?: boolean;
  /** In a quotation: listed by default for the system type (unticked until the user ticks it). */
  suggested?: boolean;
  /** In a quotation: the library item a row was added from. */
  sourceId?: string;
}

const i = (
  id: string, instrument: string, make: string, model: string,
  spec1 = "", spec2 = "", spec3 = "", spec4 = "", spec5 = "",
  aliases?: string[],
): InstrumentRow => ({ id, instrument, make, model, spec1, spec2, spec3, spec4, spec5, aliases });
 
export const instrumentsData: InstrumentRow[] = [
  // ---------- YOUR REFERENCE ROWS (unchanged) ----------
  { id: "power-analyzer", instrument: "Power Analyzer", make: "Yokogawa", model: "WT5000",
    spec1: "0.03% accuracy", spec2: "8 channels", spec3: "DC–10 MHz", spec4: "Harmonic up to 500th", spec5: "Touch display" },
  { id: "vrm", instrument: "Voltage Ratio Meter", make: "Electrosoft", model: "VRM-3000",
    spec1: "3-phase", spec2: "0.1% accuracy", spec3: "Auto tap detect", spec4: "USB/Ethernet", spec5: "PC software" },
  { id: "wrm", instrument: "Winding Resistance Meter", make: "Electrosoft", model: "WRM-50A",
    spec1: "50A DC", spec2: "0.1% accuracy", spec3: "Demag mode", spec4: "Dual channel", spec5: "Temp comp." },
  { id: "irm", instrument: "Insulation Resistance Meter", make: "Megger", model: "S1-5005",
    spec1: "5 kV", spec2: "5 TΩ range", spec3: "PI/DAR auto", spec4: "Memory storage", spec5: "BT download" },
  { id: "li-tester", instrument: "Lightning Impulse Tester", make: "Haefely", model: "SGSA-2400",
    spec1: "2400 kV", spec2: "240 kJ", spec3: "Multi-stage", spec4: "Digital recorder", spec5: "Full software" },
  { id: "pd-meter", instrument: "Partial Discharge Meter", make: "Omicron", model: "MPD 600",
    spec1: "0.1 pC res.", spec2: "Multi-channel", spec3: "FFT analysis", spec4: "PRPD plots", spec5: "IEC 60270" },
 
  // ---------- NEW (from quotations) ----------
  i("power-analyzer-wt333e", "Power Analyzer with Harmonics", "Yokogawa", "WT333E-C2-B-G5", "3-phase", "Harmonics", "", "", "", ["WT 333E-C2-B-G5", "WT333E-B-C2/C7/G5", "Power Analyzer Yokogawa Model 333E"]),
  i("vrm-motwane", "Voltage Ratio Meter", "Motwane", "XTRM 3A", "", "", "", "", "", ["Turn Ratio Meter: Motwane XTRM 3A"]),
  i("vrm-veer", "Voltage Ratio Meter", "Veer", "VTRM", "", "", "", "", "", ["VTRM - Veer"]),
  i("wrm-motwane", "Winding Resistance Meter 10A", "Motwane", "XWRM 10", "10 A", "", "", "", "", ["Resistance Meter, 10 Amp - Motwane"]),
  i("wrm-rts", "Resistance Meter 10A", "", "RTS", "10 A", "", "", "", "", ["Resistance Meter, 10 Amp - RTS"]), // verify make
  i("irm-megger-mit515", "Insulation Resistance Meter 5kV", "Megger", "MIT 515", "5 kV"),
  i("irm-motwane-5kpi", "Insulation Resistance Meter 5kV", "Motwane", "5KPi", "5 kV", "", "", "", "", ["IR Tester Motwane 5KPi"]),
  i("tan-delta", "Capacitance & Tan Delta Meter", "Udeyraj", "CDF-6000"),
  i("oil-bdv", "Oil BDV Test Set", "Veer", "VOT", "", "", "", "", "", ["Oil BVD"]),
  i("scope-adison", "Scope", "Adison", "", "", "", "", "", "", []), // verify: raw text only says "Adison ... scope"
 
  // ================= ADDED FROM QUOTATIONS 4-8 =================
  i("power-analyzer-wt500", "Power Analyzer with Harmonics", "Yokogawa", "WT500", "", "", "", "", "", ["WT 500", "Digital Power Analyzer WT 500"]),
  i("vrm-raytech", "Voltage Ratio Meter", "Raytech", "TR-Mark III 250V"),
  i("wrm-raytech", "Winding Resistance Meter 15A", "Raytech", "WR-14", "15 A"),
  i("wrm-prestige", "Winding Resistance Meter 25A Dual Channel", "Prestige", "", "25 A", "Dual channel"), // verify model
  i("atos", "Automatic Transformer Observing System", "Raytech", "mini-ATOS"),
  i("irm-metrel-rishab", "Insulation / PI Resistance Meter 5kV", "Metrel / Rishab", "", "5 kV", "PI"),
  i("irm-5kv", "Insulation Tester 5 kV", "", "", "5 kV"),
  i("irm-3kv", "Insulation Tester 3 kV", "", "", "3 kV"),
  i("impulse-170kv", "Impulse Tester 170 kV", "", "", "170 kV", "1.2/50 µs"),
  i("impulse-1600kv", "Impulse Tester 1600 kV", "", "", "1600 kV", "250/2500 µs"),
  i("impulse-8kv", "Impulse Tester 2.5-8 kV", "", "", "2.5–8 kV"),
  i("tan-delta-megger-delta4000", "Capacitance & Tan Delta Meter", "Megger", "Delta 4000"),
 
];
