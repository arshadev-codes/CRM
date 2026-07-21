import type { SystemType } from "@/data/systemTypesData";
import { advancedSystemIntro } from "./advanced";
import { semiAutomaticSystemIntro } from "./semiAutomatic";
import { conventionalSystemIntro } from "./conventional";
import { advancedMajorSubsystems, type SubsystemContent } from "./majorSubsystems/advanced";
import { semiAutomaticMajorSubsystems } from "./majorSubsystems/semiAutomatic";
import { conventionalMajorSubsystems } from "./majorSubsystems/conventional";

export type { SubsystemContent };

export function getSystemIntro(systemType: SystemType) {
  switch (systemType) {
    case "SemiAutomatic": return semiAutomaticSystemIntro;
    case "Conventional": return conventionalSystemIntro;
    case "Advanced":
    case "FullyAutomatic":
    default: return advancedSystemIntro;
  }
}

export function getMajorSubsystems(systemType: SystemType): SubsystemContent[] {
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

export function getSubsystemById(systemType: SystemType, id: string): SubsystemContent | undefined {
  return getMajorSubsystems(systemType).find(s => s.id === id);
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