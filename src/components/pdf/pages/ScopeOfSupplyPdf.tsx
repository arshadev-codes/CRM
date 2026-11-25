import type React from "react";
import { useEffect } from "react";
import { PdfPage } from "../PdfPage";
import { useProposalStore, type Project } from "@/store/proposalStore";
import { paginateBlocks, paginateByHeights } from "@/data/paginationHelpers";
import { useBlockHeights } from "@/hooks/useBlockHeights";
import { useLibrary } from "@/hooks/useLibrary";
import { getEntry } from "@/data/pricingHelpers";
import { makeMoney, type Money } from "@/data/currency";
import { supplyRows } from "@/data/quotationPricing";
import { useShowPrices } from "../offerType";

interface Row { sr: number; title: string; summary: string; qty: string; unitInr: number | null; lineInr: number | null }

// Fixed column layout (table-layout: fixed + colgroup) so the measurement pass
// renders exactly what the page renders. Without prices (Technical Offer) the
// description takes the price columns' width.
const COLS_PRICED = ["7%", "51%", "9%", "16.5%", "16.5%"] as const;
const COLS_PLAIN = ["7%", "82%", "11%"] as const;
const CONTENT_WIDTH_MM = 182;

/** True when the quotation has anything to print in this table. */
export const hasScopeOfSupplyRows = (project: Project, cms: Record<string, unknown>, proprietary: Parameters<typeof supplyRows>[2]) =>
  supplyRows(project, cms, proprietary).length > 0;

export function ScopeOfSupplyPdf({
  project,
  startPage,
  onPageCountKnown,
}: {
  project: Project;
  startPage: number;
  onPageCountKnown?: (count: number) => void;
}): React.ReactElement | null {
  const showPrices = useShowPrices();
  const money = makeMoney(project.data.currency);
  const cmsOverrides = useProposalStore((s) => s.cmsOverrides);
  const proprietary = useLibrary("proprietary");
  const pricing = project.data.pricing?.scopeOfSupply;

  const rows: Row[] = supplyRows(project, cmsOverrides, proprietary).map((r, i) => {
    const e = getEntry(pricing, r.key);
    const qty = e.qty || "1";
    const unit = e.unitPrice ? Number(e.unitPrice) : null;
    const line = unit != null && !Number.isNaN(unit) && Number(qty) ? unit * Number(qty) : null;
    return { sr: i + 1, title: r.title, summary: r.summary, qty, unitInr: unit, lineInr: line };
  });
  const grandTotalInr = rows.reduce((sum, r) => sum + (r.lineInr ?? 0), 0);
  const cols = showPrices ? COLS_PRICED : COLS_PLAIN;

  const { heightsMm, measuring, MeasurementPortal } = useBlockHeights(
    rows,
    (r) => (
      <table className="w-full text-[13px] border border-slate-300" style={{ tableLayout: "fixed" }}>
        <colgroup>{cols.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
        <tbody><ScopeRow row={r} money={money} showPrices={showPrices} /></tbody>
      </table>
    ),
    CONTENT_WIDTH_MM,
    `${money.code}|${showPrices}`,
  );

  // Page budgets leave room for the heading on page 1 and the Grand Total row
  // (added after pagination to whichever page is last). While measuring, an
  // estimate is used so the table is never missing from the page.
  const pages = measuring
    ? paginateBlocks(rows, (r) => 9 + Math.ceil((r.title.length + r.summary.length) / 70) * 5, [175, 205])
    : paginateByHeights(rows, heightsMm, [175, 205]);

  useEffect(() => {
    if (!onPageCountKnown) return;
    if (rows.length === 0) onPageCountKnown(0); // nothing priced here: section left out
    else if (!measuring) onPageCountKnown(Math.max(1, pages.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuring, pages.length, rows.length]);

  if (rows.length === 0) return null;

  return (
    <>
      {pages.map((pageRows, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === pages.length - 1;
        return (
          <PdfPage key={idx} pageNumber={startPage + idx}>
            {isFirst && (
              <div style={{ breakInside: "avoid" }}>
                <h2 className="text-[18px] font-bold text-blue-900 uppercase tracking-wide">
                  Electrosoft's Scope of Supply
                </h2>
                <div className="bg-slate-100 border-l-4 border-blue-700 px-3 py-1 font-bold text-[14px] text-blue-900 mt-2">
                  MAJOR SUBSYSTEMS
                </div>
              </div>
            )}
            {/* thead on every page so continued pages aren't headerless */}
            <table className="w-full text-[13px] mt-3 border border-slate-300" style={{ tableLayout: "fixed" }}>
              <colgroup>{cols.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
              <thead className="bg-slate-50">
                <tr>
                  <th className="border border-slate-300 p-1.5 text-left">Sr. No.</th>
                  <th className="border border-slate-300 p-1.5 text-left">Description</th>
                  <th className="border border-slate-300 p-1.5 text-center">Quantity</th>
                  {showPrices && (
                    <>
                      <th className="border border-slate-300 p-1.5 text-right">Unit Price ({money.code})</th>
                      <th className="border border-slate-300 p-1.5 text-right">Price ({money.code})</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <ScopeRow key={r.sr} row={r} money={money} showPrices={showPrices} />
                ))}
                {isLast && showPrices && (
                  <tr className="bg-slate-100 font-bold" style={{ breakInside: "avoid" }}>
                    <td className="border border-slate-300 p-1.5" colSpan={4} style={{ textAlign: "right" }}>
                      Grand Total
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right text-blue-900">
                      {money.fromInr(grandTotalInr)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </PdfPage>
        );
      })}
      {MeasurementPortal}
    </>
  );
}

function ScopeRow({ row, money, showPrices }: { row: Row; money: Money; showPrices: boolean }) {
  return (
    <tr style={{ breakInside: "avoid" }}>
      <td className="border border-slate-300 p-1.5 align-top">{row.sr}</td>
      <td className="border border-slate-300 p-1.5 align-top whitespace-pre-line" style={{ wordBreak: "break-word" }}>
        <span className="font-semibold">{row.title}</span>
        {row.summary && <span className="block text-slate-600">{row.summary}</span>}
      </td>
      <td className="border border-slate-300 p-1.5 text-center align-top">{row.qty}</td>
      {showPrices && (
        <>
          <td className="border border-slate-300 p-1.5 text-right align-top">{row.unitInr != null ? money.fromInr(row.unitInr) : "---"}</td>
          <td className="border border-slate-300 p-1.5 text-right align-top">{row.lineInr != null ? money.fromInr(row.lineInr) : "---"}</td>
        </>
      )}
    </tr>
  );
}
