import type { SystemType } from "@/data/systemTypesData";
import { applyLibraryOverride, type LibraryOverride } from "@/data/libraries";
import { advancedSystemIntro } from "./advanced";
import { semiAutomaticSystemIntro } from "./semiAutomatic";
import { conventionalSystemIntro } from "./conventional";
import { advancedMajorSubsystems, type SubsystemContent, type SubsystemImageSize } from "./majorSubsystems/advanced";
import { semiAutomaticMajorSubsystems } from "./majorSubsystems/semiAutomatic";
import { conventionalMajorSubsystems } from "./majorSubsystems/conventional";

export type { SubsystemContent, SubsystemImageSize };

export function getSystemIntro(systemType: SystemType) {
  switch (systemType) {
    case "SemiAutomatic": return semiAutomaticSystemIntro;
    case "Conventional": return conventionalSystemIntro;
    case "Advanced":
    case "FullyAutomatic":
    default: return advancedSystemIntro;
  }
}

/** The built-in library only, without Settings edits. */
export function getBaseMajorSubsystems(systemType: SystemType): SubsystemContent[] {
  let list: SubsystemContent[] = [];
  switch (systemType) {
    case "SemiAutomatic": list = semiAutomaticMajorSubsystems; break;
    case "Conventional":  list = conventionalMajorSubsystems; break;
    case "Advanced":
    case "FullyAutomatic":
    default: list = advancedMajorSubsystems;
  }
  return list.length ? list : advancedMajorSubsystems;
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
  return applySubsystemOverride(base, cmsOverrides?.[subsystemsCmsKey(systemType)] as SubsystemOverride | undefined);
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