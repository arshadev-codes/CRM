import type { Project } from "@/store/proposalStore";
import { RFQPdf } from "./pages/RFQPdf";
import { IntroLetterPdf } from "./pages/IntroLetterPdf";
import { RequirementPdf } from "./pages/RequirementPdf";
import { ScopeOfSupplyPdf } from "./pages/ScopeOfSupplyPdf";
import { StubPage } from "./pages/StubPage";

// Maps page number → renderer. Pages 1, 2, 3, 15 are real; rest are stubs.
export function AllPages({ project }: { project: Project }) {
  const stubKeys: Record<number, string> = {
    4: "page4", 5: "page5", 6: "page6", 7: "page7", 8: "page8",
    9: "page9", 10: "page10", 11: "page11", 12: "page12", 13: "page13",
    14: "page14", 16: "page16", 17: "page17", 18: "page18",
    19: "page19", 20: "page20", 21: "page21", 22: "page22", 23: "page23", 24: "page24",
  };
  return (
    <div className="proposal-print">
      <RFQPdf project={project} />
      <IntroLetterPdf project={project} />
      <RequirementPdf project={project} />
      {[4,5,6,7,8,9,10,11,12,13,14].map(n => <StubPage key={n} project={project} pageNumber={n} pageKey={stubKeys[n]} />)}
      <ScopeOfSupplyPdf project={project} pageNumber={15} />
      {[16,17,18,19,20,21,22,23,24].map(n => <StubPage key={n} project={project} pageNumber={n} pageKey={stubKeys[n]} />)}
    </div>
  );
}
