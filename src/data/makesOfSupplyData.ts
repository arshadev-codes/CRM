export interface MakeRow { id: string; item: string; defaultMake: string; options: string[]; defaultEnabled?: boolean; }
const standardMakes = ["ABB","Siemens","Schneider","Electrosoft","Delta","Moonlight","Customer Specified","Custom Entry"];
export const makesOfSupplyData: MakeRow[] = [
  { id: "switchgear", item: "Switchgear & VFD", defaultMake: "Siemens", options: standardMakes, defaultEnabled: true },
  { id: "test-bench", item: "Test Bench", defaultMake: "Electrosoft", options: standardMakes, defaultEnabled: true },
  { id: "power-panel", item: "Power Panel", defaultMake: "Electrosoft", options: standardMakes, defaultEnabled: true },
  { id: "cap-panel", item: "Capacitor Panel", defaultMake: "ABB", options: standardMakes, defaultEnabled: true },
  { id: "enclosure", item: "Enclosure", defaultMake: "Rittal", options: [...standardMakes, "Rittal"], defaultEnabled: true },
  { id: "software", item: "Software", defaultMake: "Electrosoft", options: standardMakes, defaultEnabled: true },
  { id: "plc", item: "PLC", defaultMake: "Siemens", options: standardMakes, defaultEnabled: true },
  { id: "ct-pt", item: "CT/PT", defaultMake: "Electrosoft", options: standardMakes, defaultEnabled: true },
  { id: "dimmer", item: "Dimmer", defaultMake: "Moonlight", options: standardMakes, defaultEnabled: true },
  { id: "transformer", item: "Transformer", defaultMake: "Customer Specified", options: standardMakes, defaultEnabled: true },
  { id: "mg-set", item: "MG Set", defaultMake: "Electrosoft", options: standardMakes, defaultEnabled: true },
];
