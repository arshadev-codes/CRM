import type { Project } from "@/store/proposalStore";
import { TotalPagesProvider } from "./PdfPage";
import { useDynamicPageCounts } from "@/hooks/useDynamicPageCounts";
import { RFQPdf } from "./pages/RFQPdf";
import { IntroLetterPdf } from "./pages/IntroLetterPdf";
import { RequirementPdf } from "./pages/RequirementPdf";
import { SystemIntroPdf } from "./pages/SystemIntroPdf";
import { SubsystemsPdf } from "./pages/SubsystemsPdf";
import { ConnectionsTestsPdf } from "./pages/ConnectionsTestsPdf";
import { SystemLayoutPdf } from "./pages/SystemLayoutPdf";
import { ScopeOfSupplyPdf } from "./pages/ScopeOfSupplyPdf";
import { EquipmentInstrumentsPdf } from "./pages/EquipmentInstrumentsPdf";
import { ScopeOfServicesPdf } from "./pages/ScopeOfServicesPdf";
import { ExclusionsMakesPdf } from "./pages/ExclusionsMakesPdf";
import { CommercialTermsPdf } from "./pages/CommercialTermsPdf";
import { TermsPdf } from "./pages/TermsPdf";

// FALLBACK page counts, used only until each dynamic section finishes its
// real measurement pass and reports back via the registry. These are just
// "good enough to render something on first paint" guesses — every number
// downstream self-corrects once real counts arrive. Tune these to roughly
// match typical project sizes so the on-screen flicker window (fallback →
// real) is as small as possible, but they are NOT relied on for correctness.
const FALLBACK_SUBSYSTEMS_PAGES = 6;
const FALLBACK_SCOPE_PAGES = 3;
const FALLBACK_TERMS_PAGES = 2;

// data-pdf-settled is a plain DOM attribute (not a class, not styling) that
// Puppeteer can poll for before calling page.pdf(). It flips to "true" only
// once every dynamic section (Subsystems, ScopeOfSupply, Terms) has reported
// its REAL measured page count at least once — i.e. the whole document's
// page numbering is finally stable and won't shift on a later render.
//
// Example Puppeteer wait (in your export route, not this file):
//   await page.waitForSelector('[data-pdf-settled="true"]', { timeout: 15000 });
export function AllPages({ project }: { project: Project }) {
  const { isSettled, getCount, report } = useDynamicPageCounts();

  const subsystemsPages = getCount("subsystems", FALLBACK_SUBSYSTEMS_PAGES);
  const scopePages = getCount("scopeOfSupply", FALLBACK_SCOPE_PAGES);
  const termsPages = getCount("terms", FALLBACK_TERMS_PAGES);

  // ── Page number accounting ─────────────────────────────────────────────
  // All three dynamic counts above come from the SAME registry snapshot, so
  // every value below is computed from a single consistent state — never a
  // mix of "some real, some stale" numbers across one render.
  let p = 1;
  const rfqPage         = p++;
  const introPage       = p++;
  const systemPage      = p++;
  const requirementPage = p++;
  const subsysStart     = p; p += Math.max(1, subsystemsPages);
  const connectionsPage = p++;
  const layoutPage      = p++;
  const scopeStart      = p; p += Math.max(1, scopePages);
  const eqInsPage       = p++;
  const servicesPage    = p++;
  const exclusionsPage  = p++;
  const commercialPage  = p++;
  const termsStart      = p; p += Math.max(1, termsPages);

  const totalPages = p - 1;

  return (
    <TotalPagesProvider value={totalPages}>
      <div className="proposal-print" data-pdf-settled={isSettled ? "true" : "false"}>
        <RFQPdf project={project} />
        {/* <IntroLetterPdf project={project} /> */}
        <RequirementPdf project={project} />
        <SystemIntroPdf project={project} pageNumber={systemPage} />   
        <SubsystemsPdf
          project={project}
          startPage={subsysStart}
          onPageCountKnown={report("subsystems")}
        />
        <ConnectionsTestsPdf project={project} pageNumber={connectionsPage} />
        <SystemLayoutPdf project={project} pageNumber={layoutPage} />
        <ScopeOfSupplyPdf
          project={project}
          startPage={scopeStart}
          onPageCountKnown={report("scopeOfSupply")}
        />
        <EquipmentInstrumentsPdf project={project} pageNumber={eqInsPage} />
        <ScopeOfServicesPdf project={project} pageNumber={servicesPage} />
        <ExclusionsMakesPdf project={project} pageNumber={exclusionsPage} />
        <CommercialTermsPdf project={project} pageNumber={commercialPage} />
        <TermsPdf
          project={project}
          startPage={termsStart}
          onPageCountKnown={report("terms")}
        />
        <span className="hidden">{rfqPage}{introPage}{requirementPage}</span>
      </div>
    </TotalPagesProvider>
  );
}