import type { ProposalData } from "@/store/proposalStore";

/** The Subject line made from the transformer details, used when none is typed. */
export function autoSubject({ transformer, systemType }: Pick<ProposalData, "transformer" | "systemType">): string {
  return `Techno-commercial offer for ${transformer.rating} ${transformer.ratingUnit}, ${transformer.voltage}${transformer.voltageUnit} Transformer Testing System - ${systemType}`;
}

/** The Subject printed on the first page: the typed one, else the automatic one. */
export function proposalSubject(data: Pick<ProposalData, "transformer" | "systemType" | "meta">): string {
  return data.meta.subject?.trim() || autoSubject(data);
}
