import { useProposalStore } from "@/store/proposalStore";
import { getLibrary, getDeliveryDurations, type LibraryItem, type LibraryName } from "@/data/libraries";

/** A library with the Settings edits applied (see src/data/libraries.ts). */
export function useLibrary<N extends LibraryName>(name: N): LibraryItem[N][] {
  const cmsOverrides = useProposalStore(s => s.cmsOverrides);
  return getLibrary(name, cmsOverrides);
}

export function useDeliveryDurations(): string[] {
  const cmsOverrides = useProposalStore(s => s.cmsOverrides);
  return getDeliveryDurations(cmsOverrides);
}
