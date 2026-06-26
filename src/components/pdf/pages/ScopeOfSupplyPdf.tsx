import type React from "react";
import { useEffect } from "react";
import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { getMajorSubsystems } from "@/data/proposalContent";
import { paginateByHeights } from "@/data/paginationHelpers";
import { useBlockHeights } from "@/hooks/useBlockHeights";

interface Row { sr: number; description: string; qty: string; price: string }

export function ScopeOfSupplyPdf({
  project,
  startPage,
  onPageCountKnown,
}: {
  project: Project;
  startPage: number;
  onPageCountKnown?: (count: number) => void;
}): React.ReactElement | null {
  const all = getMajorSubsystems(project.data.systemType);
  const selectedIds = new Set(project.data.selectedSubsystems);
  const subs = all.filter((s) => selectedIds.has(s.id) || selectedIds.has(s.title));
  const list = subs.length ? subs : all;

  const rows: Row[] = list.map((s, i) => ({
    sr: i + 1,
    description: `${s.title}\n${s.preview ?? ""}`.trim(),
    qty: "1",
    price: "---",
  }));

  // Phase 1: measure each row's real rendered height.
  // MeasurementPortal MUST be rendered in the return below — without it
  // React never commits the hidden blocks, blockDivRefs stay null, and
  // measuring never flips to false.
  const { heightsMm, measuring, MeasurementPortal } = useBlockHeights(
    rows,
    (r) => <ScopeRowBody row={r} />,
    182,
  );

  // Phase 2: pack using real heights.
  const pages = measuring ? [] : paginateByHeights(rows, heightsMm, [200, 245]);

  useEffect(() => {
    if (!measuring && onPageCountKnown) {
      onPageCountKnown(Math.max(1, pages.length));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuring, pages.length]);

  // While measuring: render nothing visible, but keep MeasurementPortal
  // in the tree so React can commit and measure the hidden blocks.
  if (measuring) {
    return <>{MeasurementPortal}</>;
  }

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
            <table className="w-full text-[13px] mt-3 border border-slate-300">
              {isFirst && (
                <thead className="bg-slate-50">
                  <tr>
                    <th className="border border-slate-300 p-1.5 text-left w-14">Sr. No.</th>
                    <th className="border border-slate-300 p-1.5 text-left">Description</th>
                    <th className="border border-slate-300 p-1.5 text-center w-16">Quantity</th>
                    <th className="border border-slate-300 p-1.5 text-right w-24">Price (INR)</th>
                  </tr>
                </thead>
              )}
              <tbody>
                {pageRows.map((r) => (
                  <ScopeRow key={r.sr} row={r} />
                ))}
              </tbody>
            </table>
            {isLast && (
              <p className="text-[12.5px] italic text-slate-500 mt-2">
                Itemised pricing is shared separately as part of the commercial annexure.
              </p>
            )}
          </PdfPage>
        );
      })}
      {/* Portal must stay mounted after measurement too — unmounting it would
          trigger a re-measure on the next render cycle. */}
      {MeasurementPortal}
    </>
  );
}

function ScopeRow({ row }: { row: Row }) {
  return (
    <tr style={{ breakInside: "avoid" }}>
      <td className="border border-slate-300 p-1.5 align-top">{row.sr}</td>
      <td className="border border-slate-300 p-1.5 whitespace-pre-line">{row.description}</td>
      <td className="border border-slate-300 p-1.5 text-center align-top">{row.qty}</td>
      <td className="border border-slate-300 p-1.5 text-right align-top">{row.price}</td>
    </tr>
  );
}

function ScopeRowBody({ row }: { row: Row }) {
  return (
    <div
      className="border border-slate-300 p-1.5 whitespace-pre-line text-[13px]"
      style={{ boxSizing: "border-box" }}
    >
      {row.description}
    </div>
  );
}