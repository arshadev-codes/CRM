// Full Major Subsystems content for ATTS (extracted from the reference proposal).
// Per Phase 1 spec, Semi-Automatic and Conventional fall back to this until
// dedicated content is added at majorSubsystems/semiAutomatic.ts and conventional.ts.

// Static image imports — Vite resolves these to real bundled file URLs,
// safe for Puppeteer to load at render time (unlike blob: or data: URLs
// generated at runtime). Drop the actual photo files into
// src/assets/subsystems/ using these exact filenames, or update the
// import paths below to match whatever filenames you use.
// import testBenchImg from "@/assets/test-bench.png";
import xmerEdgeImg from "@/assets/xmer-edge.png";
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
import FullyAutomaticTestBenchImg from "@/assets/Fully-Automatic-test-bench.png";
import ReportingSoftwareImg from "@/assets/Reporting-software.png";
import CloudReportingImg from "@/assets/Cloud-reporting.png";

export type { SubsystemContent };

export const fullyAutomaticMajorSubsystems: SubsystemContent[] = [
  {
    id: "test-bench",
    title: "Fully-automatic Transformer Test Bench",
    preview: "Centralised control station with 43\" HD display and laser printer.",
    description:
      "The Fully-automatic Transformer Test Bench is a centralized and ergonomically designed control station that houses the industrial PC with a 43\" high-definition display and a mono laser printer for on-site report printing. It incorporates PLC-based advanced control and monitoring logic along with automated safety interlocks, trip circuits, and protection mechanisms. The bench includes integrated terminals for all test inputs and outputs, enabling seamless connection with all subsystems. Serving as the common control centre of the entire system, it allows the operator to control and monitor the entire test process directly through the software interface, ensuring reliability, safety, and ease of operation.",
    images: [FullyAutomaticTestBenchImg],
  },
  {
    id: "xmer-edge-control",
    title: "Electrosoft X'mer Edge™ — Control & Monitoring Software.",
    preview: "Windows / SCADA-based control, monitoring and reporting suite.",
    description:
      "Electrosoft X'mer Edge™ is a Windows / SCADA-based software suite that orchestrates every transformer test from a single console: live data acquisition, fully automatic test sequencing, safety interlocks, alarms, historical trending and audit-ready record keeping. The integrated Report Generation Module prepares customised transformer test reports by accessing logged data and producing neatly formatted PDFs as per user-defined templates.",
    images: [xmerEdgeImg],
  },
   {
    id: "xmer-edge-report",
    title: "Electrosoft X'mer Edge™ — Report generation module",
    preview: "Web-based report generation module for customised test reports.",
    description:
      " The Report Generation Module of Electrosoft X'mer Edge™ is a web-based application that allows users to generate customised transformer test reports. It accesses logged data from the test bench and produces neatly formatted PDF reports according to user-defined templates. This module ensures that all test results are documented accurately and professionally, facilitating easy sharing and record-keeping.",
    images: [ReportingSoftwareImg],
  },
    {
    id: "xmer-edge-cloud",
    title: "Electrosoft X'mer Edge™ — Cloud-based report generation module",
    preview: "Cloud-based report generation module for customised test reports.",
    description:
      " The Cloud-based Report Generation Module of Electrosoft X'mer Edge™ is a web-based application that allows users to generate customised transformer test reports. It accesses logged data from the test bench and produces neatly formatted PDF reports according to user-defined templates. This module ensures that all test results are documented accurately and professionally, facilitating easy sharing and record-keeping.",
    images: [CloudReportingImg],
  },
  {
    id: "power-panel",
    title: "Generator Panels.",
    preview: "Heavy-duty power distribution & switching panels.",
    description:
      "These panels are heavy-duty assemblies designed to manage and distribute the electrical power required for all major transformer tests. They house ACBs, MCCBs, contactors, protective relays, and suitably rated aluminium busbars engineered for the required thermal and fault withstand levels. They incorporate the necessary switching arrangements for DVDF and induced-voltage withstand tests, along with properly segregated circuits dedicated to no-load loss, load loss, high-voltage testing, and IOVT operations. All incoming and outgoing feeders are mapped to the test bench to facilitate fully automatic routing and switching under software control. Excitation panels offer Coarse and Fine controls for generators.",
    images: [powerPanelImg],
  },
   {
    id: "excitation-power-panel",
    title: "Generator Excitation Panels.",
    preview: " Heavy-duty power distribution & switching panels.",
    description:
      "These panels are heavy-duty assemblies designed to manage and distribute the electrical power required for all major transformer tests. They house ACBs, MCCBs, contactors, protective relays, and suitably rated aluminium busbars engineered for the required thermal and fault withstand levels. They incorporate the necessary switching arrangements for DVDF and induced-voltage withstand tests, along with properly segregated circuits dedicated to no-load loss, load loss, high-voltage testing, and IOVT operations. All incoming and outgoing feeders are mapped to the test bench to facilitate fully automatic routing and switching under software control. Excitation panels offer Coarse and Fine controls for generators.",
    // images: [powerPanelImg],
  },
  {
    id: "ht-power-panel",
    title: "HT Panels.",
    preview: " Heavy-duty power distribution & switching panels.",
    description:
      "These panels are heavy-duty assemblies designed to manage and distribute the electrical power required for all major transformer tests. They house ACBs, MCCBs, contactors, protective relays, and suitably rated aluminium busbars engineered for the required thermal and fault withstand levels. They incorporate the necessary switching arrangements for DVDF and induced-voltage withstand tests, along with properly segregated circuits dedicated to no-load loss, load loss, high-voltage testing, and IOVT operations. All incoming and outgoing feeders are mapped to the test bench to facilitate fully automatic routing and switching under software control. Excitation panels offer Coarse and Fine controls for generators.",
    // images: [powerPanelImg],
  },
  {
    id: "lt-power-panel",
    title: "LT Panels",
    preview: " Heavy-duty power distribution & switching panels.",
    description:
      "These panels are heavy-duty assemblies designed to manage and distribute the electrical power required for all major transformer tests. They house ACBs, MCCBs, contactors, protective relays, and suitably rated aluminium busbars engineered for the required thermal and fault withstand levels. They incorporate the necessary switching arrangements for DVDF and induced-voltage withstand tests, along with properly segregated circuits dedicated to no-load loss, load loss, high-voltage testing, and IOVT operations. All incoming and outgoing feeders are mapped to the test bench to facilitate fully automatic routing and switching under software control. Excitation panels offer Coarse and Fine controls for generators.",
    // images: [powerPanelImg],
  },
  {
    id: "lv-trolley",
    title: "Fully Automatic LV Test Trolley",
    preview: "Portable LV test trolley with touch-screen interface.",
    description:
      "The Fully Automatic LV Test Trolley is a dedicated movable unit designed to perform all low-voltage diagnostic tests such as winding resistance, voltage ratio, phase displacement and vector group, magnetic balance, magnetizing current, insulation resistance, and polarization index. Its portable design allows it to be positioned close to the transformer LV bushings, reducing cable length and setup time. It is supplied with eight flexible, high-insulation (10 kV) test leads equipped with heavy-duty clips, and is operated through its built-in touch-screen interface where the operator simply selects the required test and presses \"Start\". All switching and sequencing occur automatically, and test data is captured directly into the X'mer Edge™ software for report generation. This separation of LV testing into a dedicated trolley greatly enhances accessibility, safety, operational speed, and overall test floor ergonomics.",
    images: [lvTrolleyImg],
    variants: {
      default: "fully-automatic",
      options: [
        {
          key: "fully-automatic",
          label: "Fully Automatic",
          title: "Fully Automatic LV Test Trolley",
          description:
            "The Fully Automatic LV Test Trolley is a dedicated movable unit designed to perform all low-voltage diagnostic tests such as winding resistance, voltage ratio, phase displacement and vector group, magnetic balance, magnetizing current, insulation resistance, and polarization index. Its portable design allows it to be positioned close to the transformer LV bushings, reducing cable length and setup time. It is supplied with eight flexible, high-insulation (10 kV) test leads equipped with heavy-duty clips, and is operated through its built-in touch-screen interface where the operator simply selects the required test and presses \"Start\". All switching and sequencing occur automatically, and test data is captured directly into the X'mer Edge™ software for report generation. This separation of LV testing into a dedicated trolley greatly enhances accessibility, safety, operational speed, and overall test floor ergonomics.",
        },
        {
          key: "manual",
          label: "Manual",
          title: "Manual LV Test Trolley",
          description:
            "The Manual LV Test Trolley is a dedicated movable unit designed to perform all low-voltage diagnostic tests such as winding resistance, voltage ratio, phase displacement and vector group, magnetic balance, magnetizing current, insulation resistance, and polarization index. Its portable design allows it to be positioned close to the transformer LV bushings, reducing cable length and setup time. It is supplied with eight flexible, high-insulation (10 kV) test leads equipped with heavy-duty clips, and is operated manually by the operator, who selects and sequences each test through panel-mounted selector switches and push buttons. Test data is captured directly into the X'mer Edge™ software for report generation. This separation of LV testing into a dedicated trolley greatly enhances accessibility, safety, and overall test floor ergonomics.",
        },
      ],
    },
  },
  {
    id: "ct-pt-rack",
    title: "CT-PT Rack with Pneumatic Knife Switches",
    preview: "Software-controlled CT/PT primary selection.",
    description:
      "The CT-PT rack is designed for automated primary selection and routing during CT-PT related tests. It uses pneumatic knife switches actuated through software-controlled logic integrated with the X'mer Edge™ platform. The system provides fail-safe actuation and feedback-based position confirmation to ensure the correct selection is made before any test is initiated. This arrangement enables fully automatic switching between various CT and PT combinations required during various tests.",
    images: [ctPtRackImg],
    variants: {
      default: "hand-operated",
      options: [
        {
          key: "hand-operated",
          label: "Hand Operated",
          title: "CT-PT Rack with Hand Operated Knife Switches",
          description:
            "The CT-PT rack is designed for primary selection and routing during CT-PT related tests. It uses hand operated knife switches that the operator switches manually to select the required CT and PT combination before any test is initiated. Clear labelling and mechanical positive-position detents help ensure the correct selection is made reliably during testing.",
        },
        {
          key: "pneumatic",
          label: "Pneumatic",
          title: "CT-PT Rack with Pneumatic Knife Switches",
          description:
            "The CT-PT rack is designed for automated primary selection and routing during CT-PT related tests. It uses pneumatic knife switches actuated through software-controlled logic integrated with the X'mer Edge™ platform. The system provides fail-safe actuation and feedback-based position confirmation to ensure the correct selection is made before any test is initiated. This arrangement enables fully automatic switching between various CT and PT combinations required during various tests.",
        },
      ],
    },
  },
  {
    id: "ht-cap",
    title: "HT Capacitor Bank",
    preview: "Reactive power support for no-load and IVW tests.",
    description:
      "The HT Capacitor Bank is a critical subsystem that supplies the reactive MVA required during tests such as no-load loss, load loss, induced-voltage withstand (DVDF), and other excitation-based high-voltage tests. It provides stable reactive power support, enabling controlled voltage buildup and maintaining required test voltages without overloading the power source. The capacitor bank works in coordination with the motorized HT isolator switch and integrated protection logic, allowing safe, interlocked energisation and de-energisation through software commands. Its inclusion ensures reliable and efficient testing of large EHV transformers up to 500 MVA, 765 kV.",
   // images: [htCapImg],
  },
   {
    id: "LT-cap",
    title: "LT Capacitor Bank",
    preview: "Reactive power support for no-load and IVW tests.",
    description:
      "The LT Capacitor Bank is a critical subsystem that supplies the reactive MVA required during tests such as no-load loss, load loss, induced-voltage withstand (DVDF), and other excitation-based high-voltage tests. It provides stable reactive power support, enabling controlled voltage buildup and maintaining required test voltages without overloading the power source. The capacitor bank works in coordination with the motorized LT isolator switch and integrated protection logic, allowing safe, interlocked energisation and de-energisation through software commands. Its inclusion ensures reliable and efficient testing of large EHV transformers up to 500 MVA, 765 kV.",
   // images: [ltCapImg],
  },
  {
    id: "ht-isolator-cap",
    title: "Motorized HT Isolator Switch with Earthing Mechanism (for HT Capacitor Bank)",
    preview: "Motorised isolator with interlocked earthing for HT capacitor bank.",
    description:
      "This motorized isolator switch provides safe and reliable connection and isolation of the HT capacitor bank. The motorized actuation eliminates manual operation and ensures consistent, interlocked switching controlled through the system logic. When combined with PLC-based interlocking, it prevents energisation unless the isolator is in the correct position, thereby enhancing operational safety and test reliability.",
    //images: [htIsolatorCapImg],
  },
  {
    id: "ht-isolator-trh",
    title: "Motorized HT Isolator Switch with Earthing Mechanism (for Temperature Rise Test)",
    preview: "Dedicated isolator for the temperature-rise test loading circuit.",
    description:
      "This motorized isolator switch is dedicated to safely isolating the high-voltage loading circuit used during temperature-rise testing. Motorized actuation allows the isolator to be operated remotely through software logic, preventing manual intervention in high-risk zones. Mechanical and electrical interlocks work in coordination with the control system to prevent incorrect operation and guarantee compliance with safe test procedures.",
    // images: [htIsolatorTrhImg],
  },
  {
    id: "impulse-pd",
    title: "Integration of Impulse Test System & PD Measurement System (Customer-Scope Hardware)",
    preview: "PLC/SCADA integration with customer-supplied LI and PD hardware.",
    description:
      "Although the impulse generator, impulse analyzer, PD detector, coupling capacitor, and associated hardware remain in the customer's scope, the proposed system provides full integration capability through PLC/SCADA interfacing. The test bench acquires data from the impulse analyzer, synchronizes it with test parameters, and logs partial discharge values where applicable. The LI and PD test results are automatically included in the final transformer test reports, allowing the operator to conduct, monitor, and document all core transformer tests from a single unified software platform. For this integration to function as offered, the customer-scope impulse and PD equipment must support communication through an appropriate interface.",
    //images: [impulsePdImg],
  },
  // {
  //   id: "machine-room",
  //   title: "Machine Room Control Desk & RIO Panel (Redundant / Conventional Test Bench)",
  //   preview: "Standalone manual control desk that runs the system without the SCADA console.",
  //   description:
  //     "The Machine room control desk is a dedicated manual-control test bench that houses all essential meters, selector switches, push buttons, and indication lamps required for conventional transformer testing. It is designed to provide a complete alternative method of conducting tests in situations where the PLC/SCADA-based automated system is unavailable or if the operator prefers manual control for specific tests. Every function managed through the Advanced 43\" Interface will also be accessible through this Machine room control desk via RIO Panel, ensuring complete manual control of the system whenever needed. The operator can seamlessly switch to manual mode at any time, allowing flexibility during testing or maintenance. The Machine room control desk is designed to operate as a fully independent test bench. Even if the Advanced Desk is completely disconnected or unavailable, all tests and operations can still be carried out without interruption using the standalone manual panel. This ensures maximum reliability, redundancy, and operational continuity for your test setup.",
  //  // images: [machineRoomImg],
  // },
  {
    id: "instruments",
    title: "Equipment and Instruments",
    preview: "CTs, PTs, MG sets, generator panels, meters and precision power analyzers.",
    description:
      "This subsystem comprises all essential testing and measurement devices required for transformer testing, including current transformers, potential transformers, motor-generator (MG) sets, generator protection panels, excitation panels, digital meters, and precision power analyzers. These instruments form the measurement backbone of the entire facility, ensuring accurate acquisition of electrical parameters across all tests. Each device is selected for compatibility with the X'mer Edge™ software and the test bench interfaces, ensuring stable communication and reliable data capture. Together, these instruments support every test from LV diagnostics to HV withstand tests by providing high-quality, standards-compliant measurement capability.",
    images: [instrumentsImg],
  },
  {
    id: "safety-interlock",
    title: "High Voltage Area Safety Interlock System",
    preview: "SIL-rated zone protection — door interlocks, E-stops, indicators.",
    description:
      "The High Voltage Area Safety Interlock System is designed to protect personnel and equipment in the high-voltage test zone. It comprises door interlocks, emergency stop chains, beacon indicators, audible warning hooters, and trapped-key arrangements that work in coordination with the PLC. The interlock logic ensures that the HV circuit cannot be energised unless the zone is verified clear and all access doors are securely closed, providing a fail-safe environment for routine and type testing.",
    images: [safetyInterlockImg],
  },
];