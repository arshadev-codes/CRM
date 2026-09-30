import type { Database } from "@/integrations/supabase/types";

// Pre-Dispatch Inspection (PDI): one report per panel, filled in before the panel is packed.
// Sections follow the Electrosoft PDI form. "check" sections need every box ticked; "matrix"
// sections need Checked OK or Not applicable on every row; "choice" is a single Yes / N/A.

export type PdiRow = Database["public"]["Tables"]["pdi_reports"]["Row"];
export type PdiPatch = Database["public"]["Tables"]["pdi_reports"]["Update"];
export type PdiCategory = "electrical" | "automation";
export type PdiAnswer = true | "ok" | "na" | "yes";
export type PdiResponses = Record<string, PdiAnswer>;

export type PdiSection = {
  key: string;
  title: string;
  kind: "check" | "matrix" | "choice";
  items: { key: string; label: string }[];
  // Shown only for automation panels (PLC / SCADA).
  plcOnly?: boolean;
};

export const PDI_CATEGORIES: { value: PdiCategory; label: string; hint: string }[] = [
  { value: "electrical", label: "Electrical Control Panel", hint: "No PLC" },
  { value: "automation", label: "Automation Panel", hint: "PLC / SCADA" },
];

function items(prefix: string, labels: string[]) {
  return labels.map((label, index) => ({ key: `${prefix}_${index + 1}`, label }));
}

export const READINESS_ITEM = "docs_7";

export const PDI_SECTIONS: PdiSection[] = [
  {
    key: "mech_a",
    title: "General mechanical & enclosure checks (A)",
    kind: "check",
    items: items("mech_a", [
      "Panel enclosure free from dents, rust, paint peel, or deformation",
      "Panel cleaned internally and externally",
      "Correct enclosure size and fabrication as per approved GA",
      "Gaskets installed properly on all doors and covers",
      "Panel doors open and close smoothly",
      "Door locks and handles function properly",
    ]),
  },
  {
    key: "mech_b",
    title: "General mechanical & enclosure checks (B)",
    kind: "matrix",
    items: items("mech_b", [
      "Lifting hooks provided and securely fixed",
      "Wall mount brackets provided and securely fixed",
      "Acrylic free from cracks or excessive scratches",
    ]),
  },
  {
    key: "gland",
    title: "Gland plate, glands & cable entry",
    kind: "matrix",
    items: items("gland", [
      "Gland plate fixed securely to panel",
      "Gland plate holes cut neatly and deburred",
      "Gland plate painted / treated after cutting",
      "Correct type and size of cable glands fitted",
      "All cable glands tightened properly and sealed",
      "Unused gland holes closed with dummy plugs",
    ]),
  },
  {
    key: "labels_a",
    title: "Nameplates, labels & identification (A)",
    kind: "check",
    items: items("labels_a", [
      "Panel nameplate fixed and matches approved drawing",
      "Panel serial number label pasted inside the panel",
      "Panel serial number label pasted outside the panel",
      "Component labels pasted on components",
      "Component labels pasted on mounting plate",
      "Cable ferrules provided at both ends",
      "All labels have correct spellings and correct feeder numbers",
      "Terminal markers present and marked in order as per drawing",
    ]),
  },
  {
    key: "labels_b",
    title: "Nameplates, labels & identification (B)",
    kind: "matrix",
    items: items("labels_b", [
      "Electrosoft manufacturer label installed",
      "Electrosoft brand label installed",
      "Cable alley and busbar section labels provided",
      "Danger / High Voltage warning labels affixed",
      "Earthing labels provided at earthing points",
    ]),
  },
  {
    key: "clean",
    title: "Internal cleanliness",
    kind: "check",
    items: items("clean", [
      "No tools left inside the panel",
      "No loose wires, lugs, screws or cut pieces inside the panel",
      "Panel free from dust and metal chips",
    ]),
  },
  {
    key: "earth_a",
    title: "Earthing & safety (A)",
    kind: "matrix",
    items: items("earth_a", [
      "Earthing connection provided on exterior of enclosure (Earthing bolt / Busbar)",
    ]),
  },
  {
    key: "earth_b",
    title: "Earthing & safety (B)",
    kind: "check",
    items: items("earth_b", [
      "Panel body properly earthed",
      "Panel body and door shorted using earthing wire",
      "Earth continuity checked",
    ]),
  },
  {
    key: "component",
    title: "Component & testing",
    kind: "check",
    items: items("component", [
      "All components installed as per approved BOM",
      "Component ratings match design",
      "Terminal tightness verified",
      "IR test carried out",
      "Control wiring continuity checks completed",
      "Power wiring checks completed",
      "Panel functional test completed and passed",
    ]),
  },
  {
    key: "ops",
    title: "Additional operational checks",
    kind: "matrix",
    items: items("ops", [
      "MCB / MCCB / ACB ratings and settings verified",
      "Protection relays configured correctly",
      "VFD configured correctly",
      "Interlocks verified",
      "Indication lamps working",
      "Push buttons / selectors working",
      "Meter wiring and polarity verified",
      "All meters configured correctly",
      "Space heater/s installed and tested",
    ]),
  },
  {
    key: "plc",
    title: "Additional checks for PLC panels",
    kind: "check",
    plcOnly: true,
    items: items("plc", [
      "PLC model and CPU verified",
      "I/O modules installed as per drawing",
      "Addressing and slot configuration verified",
      "I/O wiring verified",
      "Shielding and grounding done correctly",
      "PLC program loaded",
      "SCADA / HMI configuration loaded",
      "Communication and functionality tested",
      "Final PLC/SCADA programs saved in server",
    ]),
  },
  {
    key: "ip54",
    title: "IP54 paper test",
    kind: "choice",
    items: [
      { key: "ip54_1", label: "For IP54 and above panels, paper test carried out and passed?" },
    ],
  },
  {
    key: "docs",
    title: "Documentation",
    kind: "check",
    items: items("docs", [
      "All applicable test reports prepared and stored in server",
      "Test reports reviewed and satisfactory",
      "Test reports placed inside drawing compartment / inside panel",
      "As-built drawing with BOM placed inside drawing compartment / inside panel",
      "Panel door close photograph taken and stored on server",
      "Panel door open photograph taken and stored on server",
      "Panel readiness date updated in Inward Orders",
    ]),
  },
];

export const DECLARATION =
  "I confirm that all above checks are physically carried out and panel is ready for dispatch.";

export function sectionsFor(category: PdiCategory | "") {
  return PDI_SECTIONS.filter((section) => !section.plcOnly || category === "automation");
}

export function isAnswered(section: PdiSection, value: PdiAnswer | undefined) {
  if (section.kind === "check") return value === true;
  if (section.kind === "matrix") return value === "ok" || value === "na";
  return value === "yes" || value === "na";
}

export function sectionProgress(section: PdiSection, responses: PdiResponses) {
  const done = section.items.filter((item) => isAnswered(section, responses[item.key])).length;
  return { done, total: section.items.length, complete: done === section.items.length };
}

export function reportProgress(category: PdiCategory | "", responses: PdiResponses) {
  let done = 0;
  let total = 0;
  for (const section of sectionsFor(category)) {
    const progress = sectionProgress(section, responses);
    done += progress.done;
    total += progress.total;
  }
  return { done, total, complete: total > 0 && done === total };
}

// Answer every item of a section in one go: ticked, or Checked OK / Yes.
export function allOk(section: PdiSection): PdiResponses {
  const value: PdiAnswer =
    section.kind === "check" ? true : section.kind === "matrix" ? "ok" : "yes";
  return Object.fromEntries(section.items.map((item) => [item.key, value]));
}

// "ESP-2410-07" → "ESP-2410-08", so the next panel of the same order is one tap away.
export function nextSerial(serial: string) {
  const match = serial.match(/^(.*?)(\d+)(\D*)$/);
  if (!match) return "";
  const [, head, digits, tail] = match;
  return `${head}${String(Number(digits) + 1).padStart(digits.length, "0")}${tail}`;
}

/* ---------- Who is filling the form ---------- */

export type DispatchIdentity = {
  firstName: string;
  lastName: string;
  email: string;
  verifiedAt: string;
};

const IDENTITY_KEY = "dispatch_identity";
// A verified sign-in lasts for a working day on this browser.
const IDENTITY_TTL = 12 * 60 * 60 * 1000;

export function fullName(identity: Pick<DispatchIdentity, "firstName" | "lastName">) {
  return [identity.firstName, identity.lastName].filter(Boolean).join(" ");
}

export function loadIdentity(): DispatchIdentity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const identity = JSON.parse(raw) as DispatchIdentity;
    if (Date.now() - new Date(identity.verifiedAt).getTime() > IDENTITY_TTL) return null;
    return identity.email && identity.firstName ? identity : null;
  } catch {
    return null;
  }
}

export function saveIdentity(identity: DispatchIdentity | null) {
  try {
    if (identity) localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
    else localStorage.removeItem(IDENTITY_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
