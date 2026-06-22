import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { testsData } from "@/data/testsData";
import { systemConfiguration } from "@/data/systemConfiguration";

export function RequirementPdf({ project }: { project: Project }) {
  const { selectedTests, systemType, transformer } = project.data;
  const cfg = systemConfiguration[systemType];
  const selected = testsData.filter(t => selectedTests.includes(t.id));
  return (
    <PdfPage pageNumber={3}>
      <div className="bg-blue-200  px-3 py-1.5 font-bold text-[14px] italic text-black-800">
        Statement of Requirements:
      </div>
      <p className="text-[13px] mt-3 leading-relaxed">
        The transformer testing system shall be capable of conducting the following tests on a {transformer.rating} {transformer.ratingUnit},
        {" "}{transformer.voltage} {transformer.voltageUnit} class transformer as per IEC 60076 and the customer-specified standards:
      </p>
      <ol className="mt-3 text-[13px] space-y-1 list-decimal pl-5 ml-8 text-black-900">
        {selected.map(t => <li key={t.id}>{t.title}</li>)}
      </ol>
      <p className="mt-5 text-[13px] font-bold pl-4">
        Note: Impulse generator shall be capable of conducting LI test on the rated insulation level of the transformer.
      </p>
      <div className="bg-green-100 px-3 py-1.5 font-bold text-[14px] italic text-black-800 mt-10">
        Proposed solution:
      </div>
      <p className="text-[13px] mt-5 leading-relaxed">
        We propose our <strong>{systemType}</strong> transformer testing system, featuring software inclusion: <strong>{cfg.software}</strong>,
        LV test trolley: <strong>{cfg.lvTrolley}</strong>. The complete architecture, sub-systems, and reporting capabilities
        are described in the following pages.
      </p>
    </PdfPage>
  );
}
