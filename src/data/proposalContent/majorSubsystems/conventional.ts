// import testBenchImg from "@/assets/test-bench.png";
import powerPanelImg from "@/assets/power-panel.png";
import lvTrolleyImg from "@/assets/lv-trolley.png";
//import htCapImg from "@/assets/subsystems/ht-capacitor-bank.jpg";
//import htIsolatorCapImg from "@/assets/subsystems/ht-isolator-capacitor.jpg";
import htIsolatorTrhImg from "@/assets/ht-isolator-temp-rise.png";
//import impulsePdImg from "@/assets/subsystems/impulse-pd-integration.jpg";
//import machineRoomImg from "@/assets/subsystems/machine-room-desk.jpg";
import instrumentsImg from "@/assets/instruments.png";
import safetyInterlockImg from "@/assets/safety-interlock.png";
import type { SubsystemContent } from "./advanced";
import ConventionalTestBenchImg from "@/assets/Conventional-test-bench.png";
// ---------- Images extracted from Federal techno-commercial offer ----------
import excitationControlPanelImg from "@/assets/excitation-control-panel.png";
import htBreakerPanelImg from "@/assets/ht-breaker-panel.png";
import ltBreakerPanelImg from "@/assets/lt-breaker-panel.png";
import htCapacitorUnitsImg from "@/assets/ht-capacitor-units.png";
import htLtCapacitorBankPanelImg from "@/assets/ht-lt-capacitor-bank-panel.png";
import ltCapacitorCansImg from "@/assets/lt-capacitor-cans.png";
import motorizedHtIsolator1Img from "@/assets/motorized-ht-isolator-1.png";
import motorizedHtIsolator2Img from "@/assets/motorized-ht-isolator-2.png";
import mainMgSetImg from "@/assets/main-mg-set.png";
import iovtMgSetImg from "@/assets/iovt-mg-set.png";
import dimmerImg from "@/assets/motorized-oil-cooled-dimmer.png";
import hvTransformerImg from "@/assets/hv-transformer.png";
import intermediateTransformerImg from "@/assets/intermediate-transformer.png";
import ctPtRackImg from "@/assets/ct-pt-rack.png";
import ctPtRackKnifeSwitchesImg from "@/assets/ct-pt-rack-knife-switches.png";
import rtdJunctionBoxImg from "@/assets/rtd-junction-box.png";
import ngrPanelImg from "@/assets/ngr-protection-panel.png";
// ---------- Images extracted from Mangal techno-commercial offer ----------
import ctPtRackFrontViewImg from "@/assets/ct-pt-rack-front-view.png";
import htCapacitorBankStructureImg from "@/assets/ht-capacitor-bank-structure.png";
import hvTestTransformerTankImg from "@/assets/hv-test-transformer-tank.png";
import hvTestControlPanelImg from "@/assets/hv-test-control-panel.png";
import motorizedDimmerImg from "@/assets/motorized-dimmer.png";
// ---------- Images extracted from Monarch techno-commercial offer ----------
import automaticLvTestTrolleyImg from "@/assets/automatic-lv-test-trolley.png";
import iovtMgSetPhotoImg from "@/assets/iovt-mg-set-photo.png";
import impulseTestSetupImg from "@/assets/impulse-test-setup.png";
import pdMeasurementSystemImg from "@/assets/pd-measurement-system.png";
import pdDetectorUnitImg from "@/assets/pd-detector-unit.png";
// ---------- Images extracted from NEA Nepal techno-commercial offer ----------
import powerPanelAcbImg from "@/assets/power-panel-acb.png";
// Conventional Test Bench — manually operated equivalent of the
// Semi-Automatic Transformer Test Bench. Add conventional-specific
// subsystems here as needed.
export const conventionalMajorSubsystems: SubsystemContent[] = [
  {
    id: "test-bench",
    title: "Conventional Transformer Test Bench / Machine Room Control Desk",
    preview: "Standalone manual control desk with meters, selector switches and push buttons.",
    description:
      "The Conventional Transformer Test Bench is a manually operated control desk that houses all essential meters, selector switches, push buttons, and indication lamps required for conventional transformer testing. It provides a complete, self-contained method of conducting all major transformer tests without dependence on a PLC/SCADA-based automation layer. The operator directly selects circuits, controls switching sequences, and records readings from panel-mounted instruments. Designed as a fully independent test bench, it offers maximum reliability, transparency, and operational continuity, making it well suited for facilities that prefer hands-on control or require a robust fallback to automated systems.",
    images: [ConventionalTestBenchImg],
  },
  {
    id: "power-panel",
    title: "Generator Panels.",
    preview: "Heavy-duty power distribution & switching panels, manually operated.",
    description:
      "These panels are heavy-duty assemblies designed to manage and distribute the electrical power required for all major transformer tests. They house ACBs, MCCBs, contactors, protective relays, and suitably rated aluminium busbars engineered for the required thermal and fault withstand levels. They incorporate the necessary switching arrangements for DVDF and induced-voltage withstand tests, along with properly segregated circuits dedicated to no-load loss, load loss, high-voltage testing, and IOVT operations. All incoming and outgoing feeders are routed to the control desk for manual switching and operation by the operator. Excitation panels offer Coarse and Fine controls for generators, operated through panel-mounted selector switches.",
    images: [powerPanelImg, powerPanelAcbImg],
  },
  {
    id: "excitation-power-panel",
    title: "Generator Excitation Panels.",
    preview: "Heavy-duty power distribution & switching panels, manually operated.",
    description:
      "These panels are heavy-duty assemblies designed to manage and distribute the electrical power required for all major transformer tests. They house ACBs, MCCBs, contactors, protective relays, and suitably rated aluminium busbars engineered for the required thermal and fault withstand levels. They incorporate the necessary switching arrangements for DVDF and induced-voltage withstand tests, along with properly segregated circuits dedicated to no-load loss, load loss, high-voltage testing, and IOVT operations. All incoming and outgoing feeders are routed to the control desk for manual switching and operation by the operator. Excitation panels offer Coarse and Fine controls for generators, operated through panel-mounted selector switches.",
    images: [excitationControlPanelImg],
  },
  {
    id: "ht-power-panel",
    title: "HT Panels.",
    preview: "Heavy-duty power distribution & switching panels, manually operated.",
    description:
      "These panels are heavy-duty assemblies designed to manage and distribute the electrical power required for all major transformer tests. They house ACBs, MCCBs, contactors, protective relays, and suitably rated aluminium busbars engineered for the required thermal and fault withstand levels. They incorporate the necessary switching arrangements for DVDF and induced-voltage withstand tests, along with properly segregated circuits dedicated to no-load loss, load loss, high-voltage testing, and IOVT operations. All incoming and outgoing feeders are routed to the control desk for manual switching and operation by the operator.",
    images: [htBreakerPanelImg],
  },
  {
    id: "lt-power-panel",
    title: "LT Panels",
    preview: "Heavy-duty power distribution & switching panels, manually operated.",
    description:
      "These panels are heavy-duty assemblies designed to manage and distribute the electrical power required for all major transformer tests. They house ACBs, MCCBs, contactors, protective relays, and suitably rated aluminium busbars engineered for the required thermal and fault withstand levels. They incorporate the necessary switching arrangements for DVDF and induced-voltage withstand tests, along with properly segregated circuits dedicated to no-load loss, load loss, high-voltage testing, and IOVT operations. All incoming and outgoing feeders are routed to the control desk for manual switching and operation by the operator.",
    images: [ltBreakerPanelImg],
  },
  {
    id: "lv-trolley",
    title: "Manual LV Test Trolley",
    preview: "Portable LV test trolley with panel-mounted selector switches.",
    description:
      "The Manual LV Test Trolley is a dedicated movable unit designed to perform all low-voltage diagnostic tests such as winding resistance, voltage ratio, phase displacement and vector group, magnetic balance, magnetizing current, insulation resistance, and polarization index. Its portable design allows it to be positioned close to the transformer LV bushings, reducing cable length and setup time. It is supplied with eight flexible, high-insulation (10 kV) test leads equipped with heavy-duty clips, and is operated manually by the operator, who selects and sequences each test through panel-mounted selector switches and push buttons. Test readings are recorded manually by the operator from the panel meters. This separation of LV testing into a dedicated trolley greatly enhances accessibility, safety, and overall test floor ergonomics.",
    images: [lvTrolleyImg, automaticLvTestTrolleyImg],
  },
  {
    id: "ht-cap",
    title: "HT Capacitor Bank",
    preview: "Reactive power support for no-load and IVW tests.",
    description:
      "The HT Capacitor Bank is a critical subsystem that supplies the reactive MVA required during tests such as no-load loss, load loss, induced-voltage withstand (DVDF), and other excitation-based high-voltage tests. It provides stable reactive power support, enabling controlled voltage buildup and maintaining required test voltages without overloading the power source. The capacitor bank works in coordination with the manually operated HT isolator switch, allowing safe, interlocked energisation and de-energisation through operator-controlled switching. Its inclusion ensures reliable and efficient testing of large EHV transformers up to 500 MVA, 765 kV.",
    images: [htLtCapacitorBankPanelImg, htCapacitorUnitsImg, htCapacitorBankStructureImg],
  },
  {
    id: "ht-isolator-trh",
    title: "Manually Operated HT Isolator Switch (for Temperature Rise Test)",
    preview: "Dedicated isolator for the temperature-rise test loading circuit.",
    description:
      "This manually operated isolator switch is dedicated to safely isolating the high-voltage loading circuit used during temperature-rise testing. Operation is carried out directly by the operator at the switch location, with mechanical and electrical interlocks preventing incorrect operation and guaranteeing compliance with safe test procedures.",
    // images: [htIsolatorTrhImg],
    images: [motorizedHtIsolator1Img, motorizedHtIsolator2Img],
  },
  {
    id: "instruments",
    title: "Equipment and Instruments",
    preview: "CTs, PTs, MG sets, generator panels, meters and precision power analyzers.",
    description:
      "This subsystem comprises all essential testing and measurement devices required for transformer testing, including current transformers, potential transformers, motor-generator (MG) sets, generator protection panels, excitation panels, digital meters, and precision power analyzers. These instruments form the measurement backbone of the entire facility, ensuring accurate acquisition of electrical parameters across all tests. Each device is selected for compatibility with the conventional control desk's panel-mounted indicators and meters, ensuring stable, reliable readings. Together, these instruments support every test from LV diagnostics to HV withstand tests by providing high-quality, standards-compliant measurement capability.",
    images: [instrumentsImg],
  },
  {
    id: "safety-interlock",
    title: "High Voltage Area Safety Interlock System",
    preview: "Zone protection — door interlocks, E-stops, indicators.",
    description:
      "The High Voltage Area Safety Interlock System is designed to protect personnel and equipment in the high-voltage test zone. It comprises door interlocks, emergency stop chains, beacon indicators, audible warning hooters, and trapped-key arrangements that work in coordination with the hard-wired relay logic of the conventional control desk. The interlock logic ensures that the HV circuit cannot be energised unless the zone is verified clear and all access doors are securely closed, providing a fail-safe environment for routine and type testing.",
    images: [safetyInterlockImg],
  },

  // ---------- Added from quotations (v2) ----------
  {
    id: "mg-set",
    title: "Main MG Set (Motor Generator)",
    preview: "Three-phase synchronous generator driven by a motor – the main test power source.",
    description:
      "The Main MG Set is a three-phase synchronous generator driven by a compatible prime-mover motor, designed for reliable power generation at 50/60 Hz. It provides stable voltage, high efficiency and robust performance under continuous and variable load, supplying the adjustable power needed for no-load loss, load loss, temperature-rise and other tests. Sets are supplied in ratings matched to the transformers under test, from compact units such as 150 kVA, 500 kVA and 800 kVA (0–900 V, 3 phase) up to large 11 kV machines such as a 2 MVA generator with a 1200 kW motor. The drive motor is started through a star-delta starter in the power panel, and the generator output is controlled manually from the control desk through the coarse and fine excitation controls. Insulation, cooling and protection features ensure safe operation, long service life and minimal maintenance.",
    images: [mainMgSetImg],
  },
  {
    id: "iovt-mg-set",
    title: "MG Set for IOVT (200 Hz)",
    preview: "High-frequency 200 Hz motor-generator for Induced Over Voltage Tests.",
    description:
      "The MG Set for IOVT is a high-frequency motor-generator system that supplies stable, isolated and clean 200 Hz AC power for Induced Over Voltage Tests (IOVT) on transformers and other sensitive electrical equipment. A robust motor is coupled to a high-frequency alternator, delivering precise voltage and frequency control with low harmonic distortion. The system provides full electrical isolation and effective suppression of transients and noise, and is built for continuous operation with efficient cooling, overcurrent and overvoltage protection, RTD-based temperature monitoring, high-class insulation and vibration-controlled couplings. Typical ratings range from 100 kVA to 1 MVA (11 kV), and the set is operated manually from the control desk through its excitation panel.",
    images: [iovtMgSetImg, iovtMgSetPhotoImg],
  },
  {
    id: "dimmer",
    title: "Motorized Oil-Cooled Dimmer (Voltage Regulator)",
    preview: "Smooth, stepless control of test voltage – 100 A to 2000 A ratings.",
    description:
      "The Dimmer is a 3-phase, motorized, oil-cooled variable voltage regulator for smooth and precise adjustment of the voltage applied to the test circuit, typically over a 0–470 V, 50 Hz range. The motorized mechanism is driven by raise/lower joystick switches on the control desk, while panel meters show the output voltage and current. The oil-cooled design ensures efficient heat dissipation, extended duty cycles and reliable operation under high-current conditions, with stable output, long service life and good protection against thermal stress and contact wear. Ratings are available from 100 A up to 2000 A (for example 100 A, 250 A, 600 A, 800 A, 900 A, 1200 A and 2000 A), so the right size can be selected for the transformer rating and test type. An independent dimmer (for example 800 A, 0–460 V, 2 phase) can also be supplied dedicated to HV testing.",
    images: [dimmerImg, motorizedDimmerImg],
  },
  {
    id: "hv-transformer",
    title: "HV Test Transformer",
    preview: "Step-up transformer for applied-voltage and HV withstand tests.",
    description:
      "The High Voltage Test Transformer delivers a stable, high-voltage output at a rated current, suitable for applied-voltage (HV) withstand and other high-voltage tests. It provides high efficiency and low partial discharge, with robust insulation using high-grade dielectric materials for safe operation under continuous high-voltage conditions. Superior thermal performance, compact construction and protection against over-voltage and overload give a long operational life with minimal maintenance. Ratings are selected according to the voltage class of the transformers under test, for example 0–75 kV / 300 mA, 80 kV / 300 mA, 100 kV / 500 mA, 150 kV / 300 mA, 300 kV / 1000 mA and 500 kV / 1000 mA. It is operated from the control desk, where the HV test voltage and leakage current are displayed, and is interlocked with the HV area safety system.",
    images: [hvTransformerImg, hvTestTransformerTankImg, hvTestControlPanelImg],
  },
  {
    id: "intermediate-transformer",
    title: "Intermediate Transformer",
    preview: "Voltage transformation and stable power distribution between supply and test circuit.",
    description:
      "The Intermediate Transformer provides efficient voltage transformation and stable power distribution within the test system. Built with high-grade core materials and robust insulation, it ensures low losses, high reliability and safe operation under continuous industrial loading. It supports effective voltage regulation between upstream and downstream equipment, offering durability, thermal stability and simple maintenance. Typical ratings include 100 kVA for LV/medium-voltage test setups and 2.4 MVA, 11 kV for larger facilities.",
    images: [intermediateTransformerImg],
  },
  {
    id: "current-injection-transformer",
    title: "Current Injection Transformer",
    preview: "3000 A, 10 V high-current source with dimmer and control panel.",
    description:
      "The Current Injection Transformer is a low-voltage, high-current source rated 3000 A at 10 V, supplied complete with its dimmer, control panel and accessories. It allows the high test currents needed for current-based tests to be injected and adjusted smoothly from the control desk, with the dimmer providing stepless control of the injected current.",
  },
  {
    id: "lt-cap",
    title: "LT Capacitor Bank",
    preview: "440 V reactive power compensation for the LV side of the test supply.",
    description:
      "The LT Capacitor Bank provides reactive power compensation on the 440 V side of the test supply, reducing the load on the Main MG Set and improving the stability of the test voltage during no-load and load-loss measurements. It is built from capacitor units arranged on a rack and offered in ratings from 600 kVAR to 4000 kVAR (for example 600, 700, 1500 and 4000 kVAR), so it can be sized to the test floor capacity. A panel-only version is also available where the capacitors of an existing system are reused. Switching is performed by contactors in the power panel, selected manually from the control desk.",
    images: [ltCapacitorCansImg],
  },
  {
    id: "ht-isolator-cap",
    title: "HT Isolator Switch with Earthing Mechanism (for HT Capacitor Bank)",
    preview: "Isolator for safe energisation, isolation and earthing of the HT capacitor bank.",
    description:
      "This HT isolator switch connects and disconnects the HT capacitor bank from the test circuit and includes an earthing mechanism that safely grounds the bank once it is isolated, ensuring complete discharge and preventing residual-charge hazards. It is available in a manual version and in motorized versions with limit switches at both ends of travel, in ratings such as 800 A / 22 kV, 1200 A / 36 kV and 2000 A / 33 kV. Mechanical and electrical interlocks prevent the capacitor bank from being energised while earthed, and prevent earthing while energised, so the circuit can only be operated in a safe sequence.",
    images: [motorizedHtIsolator1Img, motorizedHtIsolator2Img],
  },
  {
    id: "ct-pt-selection",
    title: "CT / PT Selection Switches & Rack",
    preview: "Hand-operated knife switches to select the correct CT and PT ratios.",
    description:
      "The CT/PT rack houses the current and potential transformers used for measurement, together with hand-operated knife switches that let the operator select the required CT or PT ratio for each test. This conventional arrangement is simple, transparent and easy to maintain: the selected ratio is visible at a glance, and the selection is wired to the control desk meters and the power analyzer. Multi-ratio CTs (for example 5-10-25-50-100/5 A or 75-150-225-300/5 A, class 0.1 or 0.2) and multi-ratio PTs (for example 0.55-1.1-2.2-3.3 kV/110 V or 6.6-11 kV/110 V) are supplied to cover a wide range of transformer ratings. Pneumatically operated switches are available in the automated version of the system.",
    images: [ctPtRackImg, ctPtRackFrontViewImg, ctPtRackKnifeSwitchesImg],
  },
  {
    id: "rtd-temperature",
    title: "RTD Sensors, Junction Boxes & Temperature Scanner",
    preview: "PT100 sensors, RTD junction boxes and scanner for temperature-rise measurement.",
    description:
      "The temperature measurement system records oil and winding temperature during temperature-rise tests. It consists of PT100 RTD sensors (supplied in sets of 8, 12 or 16 as required), a multi-channel temperature scanner that displays and logs the readings, and RTD junction boxes for motor and generator temperature monitoring. The junction boxes, available in 32 or 48-channel configurations, provide accurate RTD signal termination and organized wiring, ensuring proper thermal protection and stable sensor performance for both machine sets.",
    images: [rtdJunctionBoxImg],
  },
  {
    id: "ngr-panel",
    title: "NGR Protection Panel",
    preview: "Neutral grounding resistor panel limiting earth-fault current.",
    description:
      "The Neutral Grounding Resistor (NGR) Protection Panel provides controlled grounding of the system neutral, limiting earth-fault current to a safe and manageable value. This improves system protection, minimizes equipment damage and supports continuity of operation. The NGR is of robust construction with high thermal withstand capability and complies with applicable electrical standards, and it works together with the generator protection panels.",
    images: [ngrPanelImg],
  },
  {
    id: "ups",
    title: "UPS for Control Supply",
    preview: "2 kVA / 5 kVA UPS with 30 minutes battery backup for control and protection circuits.",
    description:
      "A 2 kVA or 5 kVA UPS (230 V AC input and output, 50 Hz or 60 Hz as required) with battery provides 30 minutes of backup for the control desk, protection relays and indication circuits. It keeps the protection and instrumentation alive during a power dip or outage, so that a test can be shut down safely and readings are not lost.",
  },
    {
    id: "two-winding-changeover-panel",
    title: "Winding Changeover Panels (3-Phase & 1-Phase Testing)",
    preview: "Changeover panels to connect the test supply to the transformer windings.",
    description:
      "The Two Winding Changeover Panels connect the test supply to the windings of the transformer under test and allow the circuit to be changed over between the required connections. They are supplied as a pair, one panel for 3-phase testing and one for 1-phase testing, so that both types of transformer can be tested from the same facility. Changeover is performed manually under the operator's control from the control desk, and the panels are interlocked with the rest of the test circuit to prevent incorrect connections.",
  },
  {
    id: "control-power-panel",
    title: "Control cum Power Panel (Core Loss Testing System)",
    preview: "Combined control and power panel with MCCB incomer, metering and CT/PT selection.",
    description:
      "The Control cum Power Panel combines the power-switching and control functions of a compact testing system in one powder-coated sheet-steel enclosure. It houses an MCCB incomer, a multi-function meter with CT and face indication, a transformer overcurrent trip relay, the dimmer input contactor, the dimmer output CT, and the main CT/PT selector switches, together with all accessories required for testing. It forms the core of a complete core-loss testing system, which also includes a 3-phase 150 kVA transformer, a 3-phase 150 A motorized dimmer, a Yokogawa WT500 power analyzer and the matching CTs and PTs.",
  },

  // ---------- Filled in per quotation ----------
  {
    // Off by default. When ticked, the wizard asks which customer instruments and
    // equipment are integrated; that text is printed as this item's description.
    id: "customer-scope-hardware",
    title: "Integration of Customer Scope Hardware",
    preview: "Customer-supplied instruments and equipment integrated into the test system.",
    description: "",
  },
];