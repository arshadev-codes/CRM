// src/data/freightLogisticsData.ts
//
// Single source of truth for the Freight & Logistics type, dropdown options,
// and defaults — shared between the wizard step (Step6Delivery) and the
// CommercialTermsPdf renderer, so the two never drift out of sync.

export type FreightLogisticsData = {
  freightCharges: string;
  destination: string;
  source: string;
  sourceCustom?: string;
  modeOfTransport: string;
  modeOfTransportCustom?: string;
  incoterms: string;
  incotermsCustom?: string;
  transitInsurance: string;
  transitInsuranceCustom?: string;
  liabilityNote: string;
};

export const TRANSIT_INSURANCE_DEFAULT =
  "Not in our scope — buyer may insure at their discretion";

export const freightChargesOptions = [
  "Inclusive",
  "Extra as actual (chargeable)",
  "To be borne by buyer",
  "Custom",
];

export const sourceOptions = [
  "Vadodara, Gujarat",
  "Custom",
];

export const modeOfTransportOptions = [
  "By Road",
  "By Rail",
  "By Air",
  "Custom",
];

export const incotermsOptions = [
  "CFR (Cost & Freight)",
  "FOB (Free on Board)",
  "CIF (Cost, Insurance & Freight)",
  "Ex-Works",
  "Custom",
];

export const transitInsuranceOptions = [
  TRANSIT_INSURANCE_DEFAULT,
  "Insurance included by us",
  "Custom",
];

export const freightLogisticsDefaults: FreightLogisticsData = {
  freightCharges: "Inclusive",
  destination: "",
  source: "Vadodara, Gujarat",
  sourceCustom: "",
  modeOfTransport: "By Road",
  modeOfTransportCustom: "",
  incoterms: "CFR (Cost & Freight)",
  incotermsCustom: "",
  transitInsurance: TRANSIT_INSURANCE_DEFAULT,
  transitInsuranceCustom: "",
  liabilityNote: "Our liability ends once the goods leave our factory premises.",
};