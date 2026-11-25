import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import type { EquipmentRow } from "@/data/equipmentData";
import type { InstrumentRow } from "@/data/instrumentsData";
import { getEntry } from "@/data/pricingHelpers";
import { makeMoney, type Money } from "@/data/currency";
import { namedEquipment, namedInstruments } from "@/data/quotationPricing";
import { useShowPrices } from "../offerType";

// Pages dedicated to OTHER EQUIPMENT and TESTING INSTRUMENTS — formatted as
// in the reference proposal (Sr. No / Description / Quantity / Price).
/** The page is printed only when the quotation has equipment or instruments. */
export const hasEquipmentOrInstruments = (project: Project) =>
  namedEquipment(project).length > 0 || namedInstruments(project).length > 0;

export function EquipmentInstrumentsPdf({
  project,
  pageNumber,
}: {
  project: Project;
  pageNumber: number;
}) {
  const showPrices = useShowPrices();
  const eq = namedEquipment(project);
  const ins = namedInstruments(project);
  const eqPricing = project.data.pricing?.equipment;
  const insPricing = project.data.pricing?.instruments;
  const money = makeMoney(project.data.currency);

  // Empty boxes are skipped, so there are never two commas in a row.
  const joinFilled = (parts: (string | undefined)[]) =>
    parts.map((v) => String(v ?? "").trim()).filter(Boolean).join(", ");
  const describeEq = (e: EquipmentRow) =>
    joinFilled([e.equipment, e.spec1, e.spec2, e.spec3, e.spec4, e.spec5]);

  const describeIns = (i: InstrumentRow) => joinFilled([i.instrument, i.make, i.model]);

  const eqRows = eq.map((e, i) => {
    const entry = getEntry(eqPricing, e.id);
    return { sr: i + 1, desc: describeEq(e), qty: entry.qty || "1", priceInr: lineInr(entry) };
  });

  const insRows = ins.map((i, idx) => {
    const entry = getEntry(insPricing, i.id);
    return { sr: idx + 1, desc: describeIns(i), qty: entry.qty || "1", priceInr: lineInr(entry) };
  });

  return (
    <PdfPage pageNumber={pageNumber}>
      <h2 className="text-[18px] font-bold text-blue-800 uppercase tracking-wide">
        Electrosoft's Scope of Supply
      </h2>

      {/* A table with nothing in it is left out. */}
      {eqRows.length > 0 && <SectionTable title="OTHER EQUIPMENT" rows={eqRows} money={money} showPrices={showPrices} />}

      {insRows.length > 0 && (
        <div className="mt-5">
          <SectionTable title="TESTING INSTRUMENTS" rows={insRows} money={money} showPrices={showPrices} />
        </div>
      )}
    </PdfPage>
  );
}

/** unit × qty in INR, or null when no price was typed. */
function lineInr(e: { unitPrice: string; qty: string }): number | null {
  const unit = Number(e.unitPrice);
  const qty = Number(e.qty || "1");
  if (!e.unitPrice || Number.isNaN(unit) || Number.isNaN(qty)) return null;
  return unit * qty;
}

function SectionTable({
  title,
  rows,
  money,
  showPrices,
}: {
  title: string;
  rows: { sr: number; desc: string; qty: string; priceInr: number | null }[];
  money: Money;
  showPrices: boolean;
}) {
  const totalInr = rows.reduce((sum, r) => sum + (r.priceInr ?? 0), 0);
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
            {showPrices && <th className="border border-slate-300 p-1.5 text-right w-24">Price ({money.code})</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.sr}>
              <td className="border border-slate-300 p-1.5">{r.sr}</td>
              <td className="border border-slate-300 p-1.5">{r.desc}</td>
              <td className="border border-slate-300 p-1.5 text-center">{r.qty}</td>
              {showPrices && (
                <td className="border border-slate-300 p-1.5 text-right">{r.priceInr != null ? money.fromInr(r.priceInr) : "---"}</td>
              )}
            </tr>
          ))}
          {showPrices && (
            <tr className="bg-slate-100 font-bold">
              <td className="border border-slate-300 p-1.5 text-right" colSpan={3}>Subtotal</td>
              <td className="border border-slate-300 p-1.5 text-right text-blue-900">{money.fromInr(totalInr)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
