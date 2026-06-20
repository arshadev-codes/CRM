import type { Project } from "@/store/proposalStore";
import { TotalPagesProvider } from "./PdfPage";
import { RFQPdf } from "./pages/RFQPdf";
import { IntroLetterPdf } from "./pages/IntroLetterPdf";
import { RequirementPdf } from "./pages/RequirementPdf";
import { SystemIntroPdf } from "./pages/SystemIntroPdf";
import { SubsystemsPdf, subsystemsPageCount } from "./pages/SubsystemsPdf";
import { ConnectionsTestsPdf } from "./pages/ConnectionsTestsPdf";
import { SystemLayoutPdf } from "./pages/SystemLayoutPdf";
import { ScopeOfSupplyPdf, scopeOfSupplyPageCount } from "./pages/ScopeOfSupplyPdf";
import { EquipmentInstrumentsPdf } from "./pages/EquipmentInstrumentsPdf";
import { ScopeOfServicesPdf } from "./pages/ScopeOfServicesPdf";
import { ExclusionsMakesPdf } from "./pages/ExclusionsMakesPdf";
import { CommercialTermsPdf } from "./pages/CommercialTermsPdf";
import { TermsPdf, termsPageCount } from "./pages/TermsPdf";

// Dynamically composes all PDF pages and computes page numbers in one place.
// Each section reports how many pages it consumes so that headers/footers stay
// in sync regardless of how much content the user has selected.
export function AllPages({ project }: { project: Project }) {
  let p = 1;
  const rfqPage = p++;          // 1
  const introPage = p++;        // 2
  const systemPage = p++;       // 3
  const requirementPage = p++;  // 4
  const subsysStart = p; p += Math.max(1, subsystemsPageCount(project));
  const connectionsPage = p++;
  const layoutPage = p++;
  const scopeStart = p; p += Math.max(1, scopeOfSupplyPageCount(project));
  const eqInsPage = p++;
  const servicesPage = p++;
  const exclusionsPage = p++;
  const commercialPage = p++;
  const termsStart = p; p += termsPageCount();

  const totalPages = p - 1;

  return (
    <TotalPagesProvider value={totalPages}>
      <div className="proposal-print">
        <RFQPdf project={project} />
        <IntroLetterPdf project={project} />
        <SystemIntroPdf project={project} pageNumber={systemPage} />
        <RequirementPdf project={project} />
        <SubsystemsPdf project={project} startPage={subsysStart} />
        <ConnectionsTestsPdf project={project} pageNumber={connectionsPage} />
        <SystemLayoutPdf project={project} pageNumber={layoutPage} />
        <ScopeOfSupplyPdf project={project} startPage={scopeStart} />
        <EquipmentInstrumentsPdf project={project} pageNumber={eqInsPage} />
        <ScopeOfServicesPdf project={project} pageNumber={servicesPage} />
        <ExclusionsMakesPdf project={project} pageNumber={exclusionsPage} />
        <CommercialTermsPdf project={project} pageNumber={commercialPage} />
        <TermsPdf startPage={termsStart} />
        <span className="hidden">{rfqPage}{introPage}{requirementPage}</span>
      </div>
    </TotalPagesProvider>
  );
}
