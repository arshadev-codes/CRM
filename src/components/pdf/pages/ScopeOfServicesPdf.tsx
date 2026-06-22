import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { scopeOfServicesData } from "@/data/scopeOfServicesData";

// Pages: ELECTROSOFT'S SCOPE OF SERVICES (Off-site documents, On-site activities)
// + DELIVERY SCHEDULE — laid out to match the reference proposal.
export function ScopeOfServicesPdf({
  project,
  pageNumber,
}: {
  project: Project;
  pageNumber: number;
}) {
  const buyer = project.data.customer.companyFullName || "the Buyer";

  const offsite = scopeOfServicesData.filter((s) =>
    /document|engineering|drawing|datasheet|fat|manual/i.test(s.title)
  );
  const onsite = scopeOfServicesData.filter((s) => !offsite.includes(s));

  return (
    <PdfPage pageNumber={pageNumber}>
      <h2 className="text-[18px] font-bold text-blue-800 uppercase tracking-wide">
        Electrosoft's Scope of Services
      </h2>

      <ServiceTable  title="OFF-SITE: DELIVERABLE DOCUMENTS" rows={offsite.map((s, i) => ({ sr: i + 1, desc: s.title }))} qty="1 set" />
      <div className="mt-4" />
      <ServiceTable title="ON-SITE" rows={onsite.map((s, i) => ({ sr: i + 1, desc: s.title.replace(/Buyer|Customer/g, buyer) }))} qty="1 set" />

      <div className="mt-5" style={{ breakInside: "avoid" }}>
        <div className="bg-blue-900   border-l-4 border-blue-700 px-3 py-1 font-bold text-[14px] text-white">
          DELIVERY SCHEDULE
        </div>
        <table className="w-full text-[13px] border border-slate-300">
          <thead className="bg-blue-100">
            <tr>
              <th className="border border-slate-300 p-1.5 text-left w-14">Sr. No.</th>
              <th className="border border-slate-300 p-1.5 text-left">Details</th>
              <th className="border border-slate-300 p-1.5 text-left w-40">Duration</th>
            </tr>
          </thead>
          <tbody>
            {project.data.delivery.map((d, i) => (
              <tr key={d.id}>
                <td className="border border-slate-300 p-1.5">{i + 1}</td>
                <td className="border border-slate-300 p-1.5">{d.deliverable}</td>
                <td className="border border-slate-300 p-1.5">{d.custom || d.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-[13.5px] text-black-700 mt-4">
          <div className="font-semibold">Note:</div>
          <ol className="list-decimal pl-5 mt-1 space-y-0.5">
            <li>Schedule is subject to timely purchase order, advance payment and approval of GA, Wiring diagram, technical specification of all items.</li>
            <li>{buyer} shall provide necessary site readiness, manpower and inputs as required for on-site activities.</li>
          </ol>
        </div>
      </div>
    </PdfPage>
  );
}

function ServiceTable({
  title,
  rows,
  qty,
}: {
  title: string;
  rows: { sr: number; desc: string }[];
  qty: string;
}) {
  return (
    <div style={{ breakInside: "avoid" }}>
      <div className="bg-blue-900   border-l-4 border-blue-700 px-3 py-1 font-bold text-[14px] text-white    mt-3">
        {title}
      </div>
      <table className="w-full text-[13px]  border border-slate-300">
        <thead className="bg-blue-100">
          <tr>
            <th className="border border-slate-300 p-1.5 text-left w-14">Sr. No.</th>
            <th className="border border-slate-300 p-1.5 text-left">Description</th>
            <th className="border border-slate-300 p-1.5 text-center w-16">Quantity</th>
            <th className="border border-slate-300 p-1.5 text-right w-24">Price (INR)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.sr}>
              <td className="border border-slate-300 p-1.5">{r.sr}</td>
              <td className="border border-slate-300 p-1.5">{r.desc}</td>
              {idx === 0 && (
                <>
                  <td className="border border-slate-300 p-1.5 text-center align-middle" rowSpan={rows.length}>{qty}</td>
                  <td className="border border-slate-300 p-1.5 text-right align-middle" rowSpan={rows.length}>---</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
