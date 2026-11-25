import { createContext, useContext, type ReactNode } from "react";

/**
 * Which document is generated from a quotation:
 *  - techno:     Techno-Commercial Offer — the complete offer (every section, with prices)
 *  - technical:  Technical Offer — the same document without any prices or commercial terms
 *  - commercial: Commercial Offer — cover, contents, the pricing tables, Scope of Services,
 *                Exclusions, Makes of Supply, Commercial Terms, Delivery Schedule, General T&C
 */
export type OfferType = "techno" | "technical" | "commercial";

export const OFFER_TYPES: { id: OfferType; label: string; short: string; description: string }[] = [
  {
    id: "techno",
    label: "Techno-Commercial Offer",
    short: "Techno-commercial",
    description: "The complete offer: every technical section and all prices.",
  },
  {
    id: "technical",
    label: "Technical Offer",
    short: "Technical",
    description: "The complete offer without prices: the price columns and Commercial Terms are left out.",
  },
  {
    id: "commercial",
    label: "Commercial Offer",
    short: "Commercial",
    description:
      "Cover, contents, the pricing tables, Scope of Services, Exclusions, Makes of Supply, Commercial Terms, Delivery Schedule and General T&C.",
  },
];

export const offerInfo = (t: OfferType) => OFFER_TYPES.find(o => o.id === t) ?? OFFER_TYPES[0];
export const parseOfferType = (v: unknown): OfferType =>
  v === "technical" || v === "commercial" ? v : "techno";

const OfferTypeContext = createContext<OfferType>("techno");

export function OfferTypeProvider({ value, children }: { value: OfferType; children: ReactNode }) {
  return <OfferTypeContext.Provider value={value}>{children}</OfferTypeContext.Provider>;
}

export const useOfferType = () => useContext(OfferTypeContext);
/** False in the Technical Offer: tables are printed without price columns. */
export const useShowPrices = () => useContext(OfferTypeContext) !== "technical";
