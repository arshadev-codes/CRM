import type { SystemType } from "../systemTypesData";

export interface PageContent {
  title: string;
  intro?: string;
  body?: string;
  bullets?: string[];
}

// Per-system content. Page 1 (RFQ) and page 2 (intro letter) and page 3 (statement of requirement)
// are dynamic from store; this map covers pages 4–24 narrative content.
type PageMap = Record<string, PageContent>;

const sharedPageTitles: Record<string, string> = {
  page4:  "System Overview",
  page5:  "Test Bench Architecture",
  page6:  "Power Source and Control",
  page7:  "Measurement System",
  page8:  "Safety and Interlocks",
  page9:  "Software and Reporting",
  page10: "Calibration and Standards",
  page11: "Mechanical Layout",
  page12: "Single Line Diagram",
  page13: "Connection Diagrams",
  page14: "Technical Specifications",
  page15: "Scope of Supply",
  page16: "Scope of Services",
  page17: "Exclusions",
  page18: "Makes of Supply",
  page19: "Delivery Schedule",
  page20: "Payment Terms",
  page21: "Terms and Conditions",
  page22: "Warranty",
  page23: "Validity and Acceptance",
  page24: "Annexure",
};

function buildPages(systemType: SystemType, accent: string): PageMap {
  const out: PageMap = {};
  for (const [key, title] of Object.entries(sharedPageTitles)) {
    out[key] = {
      title,
      intro: `${title} — ${accent}`,
      body: `This page describes the ${title.toLowerCase()} for the ${systemType} variant of the transformer testing system. Replace this professional placeholder copy in src/data/pageContent/${systemType.toLowerCase()}/ with the approved engineering narrative.`,
      bullets: [
        `${accent} configuration tailored to the specified transformer rating and voltage class.`,
        `Compliance with IEC 60076, IEEE C57 and customer-specified standards.`,
        `Modular architecture for future capacity expansion.`,
      ],
    };
  }
  return out;
}

export const pageContent: Record<SystemType, PageMap> = {
  Advanced:       buildPages("Advanced",       "Flagship fully-automated"),
  FullyAutomatic: buildPages("FullyAutomatic", "Premium automated"),
  SemiAutomatic:  buildPages("SemiAutomatic",  "Standard semi-automated"),
  Conventional:   buildPages("Conventional",   "Economy manual"),
};
