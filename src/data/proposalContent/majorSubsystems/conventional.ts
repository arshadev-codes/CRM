// import testBenchImg from "@/assets/test-bench.png";
import powerPanelImg from "@/assets/power-panel.png";
import lvTrolleyImg from "@/assets/lv-trolley.png";
import ctPtRackImg from "@/assets/ct-pt-rack.png";
//import htCapImg from "@/assets/subsystems/ht-capacitor-bank.jpg";
//import htIsolatorCapImg from "@/assets/subsystems/ht-isolator-capacitor.jpg";
import htIsolatorTrhImg from "@/assets/ht-isolator-temp-rise.png";
//import impulsePdImg from "@/assets/subsystems/impulse-pd-integration.jpg";
//import machineRoomImg from "@/assets/subsystems/machine-room-desk.jpg";
import instrumentsImg from "@/assets/instruments.png";
import safetyInterlockImg from "@/assets/safety-interlock.png";
import type { SubsystemContent } from "./advanced";
import ConventionalTestBenchImg from "@/assets/Conventional-test-bench.png";
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
    images: [powerPanelImg],
  },
  {
    id: "excitation-power-panel",
    title: "Generator Excitation Panels.",
    preview: "Heavy-duty power distribution & switching panels, manually operated.",
    description:
      "These panels are heavy-duty assemblies designed to manage and distribute the electrical power required for all major transformer tests. They house ACBs, MCCBs, contactors, protective relays, and suitably rated aluminium busbars engineered for the required thermal and fault withstand levels. They incorporate the necessary switching arrangements for DVDF and induced-voltage withstand tests, along with properly segregated circuits dedicated to no-load loss, load loss, high-voltage testing, and IOVT operations. All incoming and outgoing feeders are routed to the control desk for manual switching and operation by the operator. Excitation panels offer Coarse and Fine controls for generators, operated through panel-mounted selector switches.",
  },
  {
    id: "ht-power-panel",
    title: "HT Panels.",
    preview: "Heavy-duty power distribution & switching panels, manually operated.",
    description:
      "These panels are heavy-duty assemblies designed to manage and distribute the electrical power required for all major transformer tests. They house ACBs, MCCBs, contactors, protective relays, and suitably rated aluminium busbars engineered for the required thermal and fault withstand levels. They incorporate the necessary switching arrangements for DVDF and induced-voltage withstand tests, along with properly segregated circuits dedicated to no-load loss, load loss, high-voltage testing, and IOVT operations. All incoming and outgoing feeders are routed to the control desk for manual switching and operation by the operator.",
  },
  {
    id: "lt-power-panel",
    title: "LT Panels",
    preview: "Heavy-duty power distribution & switching panels, manually operated.",
    description:
      "These panels are heavy-duty assemblies designed to manage and distribute the electrical power required for all major transformer tests. They house ACBs, MCCBs, contactors, protective relays, and suitably rated aluminium busbars engineered for the required thermal and fault withstand levels. They incorporate the necessary switching arrangements for DVDF and induced-voltage withstand tests, along with properly segregated circuits dedicated to no-load loss, load loss, high-voltage testing, and IOVT operations. All incoming and outgoing feeders are routed to the control desk for manual switching and operation by the operator.",
  },
  {
    id: "lv-trolley",
    title: "Manual LV Test Trolley",
    preview: "Portable LV test trolley with panel-mounted selector switches.",
    description:
      "The Manual LV Test Trolley is a dedicated movable unit designed to perform all low-voltage diagnostic tests such as winding resistance, voltage ratio, phase displacement and vector group, magnetic balance, magnetizing current, insulation resistance, and polarization index. Its portable design allows it to be positioned close to the transformer LV bushings, reducing cable length and setup time. It is supplied with eight flexible, high-insulation (10 kV) test leads equipped with heavy-duty clips, and is operated manually by the operator, who selects and sequences each test through panel-mounted selector switches and push buttons. Test readings are recorded manually by the operator from the panel meters. This separation of LV testing into a dedicated trolley greatly enhances accessibility, safety, and overall test floor ergonomics.",
    images: [lvTrolleyImg],
  },
  {
    id: "ct-pt-rack",
    title: "CT-PT Rack with Hand Operated Knife Switches",
    preview: "Manually operated CT/PT primary selection.",
    description:
      "The CT-PT rack is designed for primary selection and routing during CT-PT related tests. It uses hand operated knife switches that the operator switches manually to select the required CT and PT combination before any test is initiated. Clear labelling and mechanical positive-position detents help ensure the correct selection is made reliably during testing.",
    images: [ctPtRackImg],
  },
  {
    id: "ht-cap",
    title: "HT Capacitor Bank",
    preview: "Reactive power support for no-load and IVW tests.",
    description:
      "The HT Capacitor Bank is a critical subsystem that supplies the reactive MVA required during tests such as no-load loss, load loss, induced-voltage withstand (DVDF), and other excitation-based high-voltage tests. It provides stable reactive power support, enabling controlled voltage buildup and maintaining required test voltages without overloading the power source. The capacitor bank works in coordination with the manually operated HT isolator switch, allowing safe, interlocked energisation and de-energisation through operator-controlled switching. Its inclusion ensures reliable and efficient testing of large EHV transformers up to 500 MVA, 765 kV.",
  },
  {
    id: "LT-cap",
    title: "LT Capacitor Bank",
    preview: "Reactive power support for no-load and IVW tests.",
    description:
      "This manually operated isolator switch provides safe and reliable connection and isolation of the HT capacitor bank. Operation is carried out directly by the operator through a hand-operated mechanism, with mechanical and electrical interlocks preventing energisation unless the isolator is in the correct position, thereby enhancing operational safety and test reliability.",
  },
  {
    id: "ht-isolator-trh",
    title: "Manually Operated HT Isolator Switch with Earthing Mechanism (for Temperature Rise Test)",
    preview: "Dedicated isolator for the temperature-rise test loading circuit.",
    description:
      "This manually operated isolator switch is dedicated to safely isolating the high-voltage loading circuit used during temperature-rise testing. Operation is carried out directly by the operator at the switch location, with mechanical and electrical interlocks preventing incorrect operation and guaranteeing compliance with safe test procedures.",
    // images: [htIsolatorTrhImg],
  },
  {
    id: "impulse-pd",
    title: "Integration of Impulse Test System & PD Measurement System (Customer-Scope Hardware)",
    preview: "Manual coordination with customer-supplied LI and PD hardware.",
    description:
      "Although the impulse generator, impulse analyzer, PD detector, coupling capacitor, and associated hardware remain in the customer's scope, the conventional test bench provides the necessary terminal connections and circuit segregation to support these tests. Data acquired from the impulse analyzer and PD detector is recorded manually by the operator and compiled into the final transformer test reports alongside the core test results, allowing all tests to be conducted, monitored, and documented from the conventional control desk.",
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
];