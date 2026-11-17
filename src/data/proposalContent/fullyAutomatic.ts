// Page 3: System Introduction — Fully Automatic system.
// Static content. User MUST NOT edit. Only appears in PDF.
// Starts as a copy of the Advanced introduction (what Fully Automatic
// quotations showed before it had its own file) — edit it here to make the
// Fully Automatic introduction its own.
import { advancedSystemIntro } from "./advanced";

export const fullyAutomaticSystemIntro: typeof advancedSystemIntro = {
  ...advancedSystemIntro,
  realWorld: { ...advancedSystemIntro.realWorld },
  highlights: advancedSystemIntro.highlights.map(h => ({ ...h })),
};
