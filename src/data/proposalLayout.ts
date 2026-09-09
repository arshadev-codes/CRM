import type { DynamicSectionKey } from "@/hooks/useDynamicPageCounts";

/**
 * Registry of every section that can appear in the generated proposal, in the
 * approved default order. A project's `data.layout` may reorder / disable them
 * and store per-section edited HTML, without touching the PDF page components.
 */
export interface SectionDef {
  id: string;
  label: string;
  /** Sections whose page count is only known after a measurement pass */
  dynamic?: DynamicSectionKey;
  /** Page-count guess used until measurement reports back */
  fallbackPages?: number;
}

export const PROPOSAL_SECTIONS: SectionDef[] = [
  { id: "rfq", label: "RFQ / Cover" },
  { id: "toc", label: "Table of Contents" },
  { id: "requirement", label: "Requirement" },
  { id: "systemIntro", label: "System Introduction" },
  { id: "subsystems", label: "Major Subsystems", dynamic: "subsystems", fallbackPages: 6 },
  { id: "connections", label: "Tests & Connections" },
  { id: "systemLayout", label: "System Layout" },
  { id: "scopeOfSupply", label: "Scope of Supply", dynamic: "scopeOfSupply", fallbackPages: 3 },
  { id: "equipmentInstruments", label: "Equipment & Instruments" },
  { id: "scopeOfServices", label: "Scope of Services" },
  { id: "exclusionsMakes", label: "Exclusions & Makes" },
  { id: "commercial", label: "Commercial Terms" },
  { id: "terms", label: "Terms & Conditions", dynamic: "terms", fallbackPages: 2 },
];

export const SECTION_BY_ID: Record<string, SectionDef> = Object.fromEntries(
  PROPOSAL_SECTIONS.map((s) => [s.id, s]),
);

/** Wizard steps, shared by the wizard itself and the "customized project" picker. */
export const WIZARD_STEP_DEFS = [
  { key: "setup", label: "Project Setup" },
  { key: "tests", label: "Tests" },
  { key: "subsystems", label: "Major Sub Systems" },
  { key: "layout", label: "System Layout" },
  { key: "inst-eq", label: "Instruments & Equipment" },
  { key: "proprietary", label: "Proprietary Items" },
  { key: "delivery", label: "Delivery" },
  { key: "excl-makes", label: "Exclusions & Makes" },
  { key: "pricing", label: "Pricing" },
  { key: "payment", label: "Payment" },
  { key: "review", label: "Review" },
] as const;

export type WizardStepKey = (typeof WIZARD_STEP_DEFS)[number]["key"];

export interface LayoutSection {
  id: string;
  enabled: boolean;
}

export interface ProposalLayout {
  /** Wizard step keys the user wants to fill in, in order */
  steps: string[];
  /** Proposal sections in render order, with on/off flags */
  sections: LayoutSection[];
  /** Per-section edited HTML captured from the preview editor */
  htmlOverrides: Record<string, string>;
}

export function defaultLayout(): ProposalLayout {
  return {
    steps: WIZARD_STEP_DEFS.map((s) => s.key),
    sections: PROPOSAL_SECTIONS.map((s) => ({ id: s.id, enabled: true })),
    htmlOverrides: {},
  };
}

/**
 * Normalises a possibly-partial/legacy layout: unknown ids dropped, newly
 * added sections/steps appended so older projects keep working.
 */
export function resolveLayout(layout?: ProposalLayout | null): ProposalLayout {
  const base = defaultLayout();
  if (!layout) return base;

  const known = new Set(PROPOSAL_SECTIONS.map((s) => s.id));
  const seen = new Set<string>();
  const sections: LayoutSection[] = [];
  for (const s of layout.sections ?? []) {
    if (!known.has(s.id) || seen.has(s.id)) continue;
    seen.add(s.id);
    sections.push({ id: s.id, enabled: s.enabled !== false });
  }
  for (const s of base.sections) if (!seen.has(s.id)) sections.push(s);

  const knownSteps = new Set<string>(WIZARD_STEP_DEFS.map((s) => s.key));
  const steps = (layout.steps ?? []).filter((k, i, arr) => knownSteps.has(k) && arr.indexOf(k) === i);

  return {
    steps: steps.length ? steps : base.steps,
    sections,
    htmlOverrides: layout.htmlOverrides ?? {},
  };
}

/** Ordered ids of the sections that should actually render. */
export function enabledSectionIds(layout?: ProposalLayout | null): string[] {
  return resolveLayout(layout).sections.filter((s) => s.enabled).map((s) => s.id);
}

export interface SavedProposalTemplate {
  id: string;
  name: string;
  createdAt: number;
  layout: ProposalLayout;
}
