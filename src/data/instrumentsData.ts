export interface InstrumentRow {
  id: string; instrument: string; make: string; model: string;
  spec1: string; spec2: string; spec3: string; spec4: string; spec5: string;
  qty: number; price: string;
}
export const instrumentsData: InstrumentRow[] = [
  { id: "power-analyzer", instrument: "Power Analyzer", make: "Yokogawa", model: "WT5000",
    spec1: "0.03% accuracy", spec2: "8 channels", spec3: "DC–10 MHz", spec4: "Harmonic up to 500th", spec5: "Touch display", qty: 1, price: "" },
  { id: "vrm", instrument: "Voltage Ratio Meter", make: "Electrosoft", model: "VRM-3000",
    spec1: "3-phase", spec2: "0.1% accuracy", spec3: "Auto tap detect", spec4: "USB/Ethernet", spec5: "PC software", qty: 1, price: "" },
  { id: "wrm", instrument: "Winding Resistance Meter", make: "Electrosoft", model: "WRM-50A",
    spec1: "50A DC", spec2: "0.1% accuracy", spec3: "Demag mode", spec4: "Dual channel", spec5: "Temp comp.", qty: 1, price: "" },
  { id: "irm", instrument: "Insulation Resistance Meter", make: "Megger", model: "S1-5005",
    spec1: "5 kV", spec2: "5 TΩ range", spec3: "PI/DAR auto", spec4: "Memory storage", spec5: "BT download", qty: 1, price: "" },
  { id: "li-tester", instrument: "Lightning Impulse Tester", make: "Haefely", model: "SGSA-2400",
    spec1: "2400 kV", spec2: "240 kJ", spec3: "Multi-stage", spec4: "Digital recorder", spec5: "Full software", qty: 1, price: "" },
  { id: "pd-meter", instrument: "Partial Discharge Meter", make: "Omicron", model: "MPD 600",
    spec1: "0.1 pC res.", spec2: "Multi-channel", spec3: "FFT analysis", spec4: "PRPD plots", spec5: "IEC 60270", qty: 1, price: "" },
];
