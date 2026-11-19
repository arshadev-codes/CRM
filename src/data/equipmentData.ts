export interface EquipmentRow {
  id: string; equipment: string; included: boolean;
  spec1: string; spec2: string; spec3: string; spec4: string; spec5: string;
  aliases?: string[]; // optional: other names found in old quotations
  family?: string; // optional: groups variants in the wizard's picker (see catalogFamilies.ts)
}

const e = (
  id: string, equipment: string,
  spec1 = "", spec2 = "", spec3 = "", spec4 = "", spec5 = "",
  aliases?: string[],
): EquipmentRow => ({ id, equipment, included: false, spec1, spec2, spec3, spec4, spec5, aliases });
 
export const equipmentData: EquipmentRow[] = [
  // ---------- YOUR REFERENCE ROWS (unchanged) ----------
  { id: "ht-cap", equipment: "HT Capacitor Bank", included: true, spec1: "33 kV", spec2: "30 MVAR", spec3: "Outdoor", spec4: "Single bank", spec5: "Auto switching" },
  { id: "mg-set", equipment: "Main MG Set", included: true, spec1: "5 MVA", spec2: "50–200 Hz", spec3: "Variable freq.", spec4: "Brushless", spec5: "Local + remote" },
  { id: "ct-1", equipment: "CT-1", included: true, spec1: "2000/1A", spec2: "Cl. 0.2S", spec3: "Cast resin", spec4: "Indoor", spec5: "Burden 30VA" },
  { id: "ct-2", equipment: "CT-2", included: false, spec1: "1000/1A", spec2: "Cl. 0.2S", spec3: "Cast resin", spec4: "Indoor", spec5: "Burden 30VA" },
  { id: "ct-3", equipment: "CT-3", included: false, spec1: "500/1A", spec2: "Cl. 0.2S", spec3: "Cast resin", spec4: "Indoor", spec5: "Burden 30VA" },
  { id: "pt-1", equipment: "PT-1", included: true, spec1: "33 kV/110V", spec2: "Cl. 0.2", spec3: "Cast resin", spec4: "Indoor", spec5: "Burden 50VA" },
  { id: "pt-2", equipment: "PT-2", included: false, spec1: "11 kV/110V", spec2: "Cl. 0.2", spec3: "Cast resin", spec4: "Indoor", spec5: "Burden 50VA" },
  { id: "pt-3", equipment: "PT-3", included: false, spec1: "11 kV/110V", spec2: "Cl. 0.2", spec3: "Cast resin", spec4: "Indoor", spec5: "Burden 50VA" },
  { id: "mg-iovt", equipment: "MG Set for IOVT", included: false, spec1: "2 MVA", spec2: "100–400 Hz", spec3: "Variable freq.", spec4: "Brushless", spec5: "Remote ctrl" },
  { id: "hv-trans", equipment: "HV Transformer", included: true, spec1: "1000 kV", spec2: "300 kVA", spec3: "Oil-filled", spec4: "IEC 60076-3", spec5: "Single phase" },
  { id: "ind-dimmer", equipment: "Independent Dimmer", included: false, spec1: "415 V", spec2: "1000 A", spec3: "Motorized", spec4: "0–110%", spec5: "Remote" },
  { id: "dimmer", equipment: "Dimmer", included: false, spec1: "415 V", spec2: "1000 A", spec3: "Motorized", spec4: "0–110%", spec5: "Remote" },
  { id: "booster", equipment: "Booster Transformer", included: true, spec1: "500 kV", spec2: "150 kVA", spec3: "Oil-filled", spec4: "Cascade", spec5: "Single phase" },
  { id: "gen-panel", equipment: "Generator Control Panels", included: true, spec1: "IP54", spec2: "PLC-based", spec3: "HMI 15\"", spec4: "Modbus TCP", spec5: "MCC integ." },
  { id: "lt-cap", equipment: "LT Capacitor Bank", included: false, spec1: "415 V", spec2: "2 MVAR", spec3: "Indoor", spec4: "APFC", spec5: "Detuned" },
  { id: "ct-pt-rack", equipment: "CT/PT Rack", included: false, spec1: "Modular", spec2: "MS frame", spec3: "Powder coated", spec4: "Cable trays", spec5: "Earthed" },
 
  // ---------- DIMMERS / VOLTAGE REGULATORS (same product, 2 names) ----------
  e("dimmer-900a", "Dimmer / Voltage Regulator 900A", "900 A", "0–470 V", "3Ph, 50 Hz", "Oil-filled", "", ["Voltage Regulator: 900A"]),
  e("dimmer-600a", "Dimmer / Voltage Regulator 600A", "600 A", "0–470 V", "3Ph, 50 Hz", "Oil-filled", "", ["Dimmer: 600A"]),
  e("dimmer-250a", "Dimmer / Voltage Regulator 250A", "250 A", "0–470 V", "3Ph, 50 Hz", "Oil-filled", "", ["Voltage Regulator: 250A"]),
  e("dimmer-100a", "Dimmer 100A Motorized", "100 A", "Motorized", "Oil-filled", "", "", ["Dimmer 100 Amps motorized with oil"]),
 
  // ---------- MG SETS / TRANSFORMERS ----------
  e("mg-500kva", "Motor Generator 500 kVA", "500 kVA", "0–900 V", "3 Phase", "", "", ["MG Set 500KVA"]),
  e("mg-100kva-200hz", "Motor Generator 100 kVA, 200 Hz", "100 kVA", "3 Phase", "200 Hz", "", "", ["MG Set 100KVA"]),
  e("mg-20kva-150hz", "Main MG Set 20 kVA, 150 Hz", "20 kVA", "150 Hz", "", "", ""),
  e("intermediate-trafo-100kva", "Intermediate Transformer 100 kVA", "100 kVA"),
  e("hv-300kv-1000ma", "HV Transformer 300 kV, 1000 mA", "300 kV", "1000 mA"),
  e("hv-150kv-300ma", "HV Transformer 150 kV, 300 mA", "150 kV", "300 mA", "37.5 kVA", "", "", ["150kv, 300mAmps, 37.5 KVA HV Transformer"]),
  e("hv-75kv-300ma", "HV Transformer 0–75 kV, 300 mA", "0–75 kV", "300 mA"),
 
  // ---------- CTs / PTs ----------
  e("ct-nll", "NLL CT", "/5 A", "Class 0.2", "50 Hz", "15 VA", "", ["No Load Loss CT"]),
  e("ct-ll", "LL CT", "/5 A", "Class 0.2", "50 Hz", "15 VA", "", ["Load Loss CT"]),
  e("ct-1000-5", "CT 1000/5A", "1000/5 A", "Class 0.2", "50 Hz", "", "", ["CT1"]),
  e("ct-multi-600", "CT 50-100-200-300-600/5A", "50-100-200-300-600/5 A", "Class 0.2", "50 Hz", "", "", ["CT2"]),
  e("ct-multi-100", "CT 5-10-25-50-100/5A", "5-10-25-50-100/5 A"),
  e("ct-200-5", "CT 200/5A", "200/5 A", "", "", "", "", ["CT (200/5)"]),
  e("pt-nll", "NLL PT", "/110 V", "Class 0.2", "Burden 5 VA", "", "", ["No Load Loss PT"]),
  e("pt-ll", "LL PT", "/110 V", "Class 0.2", "Burden 5 VA", "", "", ["Load Loss PT"]),
  e("pt-multi-12kv", "PT 0.66-2.2-6.6-12kV/110V", "0.66-2.2-6.6-12 kV/110 V", "Class 0.2", "Burden 5 VA", "", "", ["PT1"]),
  e("pt-multi-33kv", "PT 6.6-11-33kV/110V", "6.6-11-33 kV/110 V", "Class 0.2", "Burden 5 VA", "", "", ["PT2"]),
  e("pt-multi-3kv", "PT 0.55-1.1-3.3kV/110V", "0.55-1.1-3.3 kV/110 V"),
  e("pt-11kv-110", "PT 11kV/110V", "11 kV/110 V"),
 
  // ---------- CAPACITOR BANKS ----------
  e("ht-cap-10mvar", "HT Capacitor Bank 10 MVAR", "10 MVAR"),
  e("ht-cap-4mvar", "HT Capacitor Bank 4 MVAR", "4 MVAR", "With structure & bus bar"),
  e("lt-cap-600kvar", "LT Capacitor Bank 440V, 600 kVAR", "440 V", "600 kVAR"),
  e("lt-cap-1500kvar", "LT Capacitor Bank 440V, 1500 kVAR", "440 V", "1500 kVAR"),
 
  // ---------- ISOLATORS / SWITCHES / SENSORS ----------
  e("ht-isolator-cap-800a", "HT Isolator Switch with Earthing for HT Capacitor Bank (Motorized)", "800 A", "22 kV", "3 Phase", "Motorized", "End limit switches"),
  e("ht-isolator-cap-manual", "HT Isolator Switch with Earthing for HT Capacitor Bank (Manual)", "Manual", "With earthing mechanism"),
  e("ht-isolator-trh", "3-Pole Motorized HT Isolator Switch (Temp. Rise Test)", "1600 A", "66 kV", "3 Pole", "Motorized", "End limit switches", ["HT Isolator for Temperature rise Test"]),
  e("knife-switch-ctpt", "Knife Switch for CT/PT Selection", "Hand operated", "With CT-PT rack"),
  e("rtd-pt100", "RTD PT100 Sensor (Temp. Rise)", "PT100", "Qty set per job (8 / 12 / 16)", "", "", "", ["RTD with Sensor", "RTD with PT100 sensor (Radix + Electrosoft)"]),
  e("scanner", "Temperature Scanner", "", "", "", "", "", ["Scanner"]),
  e("hv-test-leads", "Test Leads for HV"),
 
  // ---------- TEST BENCH / CONTROL DESKS ----------
  e("test-bench-conv", "Test Bench (Conventional)", "Digital meters", "Dimmer O/P V & I", "Settable tripping", "DVDF O/P V, I, Hz", "HV test V & leakage current", ["Conventional Test Bench"]),
  e("power-panel", "Power Panel (Test)", "ACB / MCCB", "Contactors, relays", "Aluminium busbar", "PT for DVDF voltage", "NLL, LL, IOVT, HV tests", ["Power Panel for tests"]),
  e("lv-trolley", "LV Test Trolley", "Instrument housing", "Relay-timer control", "Magnetizing current meter", "6A 3Ph motorized dimmer", "Vector group / magnetic balance"),
  e("control-desk-pa", "Control Desk with Power Analyzer", "Yokogawa WT333E", "", "", "", "", ["Machine Room Control Desk"]),
  e("control-desk-basic", "Control Desk (Lamps, Push Buttons, Meters)", "Indicating meters", "Control switches", "MCB"),
  e("control-desk-scada", "Control Desk with SCADA & HMI"),
 
  // ---------- PLC / AUTOMATION ----------
  e("machine-room-panel-siemens", "Machine Room Panel (PLC & HMI)", "Siemens", "PLC + HMI", "Duplicate control switches & push buttons"),
  e("control-room-panel-schneider", "Control Room Panel (PLC & HMI)", "Schneider", "PLC + HMI", "Switches, lamps, meters", "With programming software"),
  e("plc-main", "Main PLC Panel"),
  e("rio-panel", "Remote RIO Panel", "Schneider", "RIO modules + HMI", "", "", "", ["RIO Panel"]),
  e("plc-automation", "PLC & Automation Package", "PLC panel", "Remote I/O", "Junction Box A & B"),
  e("fo-cable-kit", "Fibre Optic Cable Kit", "Finolex", "Single-mode", "Media converter", "4-port LIU", "FO patch cord + splicing"),
 
  // ---------- EXCITATION PANELS ----------
  e("excit-2mva", "Generator Excitation Panel 2 MVA", "200 VDC", "15 A", "Coarse & fine (50 V steps)", "", "", ["2.5 MVA Excitation Control Panel", "Generator Excitation System 2 MVA"]),
  e("excit-5mva", "Digital Excitation Control Panel 5 MVA", "200 VDC", "20 A", "ABB controller"),
  e("excit-6mva", "Generator Excitation Panel 6 MVA", "200 VDC", "15 A", "Coarse & fine (50 V steps)", "TCP/IP comm."),
  e("excit-12-5mva", "Excitation AVR Panel 12.5 MVA"),
  e("excit-15mva", "Digital Excitation Control Panel 15 MVA", "200 VDC", "20 A", "ABB controller"),
  e("excit-40mva", "Excitation AVR Panel 40 MVA"),
  e("excit-170vdc", "Generator Excitation Panel 170 VDC, 18 A", "170 VDC", "18 A", "Dimmer-transformer controlled", "Fine < 1 V"),
  e("ct-pt-excit-panel", "PT & CT Panel for Digital Excitation Sensing"),
 
  // ---------- GENERATOR PROTECTION PANELS ----------
  e("gen-prot-15mva", "Generator Protection Panel 15 MVA", "6.6 kV", "1600 A", "ABB motorized VCB", "Up to 60 Hz", "TCP/IP"),
  e("gen-prot-7-5mva", "Generator Protection Panel 7.5 MVA", "6.6 kV", "1000 A", "ABB motorized VCB", "Up to 200 Hz", "TCP/IP"),
  e("gen-prot-6mva", "Generator Protection Panel 6 MVA", "11 kV", "ABB motorized VCB", "50/60 Hz", "TCP/IP"),
  e("gen-prot-2-5mva-3ph", "Generator Protection Panel 2.5 MVA (3-Phase)", "11 kV", "630 A", "CT 200/5, PT 11kV/110V", "Up to 200 Hz", "TCP/IP"),
  e("gen-prot-2-5mva-1ph", "Generator Protection Panel 2.5 MVA (1-Phase)", "11 kV", "630 A", "With transformer protection relay", "Up to 200 Hz"),
  e("gen-prot-2mva", "Generator Protection Panel 2 MVA", "11 kV", "ABB motorized VCB", "Up to 200 Hz", "TCP/IP"),
 
  // ---------- TRANSFORMER PROTECTION / VCB PANELS ----------
  e("trafo-prot-6-6kv", "Transformer Protection Panel 6.6 kV", "6.6 kV", "1600 A", "ABB motorized VCB", "Up to 200 Hz", "TCP/IP", ["Transformer Protection panel-1", "Transformer Protection panel-2"]),
  e("trafo-prot-11kv-60hz", "Transformer Protection Panel 11 kV (60 Hz)", "11 kV", "ABB / Schneider motorized VCB", "Up to 60 Hz", "TCP/IP", "", ["Transformer Protection Panel for 3 Phase Output"]),
  e("trafo-prot-11kv-200hz", "Transformer Protection Panel 11 kV (200 Hz)", "11 kV", "ABB / Schneider motorized VCB", "Up to 200 Hz", "TCP/IP", "", ["Transformer Protection Panel for 1 Phase Output"]),
  e("vcb-panel-ab", "VCB Panel 6.6 kV, 630 A", "6.6 kV", "630 A", "", "", "", ["VCB PANEL-A", "VCB PANEL-B"]),
  e("vcb-panel-1", "VCB Panel (2 I/C + 2 O/G, no protection)"),
  e("vcb-panel-2", "VCB Panel (2 I/C with Generator Protection + 2 O/G)"),
  e("incomer-dual-outgoing", "Single Incomer / Dual Outgoing Panel (Interlocked)", "6.6 kV", "630 A", "300 A relay", "CG Power make"),
  e("changeover-panel", "Motorized Change-over Panel", "6.6 kV", "630 A", "RMU 1 LBS + 2 VCB"),
 
  // ---------- BUS BAR / DISTRIBUTION / MISC PANELS ----------
  e("busbar-1600a", "Common Bus Bar Section 1600 A", "1600 A", "Tinned copper", "", "", "", ["Common Bus Bar Section-1", "Common Bus Bar Section-2"]),
  e("busbar-600a", "Common Bus Bar Section 600 A", "600 A", "Tinned copper"),
  e("lt-dist-panel", "LT Distribution Panel"),
  e("lt-panel-dol", "LT Panel with 6 DOL Starters", "6 × 5.5 kW DOL", "MPCB", "12-way SPN distribution", "ABB switchgear"),
  e("mcc-panel", "MCC Panel"),
  e("control-dist-panel", "Control Distribution Panel"),
  e("ct-pt-selection-panel", "CT-PT Selection Panel"),
  e("ngr-panel", "NGR Protection Panel"),
  e("rtd-jb-48ch-15mva", "RTD Junction Box 48 Ch (15 MVA)", "48 Ch", "Motor & generator", "15 MVA"),
  e("rtd-jb-48ch-5mva", "RTD Junction Box 48 Ch (5 MVA)", "48 Ch", "Motor & generator", "5 MVA"),
  e("rtd-jb-32ch-15mva", "RTD Junction Box 32 Ch (15 MVA)", "32 Ch", "Motor & generator", "15 MVA"),
  e("rtd-jb-40mva", "RTD Junction Box 40 MVA", "", "", "", "", "", ["RTD Junction Box Panel-A"]),
  e("rtd-jb-12-5mva", "RTD Junction Box 12.5 MVA", "", "", "", "", "", ["RTD Junction Box Panel-B"]),
  e("ups-2kva-50hz", "UPS 2 kVA (50 Hz)", "2 kVA", "230 V, 50 Hz", "30 min backup", "With battery"),
  e("ups-2kva-60hz", "UPS 2 kVA (60 Hz)", "2 kVA", "230 V, 60 Hz", "30 min backup", "With battery"),
 
  // ---------- VFD PANELS ----------
  e("vvfc-690v-12p", "VVFC Panel 690 VAC True 12-Pulse (Stand Alone)", "690 V", "12-pulse"),
  e("vvfc-690v-12p-lineup", "Blower & Cooler Fan VVFC Panel Line-up 690 V", "690 V", "12-pulse", "Line-up"),
  e("vvfc-415v-6p", "VVFC Panel 415 V 6-Pulse (Stand Alone)", "415 V", "6-pulse", "", "", "", ["Cooler Fan 415V VVFC Panel"]),
  e("lineup-vfd-incomer", "Line-up VFD Panel-1 Incomer"),
  e("lineup-vfd-outgoing", "Line-up VFD Panel-1 Outgoing"),
  e("lpbs", "Local Push Button Station (LPBS)"),
 
  // ================= ADDED FROM QUOTATIONS 4-8 =================
  // ---------- TEST BENCHES / CONSOLES / SOFTWARE ----------
  e("test-bench-auto-43", "Advanced Test Bench (Fully Automatic, PC/PLC based)", "Industrial PC", "43-inch display", "PLC or DAQ cards", "Auto safety & protection", "Printer for on-site reports", ["Test Bench with industrial PC, 43 inch color TV", "Advanced Fully Automatic Transformer Test Bench"]),
  e("test-console-scada-40", "Test Console (PLC + SCADA)", "PLC based", "SCADA software", "40-inch LCD monitor", "Select, control & monitor test equipment", "", ["Test Console with PLC based Scada Software"]),
  e("xmer-edge-software", "X'mer Edge Control & Monitoring Software", "Windows / SCADA based", "Automatic test sequencing", "Data acquisition & logging", "User access control", "Optional report module", ["Electrosoft X'mer Edge"]),
  e("report-software-pc", "Report Generation Software with PC & Printer", "Printable in customer format", "PC + monitor + keyboard", "UPS", "Single-color printer", "Console for system", ["Report generation software printable in your format"]),
  e("lv-trolley-auto", "Fully Automatic LV Test Trolley", "Touch-screen test selection", "Single & 3-phase transformers", "8 flexible leads, 10 kV insulation", "Heavy-duty crocodile clips", "Results saved as .csv", ["Fully automatic LV Test Trolley"]),
 
  // ---------- ISOLATORS / SWITCHES ----------
  e("ht-isolator-trh-33kv", "HT Isolator with Earthing for Temp. Rise Test 1600A, 33kV", "1600 A", "33 kV", "With earthing mechanism"),
  e("ht-isolator-trh-220kv", "HT Isolator with Earthing for Temp. Rise Test 1600A, 220kV", "1600 A", "220 kV", "With earthing mechanism"),
  e("ht-isolator-trh-800a-36kv", "Motorized HT Isolator for Heat Run Test 800A, 36kV", "800 A", "36 kV", "Motorized", "", "", ["Motorized HT Isolator for Heat Run test"]),
  e("ht-isolator-cap-2000a-33kv", "HT Isolator with Earthing for HT Capacitor Bank 2000A, 33kV", "2000 A", "33 kV", "With earthing mechanism"),
  e("ht-isolator-cap-1200a-36kv", "Motorized HT Isolator for HT Capacitor Bank 1200A, 36kV", "1200 A", "36 kV", "Motorized"),
  e("isolator-hv-test-motorized", "Motorized Isolators 2 & 3 Pole for HV Test", "2 pole & 3 pole", "Motorized"),
  e("knife-switch-ctpt-pneumatic", "Knife Switch for CT/PT Selection (Pneumatic) with CT-PT Rack", "Pneumatic operated", "With CT-PT rack"),
  e("knife-switch-pneumatic-900a", "Pneumatic Knife Switch 900A, 600V", "900 A", "600 V", "Pneumatic"),
 
  // ---------- CAPACITORS ----------
  e("lt-cap-700kvar", "LT Capacitor Set 700 kVAr", "700 kVAr", "25 kVAr x12 + 20 kVAr x10 + 50 kVAr x4"),
  e("lt-cap-4000kvar", "LT Capacitor Bank 440V, 4000 kVAR", "440 V", "4000 kVAR"),
  e("lt-cap-panel", "LT Capacitor Panel (capacitors from existing system)", "Panel only"),
  e("ht-cap-24mvar", "HT Capacitor Bank 24 MVAR", "24 MVAR"),
  e("cap-unit-170kvar", "Capacitor Unit 1-Phase 170 kVAr, 577V", "170 kVAr", "577 V", "1 Phase, 50 Hz", "Internal fuse"),
  e("cap-rack", "Capacitor Rack"),
 
  // ---------- CTs / PTs (new ratings) ----------
  e("ct-200-100-5", "CT 200-100/5A", "200-100/5 A"),
  e("ct-50-5", "CT 50/5A", "50/5 A"),
  e("ct-5-20-5", "CT 5-10-20/5A, Class 0.1", "5-10-20/5 A", "Class 0.1", "50 Hz", "15 VA", "IL 66 kV", ["CT1: 5-10-20/5A"]),
  e("ct-75-300-5", "CT 75-150-225-300/5A, Class 0.1", "75-150-225-300/5 A", "Class 0.1", "50 Hz", "15 VA", "IL 66 kV", ["CT2: 75-150-225-300/5A"]),
  e("ct-10-100-tap", "CT 10-25-50-100/5A, Class 0.1 (secondary tapping)", "10-25-50-100/5 A", "Class 0.1", "Secondary tapping"),
  e("ct-nll-1a-100", "NLL CT 25-50-100/1A", "25-50-100/1 A", "Class 0.1", "10 VA", "IL 36 kV"),
  e("ct-nll-1a-800", "NLL CT 200-400-600-800/1A", "200-400-600-800/1 A", "Class 0.1", "10 VA", "IL 36 kV"),
  e("pt-3300-1100", "PT 3300-2200 / 1100/root3", "3300-2200 V / 1100/√3", "", "", "", "", ["PT: 3300-2200=1100/root 3"]), // verify rating
  e("pt-c01-3kv", "PT 0.55-1.1-2.2-3.3kV/110V, Class 0.1", "0.55-1.1-2.2-3.3 kV/110 V", "Class 0.1", "Burden 5 VA", "", "", ["PT1: 0.55-1.1-2.2-3.3kV/110V"]),
  e("pt-c01-11kv", "PT 6.6-11kV/110V, Class 0.1", "6.6-11 kV/110 V", "Class 0.1", "Burden 5 VA", "", "", ["PT2: 6.6-11kV/110V"]),
  e("pt-660-3300-tap", "PT 660-1100-2200-3300V /√3 / 110/√3 (secondary tapping)", "660-1100-2200-3300 V/√3 : 110/√3", "Class 0.1", "Burden 2.5 VA", "IL 3.6 kV", "Secondary tapping"),
  e("pt-nll-2kv", "NLL PT 1.1-2.2kV/110/√3", "1.1-2.2 kV/110/√3", "Class 0.1", "Burden 1.25 VA"),
  e("pt-nll-6kv", "NLL PT 4.4-6.6kV/110/√3", "4.4-6.6 kV/110/√3", "Class 0.1", "Burden 1.25 VA"),
  e("pt-nll-96kv", "NLL PT 96kV/110/√3", "96 kV/110/√3", "Class 0.1", "Burden 1.25 VA"),
  e("primary-sensing-kv", "Primary Sensing for kV Meter"),
 
  // ---------- MG SETS / GENERATORS ----------
  e("mg-150kva", "Motor Generator 150 kVA", "150 kVA", "3 Phase"),
  e("mg-800kva", "Motor Generator 800 kVA", "800 kVA", "0–900 V", "3 Phase"),
  e("mg-30kva", "Main MG Set 30 kVA", "30 kVA"),
  e("mg-main-2mva", "Main Generator 2 MVA with 1200 kW Motor", "Generator 2 MVA, 11 kV, 3Ph, 50/60 Hz", "Motor 1200 kW, 11 kV, 3Ph, 50/60 Hz", "", "", "", ["Main MG Set"]),
  e("mg-iovt-1mva", "MG Set for IOVT 1 MVA, 11 kV, 200 Hz", "1 MVA", "11 kV", "200 Hz", "", "", ["IOVT MG Set"]),
 
  // ---------- TRANSFORMERS ----------
  e("intermediate-trafo-2-4mva", "Intermediate Transformer 2.4 MVA, 11 kV", "2.4 MVA", "11 kV"),
  e("booster-500kva", "3-Phase Booster Transformer 500 kVA", "500 kVA", "440 V / 800-2200-3300-6600-11000 V", "3 Phase"),
  e("booster-100kva", "3-Phase Booster Transformer 100 kVA", "100 kVA", "440 V / 400-800-1200 V", "3 Phase"),
  e("hv-100kv-500ma", "HV Transformer 100 kV, 500 mA", "100 kV", "500 mA"),
  e("hv-500kv-1000ma", "HV Transformer 500 kV, 1000 mA", "500 kV", "1000 mA"),
  e("hv-80kv-300ma", "HV Transformer 80 kV, 300 mA", "80 kV", "300 mA"),
  e("current-injection-3000a", "Current Injection Transformer 3000A, 10V with Dimmer & Control Panel", "3000 A", "10 V", "With dimmer", "With control panel"),
 
  // ---------- DIMMERS (new ratings) ----------
  e("dimmer-800a", "Dimmer 800A, 3Ph, 50Hz", "800 A", "3Ph, 50 Hz"),
  e("dimmer-1200a", "Motorized Oil-Cooled Dimmer 1200A", "1200 A", "3 Phase", "Motorized", "Oil-cooled"),
  e("dimmer-2000a", "Dimmer 2000A, 0-470V, 3Ph, 50Hz with Oil", "2000 A", "0–470 V", "3Ph, 50 Hz", "Oil-filled"),
  e("ind-dimmer-800a-hv", "Independent Dimmer for HV Testing 800A, 0-460V", "800 A", "0–460 V", "2Ph, 50 Hz", "Oil-filled"),
 
  // ---------- EXCITATION / PROTECTION PANELS (new) ----------
  e("excit-1mva", "Generator Excitation Panel 1 MVA", "200 VDC", "15 A", "Coarse & fine (50 V steps)", "TCP/IP comm."),
  e("gen-prot-2mva-60hz", "Generator Protection Panel 2 MVA (50/60 Hz)", "11 kV", "ABB / Schneider motorized VCB", "Up to 50/60 Hz", "TCP/IP"),
  e("gen-prot-1mva", "Generator Protection Panel 1 MVA", "11 kV", "ABB / Schneider motorized VCB", "Up to 200 Hz", "TCP/IP"),
  e("lt-panel-vfd-220kw", "LT Power Panel with 220 kW VFD", "220 kW VFD", "MCCB, contactors, relays", "6 x 5.5 kW DOL starters", "12-way SPN distribution"),
  e("marshalling-box", "Marshalling Box"),
  e("rtcc-panel", "RTCC Panel"),
  e("ups-5kva-60hz", "UPS 5 kVA (60 Hz)", "5 kVA", "230 V, 60 Hz", "30 min backup", "With battery"),
  e("rtd-jb-48ch-7-5mva", "RTD Junction Box 48 Ch (7.5 MVA)", "48 Ch", "Motor & generator", "7.5 MVA"),
  e("rtd-jb-48ch-1mva", "RTD Junction Box 48 Ch (1 MVA)", "48 Ch", "Motor & generator", "1 MVA"),
  e("fo-cable", "Fibre Optic Cable (Finolex)", "Per metre"),
  e("media-converter", "Single-Mode Media Converter 4-Port", "4-port", "Single-mode"),
 
  // ---------- TEST SOURCES / HV SET-UP ITEMS ----------
  e("breaker-testing-panel", "Breaker Testing Panel", "Operation test", "Closing / opening time", "Anti-pumping test", "Pole discrepancy L1-L2-L3", "Contact resistance"),
  e("current-source-25kva", "Variable Current Source 25 kVA, 0-6300A", "25 kVA", "0–6300 A"),
  e("hv-tester-75kv", "HV Tester 75 kV, 300 mA", "75 kV", "300 mA"),
  e("hv-tester-3-5kv", "HV Tester 3.5 kV, 300 mA", "3.5 kV", "300 mA"),
  e("source-ac-1000v", "Source 0-1000V AC", "0–1000 V AC"),
  e("source-dc-1000v", "Source 0-1000V DC", "0–1000 V DC"),
  e("vfd-30kw", "VFD 30 kW", "30 kW"),
  e("automation-power-panel-lv", "Automation Panel & Power Panel (LV Set-up)", "1 set"),
   // ================= ADDED FROM QUOTATIONS 9-14 =================
  // ---------- CAPACITORS ----------
  e("lt-cap-panel-625kvar", "LT Capacitor Panel 625 kVAR (capacitors from existing set-up)", "625 kVAR", "Panel only", "", "", "", ["LT capacitor Panel for 625 KVAR"]),
  e("lt-cap-panel-6000kvar", "LT Capacitor Panel 6000 kVAR", "6000 kVAR"),
  e("lt-cap-6mvar-600v", "LT Capacitor Bank 6 MVAR, 600V", "6 MVAR", "600 V", "Operates with test bench", "", "", ["LT capacitor Bank : 6 MVAR, 600 V"]),
  e("ht-cap-166kvar", "HT Capacitor Bank 166.67 kVAR", "166.67 kVAR"),
  e("ht-cap-31mvar", "HT Capacitor Bank 31 MVAR", "31 MVAR"),
 
  // ---------- ISOLATORS ----------
  e("ht-isolator-cap-1600a-145kv", "Motorized HT Isolator with Earthing for HT Capacitor Bank 1600A, 145kV", "1600 A", "145 kV", "3 Phase", "Motorized", "End limit switches"),
 
  // ---------- PANELS / SAFETY ----------
  e("control-power-panel", "Control cum Power Panel", "MCCB incomer", "MFM meter with CT", "Transformer OC trip relay", "Dimmer input contactor & output CT", "Main CT/PT selector switches", ["Control Cum Power Panel (Core Loss Testing system)"]),
  e("changeover-panel-two-winding", "Two Winding Changeover Panel (3-Phase / 1-Phase Testing)", "3 Phase & 1 Phase testing"), // verify rating
  e("hv-safety-interlock", "High Voltage Area Safety Interlock System with Panel", "Door interlocks", "Safety gate switches", "Occupancy sensing", "With panel", "", ["HV Area Safety Interlock System"]),
 
  // ---------- CORE LOSS SYSTEM ITEMS ----------
  e("trafo-150kva-3ph", "3-Phase Transformer 150 kVA", "150 kVA", "3 Phase"),
  e("dimmer-150a", "3-Phase Motorized Dimmer 150A", "150 A", "3 Phase", "Motorized", "", "", ["3 Phase 150 Amp motorized Dimmer"]),
  e("ct-2-5-15-1a", "CT 2.5-5-10-15/1A", "2.5-5-10-15/1 A"),
  e("pt-1-1-6-6kv", "PT 1.1-2.2-3.3-6.6kV/110V", "1.1-2.2-3.3-6.6 kV/110 V"),
 
  // ---------- HV-CLASS MEASURING CT / PT (Voltamp type quote) ----------
  e("pt-11kv-tap-c01", "11 kV PT (Phase to Earth) 1.1-2.2-3.3-6.6kV/√3 / 110V/√3", "1.1-2.2-3.3-6.6 kV/√3 : 110 V/√3", "Class 0.1", "Burden 2.5 VA", "HSV 12 kV, epoxy cast", "Ratio change from secondary tapping"),
  e("pt-132kv-33kv", "132 kV PT 11-22-33 kV/√3 / 110/√3", "11-22-33 kV/√3 : 110/√3", "Class 0.1", "Burden 5 VA", "BIL 650 kV, HSV 145 kV", "Porcelain, IS 16227"),
  e("pt-132kv-132kv", "132 kV PT 66-132 kV/√3 / 110/√3", "66-132 kV/√3 : 110/√3", "Class 0.1", "Burden 5 VA", "BIL 650 kV, HSV 145 kV", "Porcelain, IS 16227"),
  e("ct-132kv-50a", "132 kV CT 5-10-25-50/5A", "5-10-25-50/5 A", "Class 0.1", "Burden 15 VA", "Live tank, MS tank, porcelain", "BIL 650 kV, STC 40 kA 1 s"),
  e("ct-132kv-1000a", "132 kV CT 100-200-400-600-1000/5A", "100-200-400-600-1000/5 A", "Class 0.1", "Burden 15 VA", "Live tank, MS tank, porcelain", "BIL 650 kV, STC 40 kA 1 s"),
  e("ct-132kv-2500a", "132 kV CT 1500-2000-2500/5A", "1500-2000-2500/5 A", "Class 0.1", "Burden 15 VA", "Live tank, MS tank, porcelain", "BIL 650 kV, STC 40 kA 1 s"), // verify: quote heading says 66 kV, text says 132 kV
 
  // ---------- CABLES ----------
  e("cable-16c-2-5", "Flexible Cable 16 Core x 2.5 sq.mm", "16 core", "2.5 sq.mm", "Flexible"),
  e("cable-16c-1-5", "Flexible Cable 16 Core x 1.5 sq.mm", "16 core", "1.5 sq.mm", "Flexible"),
  e("cable-8c-1-5", "Flexible Cable 8 Core x 1.5 sq.mm", "8 core", "1.5 sq.mm", "Flexible"),
];