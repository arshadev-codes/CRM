import type { Project } from "@/store/proposalStore";
import { RFQPdf } from "./pages/RFQPdf";
import { IntroLetterPdf } from "./pages/IntroLetterPdf";
import { RequirementPdf } from "./pages/RequirementPdf";
import { SystemIntroPdf } from "./pages/SystemIntroPdf";
import { SubsystemsPdf } from "./pages/SubsystemsPdf";
import { ConnectionsTestsPdf } from "./pages/ConnectionsTestsPdf";
import { SystemLayoutPdf } from "./pages/SystemLayoutPdf";
import { ScopeOfSupplyPdf } from "./pages/ScopeOfSupplyPdf";
import { StubPage } from "./pages/StubPage";

export function AllPages({ project }: { project: Project }) {
  return (
    <div className="proposal-print">
      <RFQPdf project={project} />
      <IntroLetterPdf project={project} />
      <SystemIntroPdf project={project} pageNumber={3} />
      <RequirementPdf project={project} />
      <SubsystemsPdf project={project} startPage={5} />
      <ConnectionsTestsPdf project={project} pageNumber={6} />
      <SystemLayoutPdf project={project} pageNumber={7} />
      {[8,9,10,11,12,13,14].map(n => <StubPage key={n} project={project} pageNumber={n} pageKey={`page${n}`} />)}
      <ScopeOfSupplyPdf project={project} pageNumber={15} />
      {[16,17,18,19,20,21,22,23,24].map(n => <StubPage key={n} project={project} pageNumber={n} pageKey={`page${n}`} />)}
    </div>
  );
}
