import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { employeesData } from "@/data/employeesData";
import { useProposalStore } from "@/store/proposalStore";

// Names come from the live list (people added in Settings), falling back to the seed.
const personName = (id: string) =>
  [...useProposalStore.getState().employees, ...employeesData].find(e => e.id === id)?.name ?? id;

export function IntroLetterPdf({ project }: { project: Project }) {
  const { customer, meta, systemType, transformer } = project.data;
  const prep = personName(meta.preparedBy);
  return (
    <PdfPage pageNumber={2}>
      <h2 className="text-[14px] font-bold text-blue-800 border-b border-blue-200 pb-1">Executive Summary</h2>
      <p className="text-[10px] mt-3 leading-relaxed">
        Dear {customer.title} {customer.contactPerson || "Sir/Madam"},
      </p>
      <p className="text-[10px] mt-2 leading-relaxed">
        We are pleased to submit our techno-commercial proposal for the <strong>{systemType}</strong> transformer
        testing system for the {transformer.rating} {transformer.ratingUnit}, {transformer.voltage} {transformer.voltageUnit} class transformers
        to be tested at {customer.companyShortName || customer.companyFullName || "your facility"}.
      </p>
      <p className="text-[10px] mt-2 leading-relaxed">
        This document is organised into a technical section describing the system architecture, sub-systems,
        and test methodology, followed by a commercial section covering scope of supply, scope of services,
        exclusions, makes of supply, delivery, and payment terms.
      </p>
      <div className="mt-8 text-[10px]">
        <div className="font-bold text-slate-700">Best regards,</div>
        <div className="mt-6">{prep}</div>
        <div className="text-slate-500">Electrosoft Automation Pvt. Ltd.</div>
      </div>
    </PdfPage>
  );
}
