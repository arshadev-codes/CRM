import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { equipmentData } from "@/data/equipmentData";
import { instrumentsData } from "@/data/instrumentsData";
import { getEntry, lineTotal } from "@/data/pricingHelpers";

// Pages dedicated to OTHER EQUIPMENT and TESTING INSTRUMENTS — formatted as
// in the reference proposal (Sr. No / Description / Quantity / Price).
export function EquipmentInstrumentsPdf({
  project,
  pageNumber,
}: {
  project: Project;
  pageNumber: number;
}) {
  const eq = (project.data.equipment ?? equipmentData).filter((e) => e.included);
  const ins = project.data.instruments ?? instrumentsData;
  const eqPricing = project.data.pricing?.equipment;
  const insPricing = project.data.pricing?.instruments;

  const describeEq = (e: typeof equipmentData[number]) =>
    [e.equipment, e.spec1, e.spec2, e.spec3, e.spec4, e.spec5]
      .filter(Boolean)
      .join(", ");

  const describeIns = (i: typeof instrumentsData[number]) =>
    [i.instrument, i.make, i.model].filter(Boolean).join(", ");

  const eqRows = eq.map((e, i) => {
    const entry = getEntry(eqPricing, e.id);
    return { sr: i + 1, desc: describeEq(e), qty: entry.qty || "1", price: lineTotal(entry) };
  });

  const insRows = ins.map((i, idx) => {
    const entry = getEntry(insPricing, i.id);
    return { sr: idx + 1, desc: describeIns(i), qty: entry.qty || "1", price: lineTotal(entry) };
  });

  return (
    <PdfPage pageNumber={pageNumber}>
      <h2 className="text-[18px] font-bold text-blue-800 uppercase tracking-wide">
        Electrosoft's Scope of Supply
      </h2>

      <SectionTable title="OTHER EQUIPMENT" rows={eqRows} />

      <div className="mt-5">
        <SectionTable title="TESTING INSTRUMENTS" rows={insRows} />
      </div>
    </PdfPage>
  );
}

function SectionTable({
  title,
  rows,
}: {
  title: string;
  rows: { sr: number; desc: string; qty: string; price: string }[];
}) {
  const total = rows.reduce((sum, r) => {
    const n = Number(String(r.price).replace(/[^\d.-]/g, ""));
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

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
          {rows.length === 0 ? (
            <tr><td className="border p-2 text-center italic text-slate-400" colSpan={4}>— None selected —</td></tr>
          ) : (
            <>
              {rows.map((r) => (
                <tr key={r.sr}>
                  <td className="border border-slate-300 p-1.5">{r.sr}</td>
                  <td className="border border-slate-300 p-1.5">{r.desc}</td>
                  <td className="border border-slate-300 p-1.5 text-center">{r.qty}</td>
                  <td className="border border-slate-300 p-1.5 text-right">{r.price}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold">
                <td className="border border-slate-300 p-1.5 text-right" colSpan={3}>Subtotal</td>
                <td className="border border-slate-300 p-1.5 text-right text-blue-900">
                  ₹{total.toLocaleString("en-IN")}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}