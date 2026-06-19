import type { SystemType } from "@/data/systemTypesData";
import { advancedSystemIntro } from "./advanced";
import { semiAutomaticSystemIntro } from "./semiAutomatic";
import { conventionalSystemIntro } from "./conventional";
import { advancedMajorSubsystems, type SubsystemContent } from "./majorSubsystems/advanced";
import { semiAutomaticMajorSubsystems } from "./majorSubsystems/semiAutomatic";
import { conventionalMajorSubsystems } from "./majorSubsystems/conventional";

export type { SubsystemContent };

// Page 3 system intro — one per system type, no fallback (each type has its own).
export function getSystemIntro(systemType: SystemType) {
  switch (systemType) {
    case "SemiAutomatic": return semiAutomaticSystemIntro;
    case "Conventional": return conventionalSystemIntro;
    case "Advanced":
    case "FullyAutomatic":
    default: return advancedSystemIntro;
  }
}

// Major Subsystems — resolves with permanent fallback to Advanced when the
// dedicated library for the system type is empty. This is intentional per spec
// and must NOT be removed once SATTS/CTTS content is added.
export function getMajorSubsystems(systemType: SystemType): SubsystemContent[] {
  let list: SubsystemContent[] = [];
  switch (systemType) {
    case "SemiAutomatic": list = semiAutomaticMajorSubsystems; break;
    case "Conventional":  list = conventionalMajorSubsystems; break;
    case "Advanced":
    case "FullyAutomatic":
    default: list = advancedMajorSubsystems;
  }
  return list.length ? list : advancedMajorSubsystems; // permanent fallback
}

// Lookup a single subsystem by id with the same fallback rule.
export function getSubsystemById(systemType: SystemType, id: string): SubsystemContent | undefined {
  return getMajorSubsystems(systemType).find(s => s.id === id);
}
