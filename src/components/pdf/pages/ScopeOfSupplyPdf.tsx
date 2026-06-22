import type React from "react";
import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { getMajorSubsystems } from "@/data/proposalContent";
import { paginateBlocks } from "@/data/paginationHelpers";

// ELECTROSOFT'S SCOPE OF SUPPLY — paginated table of all major subsystems
// included in the project. Mirrors pages 13–15 of the reference proposal.
interface Row { sr: number; description: string; qty: string; price: string }

export function ScopeOfSupplyPdf({
  project,
  startPage,
}: {
  project: Project;
  startPage: number;
}): React.ReactElement {
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

  // Heuristic row weight ≈ vertical space in mm. Two-line title rows weigh more.
  const weightRow = (r: Row) => 8 + Math.ceil(r.description.length / 75) * 4;

  // First page reserves room for headings.
  const pages = paginateBlocks<Row>(rows, weightRow, [200, 245]);

  return (
    <>
      {pages.map((pageRows, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === pages.length - 1;
        return (
          <PdfPage key={idx} pageNumber={startPage + idx}>
            {isFirst && (
              <div style={{ breakInside: "avoid" }}>
                <h2 className="text-[18px] font-bold text-blue-600 uppercase tracking-wide">
                  Electrosoft's Scope of Supply
                </h2>
                <div className="bg-slate-100 border-l-4 border-blue-700 px-3 py-1 font-bold text-[14px] text-slate-800 mt-2">
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
                  <tr key={r.sr} style={{ breakInside: "avoid" }}>
                    <td className="border border-slate-300 p-1.5 align-top">{r.sr}</td>
                    <td className="border border-slate-300 p-1.5 whitespace-pre-line">{r.description}</td>
                    <td className="border border-slate-300 p-1.5 text-center align-top">{r.qty}</td>
                    <td className="border border-slate-300 p-1.5 text-right align-top">{r.price}</td>
                  </tr>
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
    </>
  );
}

export function scopeOfSupplyPageCount(project: Project): number {
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
  return paginateBlocks<Row>(rows, (r) => 8 + Math.ceil(r.description.length / 75) * 4, [200, 245]).length;
}
