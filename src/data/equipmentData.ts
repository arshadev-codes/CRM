export interface EquipmentRow {
  id: string; equipment: string; included: boolean;
  spec1: string; spec2: string; spec3: string; spec4: string; spec5: string;
  qty: number; price: string;
}
export const equipmentData: EquipmentRow[] = [
  { id: "ht-cap", equipment: "HT Capacitor Bank", included: true, spec1: "33 kV", spec2: "30 MVAR", spec3: "Outdoor", spec4: "Single bank", spec5: "Auto switching", qty: 1, price: "" },
  { id: "mg-set", equipment: "MG Set", included: true, spec1: "5 MVA", spec2: "50–200 Hz", spec3: "Variable freq.", spec4: "Brushless", spec5: "Local + remote", qty: 1, price: "" },
  { id: "ct-1", equipment: "CT-1", included: true, spec1: "2000/1A", spec2: "Cl. 0.2S", spec3: "Cast resin", spec4: "Indoor", spec5: "Burden 30VA", qty: 1, price: "" },
  { id: "ct-2", equipment: "CT-2", included: false, spec1: "1000/1A", spec2: "Cl. 0.2S", spec3: "Cast resin", spec4: "Indoor", spec5: "Burden 30VA", qty: 1, price: "" },
  { id: "ct-3", equipment: "CT-3", included: false, spec1: "500/1A", spec2: "Cl. 0.2S", spec3: "Cast resin", spec4: "Indoor", spec5: "Burden 30VA", qty: 1, price: "" },
  { id: "pt-1", equipment: "PT-1", included: true, spec1: "33 kV/110V", spec2: "Cl. 0.2", spec3: "Cast resin", spec4: "Indoor", spec5: "Burden 50VA", qty: 1, price: "" },
  { id: "pt-2", equipment: "PT-2", included: false, spec1: "11 kV/110V", spec2: "Cl. 0.2", spec3: "Cast resin", spec4: "Indoor", spec5: "Burden 50VA", qty: 1, price: "" },
  { id: "mg-iovt", equipment: "MG Set for IOVT", included: false, spec1: "2 MVA", spec2: "100–400 Hz", spec3: "Variable freq.", spec4: "Brushless", spec5: "Remote ctrl", qty: 1, price: "" },
  { id: "hv-trans", equipment: "HV Transformer", included: true, spec1: "1000 kV", spec2: "300 kVA", spec3: "Oil-filled", spec4: "IEC 60076-3", spec5: "Single phase", qty: 1, price: "" },
  { id: "ind-dimmer", equipment: "Independent Dimmer", included: false, spec1: "415 V", spec2: "1000 A", spec3: "Motorized", spec4: "0–110%", spec5: "Remote", qty: 1, price: "" },
  { id: "booster", equipment: "Booster Transformer", included: true, spec1: "500 kV", spec2: "150 kVA", spec3: "Oil-filled", spec4: "Cascade", spec5: "Single phase", qty: 1, price: "" },
  { id: "gen-panel", equipment: "Generator Control Panels", included: true, spec1: "IP54", spec2: "PLC-based", spec3: "HMI 15\"", spec4: "Modbus TCP", spec5: "MCC integ.", qty: 1, price: "" },
  { id: "lt-cap", equipment: "LT Capacitor Bank", included: false, spec1: "415 V", spec2: "2 MVAR", spec3: "Indoor", spec4: "APFC", spec5: "Detuned", qty: 1, price: "" },
  { id: "ct-pt-rack", equipment: "CT/PT Rack", included: false, spec1: "Modular", spec2: "MS frame", spec3: "Powder coated", spec4: "Cable trays", spec5: "Earthed", qty: 1, price: "" },
];
