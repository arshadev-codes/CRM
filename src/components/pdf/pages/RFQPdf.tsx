import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { employeesData } from "@/data/employeesData";

// Formats "2025-11-24" -> "24th November 2025"
function formatOrdinalDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? "st" :
    day % 10 === 2 && day !== 12 ? "nd" :
    day % 10 === 3 && day !== 13 ? "rd" : "th";
  const month = d.toLocaleString("en-US", { month: "long" });
  return `${day}${suffix} ${month} ${d.getFullYear()}`;
}

// Formats "2025-11-24" -> "24.11.2025"
function formatDottedDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export function RFQPdf({ project }: { project: Project }) {
  const { customer, meta, transformer, systemType } = project.data;
  const prep = employeesData.find(e => e.id === meta.preparedBy)?.name ?? meta.preparedBy;
  const chk = employeesData.find(e => e.id === meta.checkedBy)?.name ?? meta.checkedBy;
  const subject = `Techno-commercial offer for ${transformer.rating} ${transformer.ratingUnit}, ${transformer.voltage}${transformer.voltageUnit} Transformer Testing System - ${systemType}`;
  const revisionNum = meta.revision.replace(/^R/i, "");

  return (
    <PdfPage pageNumber={1}>
      <table className="w-full text-[13px] border border-black mt-2" style={{ borderCollapse: "collapse" }}>
        <tbody>
          <Row label="To" value={`${customer.title} ${customer.contactPerson || "—"}`} italic />
          <Row label="Name of the company" value={customer.companyFullName ? `M/s ${customer.companyFullName}` : "—"} italic />
          <Row label="Subject" value={subject} italic />
          <Row label="Our reference" value={meta.offerNumber} italic />
          <Row label="Date" value={formatOrdinalDate(meta.date)} italic />
        </tbody>
      </table>

      <table className="w-full text-[13px] border border-black mt-5" style={{ borderCollapse: "collapse" }}>
        <tbody>
          <Row label="Prepared by" value={prep} italic />
          <Row label="Checked by" value={chk} italic />
          <tr>
            <td className="font-bold p-1.5 w-44 align-top border border-black">Revision no. &amp; date</td>
            <td className="p-1.5 align-top border border-black w-32">Rev. {revisionNum}</td>
            <td className="p-1.5 align-top border border-black">{formatDottedDate(meta.date)}</td>
          </tr>
          <tr>
            <td className="font-bold p-1.5 w-44 align-top border border-black">Contact Address</td>
            <td colSpan={2} className="p-1.5 align-top border border-black whitespace-pre-line">
              {`Electrosoft Automation Pvt. Ltd.,\nS7-1&2, Jai Matadi Compound, Thane-Bhiwandi Road,\nKalher, Thane District, Maharashtra, India – 421302\nTel. No. +91 8692 888 444`}
            </td>
          </tr>
        </tbody>
      </table>

      <p className="mt-8 text-[13px]">Dear Sir,</p>
      <p className="mt-2 text-[13px] leading-relaxed">
        With reference to your inquiry, we are pleased to submit our Techno-Commercial Offer for {transformer.rating}{" "}
        {transformer.ratingUnit}, {transformer.voltage} {transformer.voltageUnit} Transformer Testing system.
        Electrosoft Automation Pvt. Ltd. specializes in the design, development, and manufacturing of a wide range of
        Transformer Testing Systems. Our solutions are used by power utilities, transformer manufacturers, and
        research institutions across the globe.
      </p>
      <p className="mt-2 text-[13px] leading-relaxed">
        We offer testing systems that range from conventional to fully automated and advanced, tailored to suit
        diverse application needs. We trust the enclosed offer meets your expectations and technical requirements.
      </p>
      <p className="mt-2 text-[13px] leading-relaxed">
        Thank you for considering Electrosoft Automation Pvt. Ltd. for your transformer testing needs. We look
        forward to the opportunity to work with you and provide advanced, reliable testing systems.
      </p>

      <div className="mt-18 grid grid-cols-2 gap-4 text-[13px]">
        <div>
          <div>Sincerely,</div>
          <div className="mt-4 italic font-bold">{prep}</div>
          <div>General Manager</div>
          <div>Electrosoft Automation Pvt. Ltd.</div>
          <div className="mt-1">m: +91 9089 888 444</div>
        </div>
        <div className="border-2 border-red-600 p-2 text-[10px] font-bold text-red-600 self-start">
          This techno-commercial proposal, including all pages, literature, photographs, and linked documents, is the
          confidential property of Electrosoft Automation Pvt. Ltd. It must not be shared, lent, or disclosed to any
          third party without the prior written consent of Electrosoft Automation Pvt. Ltd.
        </div>
      </div>
    </PdfPage>
  );
}

function Row({ label, value, italic = false }: { label: string; value: string; italic?: boolean }) {
  return (
    <tr>
      <td className="font-bold p-1.5 w-44 align-top border border-black">{label}</td>
      <td className={`p-1.5 align-top border border-black whitespace-pre-line ${italic ? "italic" : ""}`}>{value}</td>
    </tr>
  );
}