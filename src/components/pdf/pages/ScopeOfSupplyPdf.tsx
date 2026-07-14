import type React from "react";
import { useEffect } from "react";
import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { getMajorSubsystems } from "@/data/proposalContent";
import { paginateByHeights } from "@/data/paginationHelpers";
import { useBlockHeights } from "@/hooks/useBlockHeights";
import { proprietaryItemsData } from "@/data/proprietaryItemsData";
import { getEntry, lineTotal } from "@/data/pricingHelpers";

interface Row { sr: number; description: string; qty: string; unitPrice: string; price: string }

export function ScopeOfSupplyPdf({
  project,
  startPage,
  onPageCountKnown,
}: {
  project: Project;
  startPage: number;
  onPageCountKnown?: (count: number) => void;
}): React.ReactElement | null {
  const scopePricing = project.data.pricing?.scopeOfSupply;

  // ── Subsystem rows ──────────────────────────────────────────────────────────
  const all = getMajorSubsystems(project.data.systemType);
  const selectedIds = new Set(project.data.selectedSubsystems);
  const subs = all.filter((s) => selectedIds.has(s.id) || selectedIds.has(s.title));
  const list = subs.length ? subs : all;

  const subsystemRows: Row[] = list.map((s, i) => {
    const entry = getEntry(scopePricing, s.id);
    return {
      sr: i + 1,
      description: `${s.title}\n${s.preview ?? ""}`.trim(),
      qty: entry.qty || "1",
      unitPrice: entry.unitPrice,
      price: lineTotal(entry),
    };
  });

  // ── Proprietary item rows — ONLY items flagged inScopeOfSupply (Power Panel,
  //    LV Test Trolley). Every other selected proprietary item is rendered
  //    instead in ScopeOfServicesPdf's on-site table. ────────────────────────
  const selectedProprietaryIds = new Set(project.data.proprietary);

  const proprietaryLibraryRows: Row[] = proprietaryItemsData
    .filter((p) => p.inScopeOfSupply && selectedProprietaryIds.has(p.id))
    .map((p, i) => {
      const entry = getEntry(scopePricing, p.id);
      return {
        sr: subsystemRows.length + i + 1,
        description: `${p.title}\n${p.scopeSummary ?? p.description}`.trim(),
        qty: entry.qty || "1",
        unitPrice: entry.unitPrice,
        price: lineTotal(entry),
      };
    });

  const installationRow: Row[] =
  project.data.installationType
    ? [
        (() => {
          const entry = getEntry(scopePricing, "installation");
          return {
            sr: subsystemRows.length + proprietaryLibraryRows.length + 1,
            description:
              project.data.installationType === "full"
                ? "Full Installation\nComplete on-site installation of all supplied equipment and subsystems by Electrosoft's certified engineers, including mechanical mounting, electrical wiring, earthing, and final alignment."
                : "Supervision Installation\nElectrosoft's engineers will supervise the customer's team during installation, providing technical guidance, inspection, and sign-off at each stage to ensure compliance with design specifications.",
            qty: entry.qty || "1",
            unitPrice: entry.unitPrice,
            price: lineTotal(entry),
          };
        })(),
      ]
    : [];

  const rows: Row[] = [...subsystemRows, ...proprietaryLibraryRows, ...installationRow];

  // ── Measure & paginate ──────────────────────────────────────────────────────
  const { heightsMm, measuring, MeasurementPortal } = useBlockHeights(
    rows,
    (r) => <ScopeRowBody row={r} />,
    182,
  );

  // Reduced capacities to leave headroom for table borders/padding and
  // the section heading gap on the first page — prevents the last row from
  // being clipped by PdfPage's overflow:hidden.
  const pages = measuring ? [] : paginateByHeights(rows, heightsMm, [185, 230]);

  useEffect(() => {
    if (!measuring && onPageCountKnown) {
      onPageCountKnown(Math.max(1, pages.length));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuring, pages.length]);

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
            {/* Section heading only on first page */}
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

            {/* Table — thead on EVERY page so continued pages aren't headerless */}
            <table className="w-full text-[13px] mt-3 border border-slate-300">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border border-slate-300 p-1.5 text-left w-14">Sr. No.</th>
                  <th className="border border-slate-300 p-1.5 text-left">Description</th>
                  <th className="border border-slate-300 p-1.5 text-center w-16">Quantity</th>
                  <th className="border border-slate-300 p-1.5 text-right w-24">Unit Price (INR)</th>
                  <th className="border border-slate-300 p-1.5 text-right w-24">Price (INR)</th>
                </tr>
              </thead>
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
      {MeasurementPortal}
    </>
  );
}

function ScopeRow({ row }: { row: Row }) {
  const [title, ...rest] = row.description.split("\n");
  const subtitle = rest.join("\n");
  return (
    <tr style={{ breakInside: "avoid" }}>
      <td className="border border-slate-300 p-1.5 align-top">{row.sr}</td>
      <td className="border border-slate-300 p-1.5 whitespace-pre-line">
        <span className="font-semibold">{title}</span>
        {subtitle && <span className="block text-slate-600">{subtitle}</span>}
      </td>
      <td className="border border-slate-300 p-1.5 text-center align-top">{row.qty}</td>
      <td className="border border-slate-300 p-1.5 text-right align-top">{row.unitPrice ? `₹${Number(row.unitPrice).toLocaleString("en-IN")}` : "---"}</td>
      <td className="border border-slate-300 p-1.5 text-right align-top">{row.price}</td>
    </tr>
  );
}

function ScopeRowBody({ row }: { row: Row }) {
  const [title, ...rest] = row.description.split("\n");
  const subtitle = rest.join("\n");
  return (
    <div
      className="border border-slate-300 p-1.5 text-[13px]"
      style={{ boxSizing: "border-box" }}
    >
      <span className="font-semibold">{title}</span>
      {subtitle && <span className="block text-slate-600 whitespace-pre-line">{subtitle}</span>}
    </div>
  );
}