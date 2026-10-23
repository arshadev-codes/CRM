// The client requirement form (RFQ): every question, list and check in one place.
//
// Used by three readers, so it must stay plain TypeScript with no imports:
//   * the public form the client fills (src/components/rfq),
//   * the Enquiries pages in the office app (src/routes/enquiries.*),
//   * the enquiry-form Edge Function, which checks what arrives and emails it.
// Answers are saved by key (not by label), so a later step can turn them into a BOM.

export type Option = { key: string; label: string };

export const SYSTEM_TYPES: Option[] = [
  { key: "advanced", label: "Advanced Fully Automatic Transformer Testing System" },
  { key: "conventional", label: "Conventional Transformer Testing System" },
];

export const RATING_UNITS = ["kVA", "MVA"] as const;
export type RatingUnit = (typeof RATING_UNITS)[number];

export const FREQUENCIES: Option[] = [
  { key: "50", label: "50 Hz" },
  { key: "60", label: "60 Hz" },
  { key: "50/60", label: "50 / 60 Hz" },
];

export type Test = Option & { preselected: boolean };
export type TestGroup = { title: string; tests: Test[] };

/** The tests, ticked the way most customers want them (the client can change any). */
export const TEST_GROUPS: TestGroup[] = [
  {
    title: "Routine & Electrical Tests",
    tests: [
      { key: "ttr", label: "Voltage Ratio (TTR) Test", preselected: true },
      { key: "phase_displacement", label: "Phase Displacement Check", preselected: false },
      { key: "vector_group", label: "Vector Group Verification", preselected: false },
      { key: "polarity", label: "Polarity Test", preselected: true },
      { key: "winding_resistance", label: "Winding Resistance Measurement", preselected: true },
      { key: "ir", label: "Insulation Resistance Test (IR)", preselected: true },
      { key: "magnetic_balance", label: "Magnetic Balance Test", preselected: true },
    ],
  },
  {
    title: "Losses, Impedance & Thermal Tests",
    tests: [
      { key: "no_load_loss", label: "No-Load Loss (Core Loss) Test", preselected: true },
      { key: "load_loss", label: "Load Loss (Copper Loss) Test", preselected: true },
      { key: "short_circuit_lv", label: "Short-Circuit Test at Low Voltage", preselected: true },
      { key: "zero_sequence", label: "Zero-Sequence Impedance Test", preselected: true },
      { key: "excitation_current", label: "Excitation Current Measurement", preselected: true },
      { key: "temperature_rise", label: "Temperature Rise Test", preselected: true },
    ],
  },
  {
    title: "Dielectric, Over-Voltage & Impulse Tests",
    tests: [
      { key: "iovt", label: "Induced Over-Voltage Test (IOVT / DVDF)", preselected: true },
      {
        key: "applied_hv",
        label: "Separate Source AC Withstand Voltage Test (Applied HV Test)",
        preselected: true,
      },
      { key: "lv_applied", label: "LV Applied Voltage Withstand Test", preselected: false },
      { key: "lightning_impulse", label: "Lightning Impulse Test", preselected: false },
      { key: "switching_impulse", label: "Switching Impulse Test", preselected: false },
    ],
  },
  {
    title: "Diagnostic & Advanced Tests",
    tests: [
      { key: "pd", label: "Partial Discharge (PD) Measurement", preselected: false },
      { key: "tan_delta", label: "Capacitance & Tan Delta Test", preselected: false },
      { key: "sfra", label: "Sweep Frequency Response Analysis (SFRA / FRA)", preselected: false },
      { key: "harmonics", label: "Harmonic Analysis", preselected: false },
    ],
  },
];

export const STANDARDS: Option[] = [
  { key: "iec", label: "IEC" },
  { key: "is", label: "IS (Indian Standards)" },
  { key: "ieee", label: "IEEE" },
  { key: "utility", label: "Utility / Customer-Specific Standard" },
];

export const SCOPE_CHOICES: Option[] = [
  { key: "electrosoft", label: "Electrosoft Scope" },
  { key: "customer", label: "Customer Scope" },
  { key: "not_required", label: "Not Required" },
];

export const EQUIPMENT: Option[] = [
  { key: "main_mg_set", label: "Dimmer / Main M-G Set (as applicable)" },
  { key: "iovt_mg_set", label: "IOVT M-G Set" },
  { key: "hv_transformer", label: "HV Transformer" },
  { key: "hv_dimmer", label: "Independent Dimmer for HV Transformer" },
  { key: "booster_transformer", label: "Booster / Intermediate Transformer" },
  { key: "cts", label: "Current Transformers (CTs)" },
  { key: "pts", label: "Potential Transformers (PTs)" },
  { key: "ht_capacitor_bank", label: "HT Capacitor Bank" },
  { key: "ht_switching_panels", label: "HT Switching & Isolation Panels" },
  { key: "protection_panels", label: "Generator & Transformer Protection Panels for M-G Set" },
  { key: "excitation_panel", label: "Generator Excitation Control Panel for M-G Set" },
];

export const INSTRUMENTS: Option[] = [
  { key: "ratio_meter", label: "Ratio Meter" },
  { key: "ir_tester", label: "Insulation Resistance (IR) Tester" },
  { key: "winding_resistance_meter", label: "Winding Resistance Meter" },
  { key: "tan_delta_meter", label: "Capacitance & Tan Delta Meter" },
  { key: "power_analyzer", label: "Power Analyzer / Energy Meter" },
  { key: "sfra_kit", label: "SFRA / FRA Test Kit" },
  { key: "pd_system", label: "Partial Discharge (PD) Measurement System" },
];

export const YES_NO: Option[] = [
  { key: "yes", label: "Yes" },
  { key: "no", label: "No" },
];

export const LV_TROLLEYS: Option[] = [
  { key: "manual", label: "Manual LV Test Trolley" },
  { key: "automatic", label: "Fully Automatic LV Test Trolley (with PC & software)" },
  { key: "not_required", label: "Not Required" },
];

export const STEPS = [
  "Customer & Project Details",
  "Detail of Transformers to be Tested",
  "Scope of Supply",
  "Advanced Automation Options",
  "Final Remarks & Optional File upload",
];

export const NOTES = {
  systemType:
    "Select the type of test system you want us to quote for. Advanced Fully Automatic systems offer higher automation and software control with a 40-inch display, while Conventional systems are more manual. You may select both for comparison.",
  range:
    "Please specify the minimum and maximum transformer ratings that the test system should be capable of testing.",
  tests:
    "We have preselected tests that are commonly opted for typical transformer testing requirements. Please review and modify the selections as needed based on your specific test scope.",
  standards: "Please specify the testing standards applicable to your requirement.",
  scope:
    "For each item below, please specify whether it is to be supplied by Electrosoft, supplied by the customer, or not required.",
  panels:
    "When supplied by Electrosoft, Generator & Transformer Protection Panels and Excitation Control Panels enable a higher level of automation and seamless integration with the Transformer Testing System.",
  commercial:
    "Customers may procure high-value equipment and test instruments directly from manufacturers if preferred. Electrosoft-supplied items attract handling and integration charges (~10%), while customer-supplied items attract only integration charges. Customer procurement typically offers better cost optimization, whereas Electrosoft supply provides seamless integration and single-point system responsibility.",
  automation:
    "The following options apply primarily to Advanced Fully Automatic systems. Availability is subject to technical feasibility.",
  trolley:
    "A dedicated LV Test Trolley is used to perform LV-side tests close to the transformer under test. The fully automatic version includes PC and software, and exchanges control, monitoring, and test data seamlessly with the main test bench for unified reporting.",
  remarks: "Please mention any special test requirements, preferences, or clarifications.",
  files: "Upload transformer specifications, drawings, test requirements, etc. (if available)",
  privacy:
    "The information provided will be used only for technical evaluation and preparation of a suitable quotation. Electrosoft may contact you for clarification if required.",
};

/** The client's answers. Numbers stay as typed (text) so a half-filled form keeps them. */
export type RfqAnswers = {
  company: string;
  contactPerson: string;
  email: string;
  phoneCode: string;
  phone: string;
  systemTypes: string[];
  ratingMin: string;
  ratingMinUnit: string;
  ratingMax: string;
  ratingMaxUnit: string;
  hvMin: string;
  hvMax: string;
  lvMin: string;
  lvMax: string;
  impedanceMin: string;
  impedanceMax: string;
  frequency: string;
  tests: string[];
  standards: string[];
  equipment: Record<string, string>;
  instruments: Record<string, string>;
  isolatorTempRise: string;
  isolatorCapBank: string;
  lvTrolley: string;
  remarks: string;
};

export function emptyAnswers(): RfqAnswers {
  return {
    company: "",
    contactPerson: "",
    email: "",
    phoneCode: "+91",
    phone: "",
    systemTypes: [],
    ratingMin: "",
    ratingMinUnit: "",
    ratingMax: "",
    ratingMaxUnit: "",
    hvMin: "",
    hvMax: "",
    lvMin: "",
    lvMax: "",
    impedanceMin: "",
    impedanceMax: "",
    frequency: "",
    tests: TEST_GROUPS.flatMap((g) => g.tests.filter((t) => t.preselected).map((t) => t.key)),
    standards: [],
    equipment: {},
    instruments: {},
    isolatorTempRise: "",
    isolatorCapBank: "",
    lvTrolley: "",
    remarks: "",
  };
}

const LIMIT = { short: 200, remarks: 5000 };

const text = (v: unknown, max = LIMIT.short) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const oneOf = (v: unknown, options: readonly string[]) => {
  const s = text(v);
  return options.includes(s) ? s : "";
};
const someOf = (v: unknown, options: readonly string[]) =>
  Array.isArray(v) ? options.filter((o) => v.includes(o)) : [];
const choices = (v: unknown, items: Option[]) => {
  const out: Record<string, string> = {};
  const keys = SCOPE_CHOICES.map((c) => c.key);
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const item of items) {
      const choice = oneOf((v as Record<string, unknown>)[item.key], keys);
      if (choice) out[item.key] = choice;
    }
  }
  return out;
};
const keys = (options: Option[]) => options.map((o) => o.key);
const ALL_TESTS = TEST_GROUPS.flatMap((g) => g.tests.map((t) => t.key));

/** Whatever arrived (a saved draft, a request body), as answers with only known keys and values. */
export function cleanAnswers(raw: unknown): RfqAnswers {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const base = emptyAnswers();
  return {
    company: text(r.company),
    contactPerson: text(r.contactPerson),
    email: text(r.email).toLowerCase(),
    phoneCode: text(r.phoneCode, 6) || base.phoneCode,
    phone: text(r.phone, 20),
    systemTypes: someOf(r.systemTypes, keys(SYSTEM_TYPES)),
    ratingMin: text(r.ratingMin, 20),
    ratingMinUnit: oneOf(r.ratingMinUnit, RATING_UNITS),
    ratingMax: text(r.ratingMax, 20),
    ratingMaxUnit: oneOf(r.ratingMaxUnit, RATING_UNITS),
    hvMin: text(r.hvMin, 20),
    hvMax: text(r.hvMax, 20),
    lvMin: text(r.lvMin, 20),
    lvMax: text(r.lvMax, 20),
    impedanceMin: text(r.impedanceMin, 20),
    impedanceMax: text(r.impedanceMax, 20),
    frequency: oneOf(r.frequency, keys(FREQUENCIES)),
    tests: Array.isArray(r.tests) ? someOf(r.tests, ALL_TESTS) : base.tests,
    standards: someOf(r.standards, keys(STANDARDS)),
    equipment: choices(r.equipment, EQUIPMENT),
    instruments: choices(r.instruments, INSTRUMENTS),
    isolatorTempRise: oneOf(r.isolatorTempRise, keys(YES_NO)),
    isolatorCapBank: oneOf(r.isolatorCapBank, keys(YES_NO)),
    lvTrolley: oneOf(r.lvTrolley, keys(LV_TROLLEYS)),
    remarks: text(r.remarks, LIMIT.remarks),
  };
}

export type Errors = Partial<Record<string, string>>;

const number = (s: string) => (/^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN);
/** A rating in kVA, so "500 kVA" and "1 MVA" compare correctly. */
const kva = (value: string, unit: string) => number(value) * (unit === "MVA" ? 1000 : 1);

function range(
  errors: Errors,
  minKey: string,
  maxKey: string,
  min: number,
  max: number,
  minText: string,
  maxText: string,
) {
  if (!minText) errors[minKey] = "Required";
  else if (!(min >= 0)) errors[minKey] = "Enter a number";
  if (!maxText) errors[maxKey] = "Required";
  else if (!(max >= 0)) errors[maxKey] = "Enter a number";
  if (!errors[minKey] && !errors[maxKey] && min > max)
    errors[maxKey] = "Must not be less than the minimum";
}

/** What is missing or wrong on one step (0-4). Empty means the client may go on. */
export function stepErrors(step: number, a: RfqAnswers): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (!a.company) e.company = "Required";
    if (!a.contactPerson) e.contactPerson = "Required";
    if (!a.email) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) e.email = "Enter a valid email";
    const digits = a.phone.replace(/[\s-]/g, "");
    if (!digits) e.phone = "Required";
    else if (!/^\d{6,15}$/.test(digits)) e.phone = "Enter a valid number";
    if (!/^\+\d{1,4}$/.test(a.phoneCode)) e.phone = "Check the country code";
    if (!a.systemTypes.length) e.systemTypes = "Select at least one";
  }
  if (step === 1) {
    if (!a.ratingMinUnit) e.ratingMinUnit = "Required";
    if (!a.ratingMaxUnit) e.ratingMaxUnit = "Required";
    range(
      e,
      "ratingMin",
      "ratingMax",
      kva(a.ratingMin, a.ratingMinUnit),
      kva(a.ratingMax, a.ratingMaxUnit),
      a.ratingMin,
      a.ratingMax,
    );
    range(e, "hvMin", "hvMax", number(a.hvMin), number(a.hvMax), a.hvMin, a.hvMax);
    range(e, "lvMin", "lvMax", number(a.lvMin), number(a.lvMax), a.lvMin, a.lvMax);
    range(
      e,
      "impedanceMin",
      "impedanceMax",
      number(a.impedanceMin),
      number(a.impedanceMax),
      a.impedanceMin,
      a.impedanceMax,
    );
    if (!a.frequency) e.frequency = "Required";
  }
  if (step === 2) {
    for (const item of EQUIPMENT)
      if (!a.equipment[item.key]) e[`equipment.${item.key}`] = "Required";
    for (const item of INSTRUMENTS)
      if (!a.instruments[item.key]) e[`instruments.${item.key}`] = "Required";
  }
  return e;
}

export function allErrors(a: RfqAnswers): Errors {
  return Object.assign({}, ...STEPS.map((_, i) => stepErrors(i, a)));
}

export type SummaryRow = { label: string; value: string };
export type SummarySection = { title: string; rows: SummaryRow[] };

const label = (options: Option[], key: string) => options.find((o) => o.key === key)?.label ?? "";
const join = (...parts: string[]) => parts.filter(Boolean).join(" ");
const between = (min: string, max: string, unit = "") =>
  min || max ? `${join(min, unit)} to ${join(max, unit)}` : "";

/** The answers as readable sections, the way the form asks them (review screen, email, office). */
export function summarize(a: RfqAnswers): SummarySection[] {
  const scopeRows = (items: Option[], picked: Record<string, string>) =>
    items.map((i) => ({ label: i.label, value: label(SCOPE_CHOICES, picked[i.key] ?? "") }));
  return [
    {
      title: "Customer & Project Details",
      rows: [
        { label: "Company", value: a.company },
        { label: "Contact person", value: a.contactPerson },
        { label: "Email", value: a.email },
        { label: "Phone / WhatsApp", value: a.phone ? join(a.phoneCode, a.phone) : "" },
        {
          label: "Type of test system",
          value: a.systemTypes.map((k) => label(SYSTEM_TYPES, k)).join(", "),
        },
      ],
    },
    {
      title: "Range of Transformers to be Tested",
      rows: [
        {
          label: "Transformer rating",
          value:
            a.ratingMin || a.ratingMax
              ? `${join(a.ratingMin, a.ratingMinUnit)} to ${join(a.ratingMax, a.ratingMaxUnit)}`
              : "",
        },
        { label: "HV voltage", value: between(a.hvMin, a.hvMax, "kV") },
        { label: "LV voltage", value: between(a.lvMin, a.lvMax, "kV") },
        { label: "% Impedance", value: between(a.impedanceMin, a.impedanceMax, "%") },
        { label: "Frequency", value: label(FREQUENCIES, a.frequency) },
      ],
    },
    {
      title: "Tests to Be Performed",
      rows: [
        ...TEST_GROUPS.map((g) => ({
          label: g.title,
          value: g.tests
            .filter((t) => a.tests.includes(t.key))
            .map((t) => t.label)
            .join(", "),
        })),
        {
          label: "Applicable standards",
          value: a.standards.map((k) => label(STANDARDS, k)).join(", "),
        },
      ],
    },
    { title: "Equipment Scope", rows: scopeRows(EQUIPMENT, a.equipment) },
    { title: "Testing Instruments Scope", rows: scopeRows(INSTRUMENTS, a.instruments) },
    {
      title: "Advanced Automation & Switching Options",
      rows: [
        {
          label: "Motorized HT Isolator switch for Temperature Rise Test",
          value: label(YES_NO, a.isolatorTempRise),
        },
        {
          label: "Motorized HT Isolator switch with Earthing for HT Capacitor Bank",
          value: label(YES_NO, a.isolatorCapBank),
        },
        { label: "Type of LV Test Trolley", value: label(LV_TROLLEYS, a.lvTrolley) },
      ],
    },
    {
      title: "Final Remarks",
      rows: [{ label: "Special requirements / remarks", value: a.remarks }],
    },
  ];
}

// ---------- Files the client may attach ----------
export const MAX_FILES = 5;
export const MAX_FILE_MB = 10;
export const FILE_TYPES = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".dwg",
  ".dxf",
  ".zip",
];

export function fileProblem(name: string, size: number): string | null {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  if (!name.includes(".") || !FILE_TYPES.includes(ext))
    return `${name}: this file type is not accepted`;
  if (size > MAX_FILE_MB * 1024 * 1024) return `${name}: larger than ${MAX_FILE_MB} MB`;
  if (size <= 0) return `${name}: the file is empty`;
  return null;
}
