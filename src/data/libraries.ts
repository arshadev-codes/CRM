// Editable libraries. Each Settings page saves its edits in cmsOverrides under
// a `library:*` key, on top of the built-in list in src/data:
//   - an edited built-in item replaces its base copy in place
//   - added items go at the end
//   - `deleted` holds base ids that were removed OR replaced by an edited copy
// Everything that shows a library (wizard, PDF, new-project defaults) must read
// it through getLibrary / useLibrary, never the raw data array.
import { testsData, type TestItem } from "./testsData";
import { instrumentsData, type InstrumentRow } from "./instrumentsData";
import { equipmentData, type EquipmentRow } from "./equipmentData";
import { exclusionsData, type ExclusionItem } from "./exclusionsData";
import { makesOfSupplyData, type MakeRow } from "./makesOfSupplyData";
import { deliveryDefaults, deliveryDurationOptions, type DeliveryRow } from "./deliveryData";
import { proprietaryItemsData, type ProprietaryItem } from "./proprietaryItemsData";

export type LibraryOverride<T> = { items: T[]; deleted: string[] };

export function applyLibraryOverride<T extends { id: string }>(base: T[], ov?: LibraryOverride<T>): T[] {
  if (!ov) return base;
  const byId = new Map(ov.items.map(i => [i.id, i]));
  const deleted = new Set(ov.deleted);
  const out: T[] = [];
  for (const b of base) {
    const edited = byId.get(b.id);
    if (edited) out.push(edited);
    else if (!deleted.has(b.id)) out.push(b);
  }
  const baseIds = new Set(base.map(b => b.id));
  return [...out, ...ov.items.filter(i => !baseIds.has(i.id))];
}

export const LIBRARIES = {
  tests: { key: "library:tests", base: testsData },
  instruments: { key: "library:instruments", base: instrumentsData },
  equipment: { key: "library:equipment", base: equipmentData },
  exclusions: { key: "library:exclusions", base: exclusionsData },
  makes: { key: "library:makes", base: makesOfSupplyData },
  delivery: { key: "library:delivery", base: deliveryDefaults },
  proprietary: { key: "library:proprietary", base: proprietaryItemsData },
} as const;

export type LibraryName = keyof typeof LIBRARIES;
export type LibraryItem = {
  tests: TestItem; instruments: InstrumentRow; equipment: EquipmentRow; exclusions: ExclusionItem;
  makes: MakeRow; delivery: DeliveryRow; proprietary: ProprietaryItem;
};

export function getLibrary<N extends LibraryName>(name: N, cmsOverrides?: Record<string, unknown>): LibraryItem[N][] {
  const lib = LIBRARIES[name];
  const base = lib.base as unknown as LibraryItem[N][];
  return applyLibraryOverride(base, cmsOverrides?.[lib.key] as LibraryOverride<LibraryItem[N]> | undefined);
}

// Delivery duration choices are a plain list of words, saved whole.
export const DELIVERY_DURATIONS_KEY = "library:deliveryDurations";
export function getDeliveryDurations(cmsOverrides?: Record<string, unknown>): string[] {
  const ov = cmsOverrides?.[DELIVERY_DURATIONS_KEY];
  return Array.isArray(ov) && ov.length ? (ov as string[]) : deliveryDurationOptions;
}
