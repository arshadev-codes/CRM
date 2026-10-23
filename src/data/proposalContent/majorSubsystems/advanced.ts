// Full Major Subsystems content for ATTS (extracted from the reference proposal).
// Per Phase 1 spec, Semi-Automatic and Conventional fall back to this until
// dedicated content is added at majorSubsystems/semiAutomatic.ts and conventional.ts.

// Static image imports — Vite resolves these to real bundled file URLs,
// safe for Puppeteer to load at render time (unlike blob: or data: URLs
// generated at runtime). Drop the actual photo files into
// src/assets/subsystems/ using these exact filenames, or update the
// import paths below to match whatever filenames you use.
import testBenchImg from "@/assets/test-bench.png";
import xmerEdgeImg from "@/assets/xmer-edge.png";
import powerPanelImg from "@/assets/power-panel.png";
import lvTrolleyImg from "@/assets/lv-trolley.png";
//import htCapImg from "@/assets/subsystems/ht-capacitor-bank.jpg";
//import htIsolatorCapImg from "@/assets/subsystems/ht-isolator-capacitor.jpg";
import htIsolatorTrhImg from "@/assets/ht-isolator-temp-rise.png";
//import impulsePdImg from "@/assets/subsystems/impulse-pd-integration.jpg";
//import machineRoomImg from "@/assets/subsystems/machine-room-desk.jpg";
import instrumentsImg from "@/assets/instruments.png";
import safetyInterlockImg from "@/assets/safety-interlock.png";
import AdvancedFullyAutomaticImg from "@/assets/Advanced-test-bench.png";
import ReportingSoftwareImg from "@/assets/Reporting-Software.png";
import CloudReportingImg from "@/assets/Cloud-Report.png";

// A single selectable option for a subsystem that has more than one
// configuration (e.g. Fully Automatic vs Manual, Pneumatic vs Hand Operated).
// `title` and `description` here OVERRIDE the parent SubsystemContent's
// title/description in the PDF when this option is the active selection.
export interface SubsystemVariantOption {
  key: string;
  label: string;
  title: string;
  description: string;
  images?: string[];   // NEW — lets each variant show its own photo (e.g. Cloud vs Local screenshot)
}

export interface SubsystemImageSize {
  width: number;   // % of the text width, 10–100
  height: number;  // mm, 30–180
}

export interface SubsystemContent {
  id: string;
  title: string;
  preview: string;          // shown in wizard checkbox list ONLY
  description: string;      // full PDF body
  images?: string[];        // optional asset URLs — 1 (full width), 2, or 3 (side-by-side)
  // Optional size per image, same order as `images` (set from Settings).
  // width = % of the page's text width, height = mm. When absent, the
  // default layout above is used.
  imageSizes?: SubsystemImageSize[];
  // Optional — when present, the wizard shows a dropdown for this subsystem
  // and the selected option's title/description are used in the PDF instead
  // of the defaults above. `default` is the option `key` used when the
  // project has no explicit selection yet.
  variants?: {
    default: string;
    options: SubsystemVariantOption[];
  };
}

export const advancedMajorSubsystems: SubsystemContent[] = [
  {
    id: "test-bench",
    title: "Advanced Fully-automatic Transformer Test Bench",
    preview: "Centralised control station with 43\" HD display and laser printer.",
    description:
      "The Advanced Transformer Test Bench is a centralized and ergonomically designed control station that houses the industrial PC with a 43\" high-definition display and a mono laser printer for on-site report printing. It incorporates PLC-based advanced control and monitoring logic along with automated safety interlocks, trip circuits, and protection mechanisms. The bench includes integrated terminals for all test inputs and outputs, enabling seamless connection with all subsystems. Serving as the comman centre of the entire system, it allows the operator to control and monitor the entire test process directly through the software interface, ensuring reliability, safety, and ease of operation.",
    images: [AdvancedFullyAutomaticImg],
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
  title: "Electrosoft X'mer Edge™ — Report Generation Module",
  preview: "Cloud or on-premise report generation module for customised test reports.",
  description:
    " The Cloud-based Report Generation Module of Electrosoft X'mer Edge™ is a web-based application that allows users to generate customised transformer test reports. It accesses logged data from the test bench and produces neatly formatted PDF reports according to user-defined templates. This module ensures that all test results are documented accurately and professionally, facilitating easy sharing and record-keeping.",
  images: [CloudReportingImg],
  variants: {
    default: "cloud",
    options: [
      {
        key: "cloud",
        label: "Cloud",
        title: "Electrosoft X'mer Edge™ — Cloud-based Report Generation Module",
        description:
          " The Cloud-based Report Generation Module of Electrosoft X'mer Edge™ is a web-based application that allows users to generate customised transformer test reports. It accesses logged data from the test bench and produces neatly formatted PDF reports according to user-defined templates. This module ensures that all test results are documented accurately and professionally, facilitating easy sharing and record-keeping.",
        images: [CloudReportingImg],
      },
      {
        key: "local",
        label: "Local",
        title: "Electrosoft X'mer Edge™ — Report Generation Module",
        description:
          " The Report Generation Module of Electrosoft X'mer Edge™ is a web-based application that allows users to generate customised transformer test reports. It accesses logged data from the test bench and produces neatly formatted PDF reports according to user-defined templates. This module ensures that all test results are documented accurately and professionally, facilitating easy sharing and record-keeping.",
        images: [ReportingSoftwareImg],
      },
    ],
  },
},
   {
    id: "power-panel-generator",
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
    id: "power-panel-ht",
    title: "HT Panels.",
    preview: " Heavy-duty power distribution & switching panels.",
    description:
      "These panels are heavy-duty assemblies designed to manage and distribute the electrical power required for all major transformer tests. They house ACBs, MCCBs, contactors, protective relays, and suitably rated aluminium busbars engineered for the required thermal and fault withstand levels. They incorporate the necessary switching arrangements for DVDF and induced-voltage withstand tests, along with properly segregated circuits dedicated to no-load loss, load loss, high-voltage testing, and IOVT operations. All incoming and outgoing feeders are mapped to the test bench to facilitate fully automatic routing and switching under software control. Excitation panels offer Coarse and Fine controls for generators.",
    // images: [powerPanelImg],
  },
  {
    id: "power-panel-lt",
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
  {
    id: "machine-room",
    title: "Machine Room Control Desk & RIO Panel (Redundant / Conventional Test Bench)",
    preview: "Standalone manual control desk that runs the system without the SCADA console.",
    description:
      "The Machine room control desk is a dedicated manual-control test bench that houses all essential meters, selector switches, push buttons, and indication lamps required for conventional transformer testing. It is designed to provide a complete alternative method of conducting tests in situations where the PLC/SCADA-based automated system is unavailable or if the operator prefers manual control for specific tests. Every function managed through the Advanced 43\" Interface will also be accessible through this Machine room control desk via RIO Panel, ensuring complete manual control of the system whenever needed. The operator can seamlessly switch to manual mode at any time, allowing flexibility during testing or maintenance. The Machine room control desk is designed to operate as a fully independent test bench. Even if the Advanced Desk is completely disconnected or unavailable, all tests and operations can still be carried out without interruption using the standalone manual panel. This ensures maximum reliability, redundancy, and operational continuity for your test setup.",
   // images: [machineRoomImg],
  },
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