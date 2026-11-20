import type { SystemType } from "@/data/systemTypesData";
import { applyLibraryOverride, type LibraryOverride } from "@/data/libraries";
import { advancedSystemIntro } from "./advanced";
import { semiAutomaticSystemIntro } from "./semiAutomatic";
import { conventionalSystemIntro } from "./conventional";
import { fullyAutomaticSystemIntro } from "./fullyAutomatic";
import { advancedMajorSubsystems, type SubsystemContent, type SubsystemImageSize } from "./majorSubsystems/advanced";
import { semiAutomaticMajorSubsystems } from "./majorSubsystems/semiAutomatic";
import { conventionalMajorSubsystems } from "./majorSubsystems/conventional";
import { fullyAutomaticMajorSubsystems } from "./majorSubsystems/fullyAutomatic";

export type { SubsystemContent, SubsystemImageSize };

export function getSystemIntro(systemType: SystemType) {
  switch (systemType) {
    case "SemiAutomatic": return semiAutomaticSystemIntro;
    case "Conventional": return conventionalSystemIntro;
    case "FullyAutomatic": return fullyAutomaticSystemIntro;
    case "Advanced":
    default: return advancedSystemIntro;
  }
}

/** The built-in library only, without Settings edits. */
export function getBaseMajorSubsystems(systemType: SystemType): SubsystemContent[] {
  let list: SubsystemContent[] = [];
  switch (systemType) {
    case "SemiAutomatic": list = semiAutomaticMajorSubsystems; break;
    case "Conventional":  list = conventionalMajorSubsystems; break;
    case "FullyAutomatic": list = fullyAutomaticMajorSubsystems; break;
    case "Advanced":
    default: list = advancedMajorSubsystems;
  }
  return list.length ? list : advancedMajorSubsystems;
}

/**
 * Subsystem ids that were renamed. Saved quotations and Settings edits made
 * before a rename still hold the old id; fixSubsystemId maps it to the new one.
 */
const RENAMED_SUBSYSTEM_IDS: Record<string, string> = {
  " ht-power-panel": "ht-power-panel", // Semi-automatic id had a stray leading space
};
export const fixSubsystemId = (id: string) => RENAMED_SUBSYSTEM_IDS[id] ?? id;

/** Rewrites old subsystem ids inside a saved quotation's data (selection, variants, prices). */
export function fixSubsystemIdsInData<
  T extends { selectedSubsystems?: string[]; subsystemVariants?: Record<string, string>; pricing?: { scopeOfSupply?: Record<string, unknown> } },
>(data: T): T {
  if (!data) return data;
  const renameKeys = <V,>(rec?: Record<string, V>) =>
    rec && Object.keys(rec).some(k => k in RENAMED_SUBSYSTEM_IDS)
      ? Object.fromEntries(Object.entries(rec).map(([k, v]) => [fixSubsystemId(k), v]))
      : rec;
  const selected = data.selectedSubsystems;
  const needsFix =
    selected?.some(id => id in RENAMED_SUBSYSTEM_IDS) ||
    renameKeys(data.subsystemVariants) !== data.subsystemVariants ||
    renameKeys(data.pricing?.scopeOfSupply) !== data.pricing?.scopeOfSupply;
  if (!needsFix) return data;
  return {
    ...data,
    selectedSubsystems: selected?.map(fixSubsystemId),
    subsystemVariants: renameKeys(data.subsystemVariants),
    ...(data.pricing ? { pricing: { ...data.pricing, scopeOfSupply: renameKeys(data.pricing.scopeOfSupply) } } : {}),
  };
}

/** Ticked per quotation; the wizard asks which customer hardware is integrated. */
export const CUSTOMER_SCOPE_ID = "customer-scope-hardware";

/**
 * Subsystems that are never ticked on their own: they come with another one.
 * Ticking Machine Room Control Desk brings in the RIO Panel, at position 2.
 */
export const COMPANION_SUBSYSTEMS: Record<string, string> = { "machine-room": "rio-panel" };
const COMPANION_IDS = new Set(Object.values(COMPANION_SUBSYSTEMS));
export const isCompanionSubsystem = (id: string) => COMPANION_IDS.has(id);
/** Position a companion is put at in the list (0-based: 1 = second). */
const COMPANION_POSITION = 1;

/** Not ticked in a new quotation: companions, and items filled in per quotation. */
export const isOffByDefault = (id: string) => isCompanionSubsystem(id) || id === CUSTOMER_SCOPE_ID;

/**
 * The subsystems a quotation shows, in PDF order: the ticked ones, plus each
 * ticked item's companion (RIO Panel) at position 2. The customer-scope item
 * gets the text typed for it in the wizard as its description.
 */
export function quotationSubsystems(
  all: SubsystemContent[],
  data: { selectedSubsystems: string[]; customerScopeHardware?: string },
): SubsystemContent[] {
  const ids = new Set(data.selectedSubsystems);
  const list = all.filter(s => (ids.has(s.id) || ids.has(s.title)) && !isCompanionSubsystem(s.id));
  for (const [owner, companionId] of Object.entries(COMPANION_SUBSYSTEMS)) {
    if (!list.some(s => s.id === owner)) continue;
    const companion = all.find(s => s.id === companionId);
    if (companion) list.splice(Math.min(COMPANION_POSITION, list.length), 0, companion);
  }
  return list.map(s =>
    s.id === CUSTOMER_SCOPE_ID ? { ...s, description: data.customerScopeHardware?.trim() || s.description } : s,
  );
}

// Settings → Major Sub Systems stores its edits in cmsOverrides under this key.
// `deleted` holds base ids that were removed OR replaced by an edited copy in `items`.
export type SubsystemOverride = LibraryOverride<SubsystemContent>;
export const subsystemsCmsKey = (st: SystemType) => `subsystems:${st}`;

/** Library with Settings edits applied: edited items stay in place, new ones go at the end. */
export const applySubsystemOverride = (base: SubsystemContent[], ov?: SubsystemOverride) => applyLibraryOverride(base, ov);

/**
 * The library the quotation uses. Pass the store's cmsOverrides so Settings edits
 * show up in the wizard and PDF; without it only the built-in list is returned.
 */
export function getMajorSubsystems(systemType: SystemType, cmsOverrides?: Record<string, unknown>): SubsystemContent[] {
  const base = getBaseMajorSubsystems(systemType);
  const ov = cmsOverrides?.[subsystemsCmsKey(systemType)] as SubsystemOverride | undefined;
  // Settings edits saved under an old id still apply to the renamed item.
  const fixedOv = ov && {
    items: ov.items.map(i => ({ ...i, id: fixSubsystemId(i.id) })),
    deleted: ov.deleted.map(fixSubsystemId),
  };
  return applySubsystemOverride(base, fixedOv);
}

export function getSubsystemById(systemType: SystemType, id: string, cmsOverrides?: Record<string, unknown>): SubsystemContent | undefined {
  return getMajorSubsystems(systemType, cmsOverrides).find(s => s.id === id);
}

// ── NEW: single source of truth for resolving a subsystem's ACTIVE
// variant content. Every place that shows a subsystem's title/description/
// images (Step 3 wizard, Step 9 pricing, ScopeOfSupplyPdf, SubsystemsPdf)
// must go through these instead of reading s.title / s.description / s.images
// directly — otherwise the selected variant (e.g. "Manual") gets silently
// ignored and the DEFAULT variant's content leaks through instead.
function activeVariantOption(s: SubsystemContent, variants?: Record<string, string>) {
  if (!s.variants) return undefined;
  const activeKey = variants?.[s.id] ?? s.variants.default;
  return s.variants.options.find(o => o.key === activeKey);
}

export function resolveSubsystemTitle(s: SubsystemContent, variants?: Record<string, string>): string {
  return activeVariantOption(s, variants)?.title ?? s.title;
}

export function resolveSubsystemDescription(s: SubsystemContent, variants?: Record<string, string>): string {
  return activeVariantOption(s, variants)?.description ?? s.description;
}

export function resolveSubsystemImages(s: SubsystemContent, variants?: Record<string, string>): string[] | undefined {
  return activeVariantOption(s, variants)?.images ?? s.images;
}