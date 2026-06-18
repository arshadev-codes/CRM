import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { employeesData } from "@/data/employeesData";

export function RFQPdf({ project }: { project: Project }) {
  const { customer, meta, transformer, systemType } = project.data;
  const prep = employeesData.find(e => e.id === meta.preparedBy)?.name ?? meta.preparedBy;
  const chk  = employeesData.find(e => e.id === meta.checkedBy)?.name ?? meta.checkedBy;
  const subject = `Techno-commercial offer for ${transformer.rating} ${transformer.ratingUnit}, ${transformer.voltage} ${transformer.voltageUnit} Transformer Testing System — ${systemType}`;
  return (
    <PdfPage pageNumber={1}>
      <table className="w-full text-[10px] border border-slate-300 mt-2">
        <tbody>
          <Row label="To" value={`${customer.title} ${customer.contactPerson || "—"}`} />
          <Row label="Name of the company" value={customer.companyFullName || "—"} />
          <Row label="Subject" value={subject} />
          <Row label="Our reference" value={meta.offerNumber} />
          <Row label="Date" value={meta.date} />
        </tbody>
      </table>
      <table className="w-full text-[10px] border border-slate-300 mt-5">
        <tbody>
          <Row label="Prepared by" value={prep} />
          <Row label="Checked by" value={chk} />
          <Row label="Revision no. & date" value={`${meta.revision} — ${meta.date}`} />
          <Row label="Contact Address" value={`Electrosoft Automation Pvt. Ltd.\nS7-1&2, Jai Matadi Compound, Thane-Bhiwandi Road,\nKalher, Thane District, Maharashtra, India – 421302\nTel. No. +91 8692 888 444`} />
        </tbody>
      </table>
      <p className="mt-10 text-[10px]">Dear Sir,</p>
      <p className="mt-2 text-[10px] leading-relaxed">
        Thank you for the opportunity to submit our techno-commercial offer for {subject.toLowerCase()}.
        We are pleased to enclose our complete proposal covering the technical solution, scope of supply and services,
        commercial terms, and delivery schedule for your kind perusal.
      </p>
      <p className="mt-2 text-[10px] leading-relaxed">
        Electrosoft Automation has decades of experience in delivering turn-key transformer testing systems and
        is uniquely positioned to support {customer.companyShortName || "your team"} with engineering, commissioning, and lifetime support.
      </p>
      <p className="mt-2 text-[10px] leading-relaxed">
        We look forward to your favourable consideration and remain available for any clarification you may require.
      </p>
      <div className="mt-10 grid grid-cols-2 gap-4 text-[10px]">
        <div>
          <div>Sincerely,</div>
          <div className="mt-8 font-medium">{prep}</div>
          <div className="text-slate-500">Electrosoft Automation Pvt. Ltd.</div>
        </div>
        <div className="border border-red-400 p-2 text-[8.5px] text-red-700">
          <div className="font-bold">CONFIDENTIAL</div>
          This document and the information contained herein are the property of Electrosoft Automation Pvt. Ltd.
          and may not be reproduced or disclosed to third parties without prior written consent.
        </div>
      </div>
    </PdfPage>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-slate-200">
      <td className="font-bold p-1.5 w-44 align-top border-r border-slate-200 bg-slate-50">{label}</td>
      <td className="p-1.5 align-top whitespace-pre-line">{value}</td>
    </tr>
  );
}
