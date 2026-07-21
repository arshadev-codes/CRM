import type React from "react";
import { useEffect } from "react";
import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { getMajorSubsystems, resolveSubsystemTitle } from "@/data/proposalContent";
import { paginateByHeights } from "@/data/paginationHelpers";
import { useBlockHeights } from "@/hooks/useBlockHeights";
import { proprietaryItemsData } from "@/data/proprietaryItemsData";
import { getEntry, lineTotal } from "@/data/pricingHelpers";

interface Row { sr: number; description: string; qty: string; unitPrice: string; price: string }

// ── Fixed column layout ──────────────────────────────────────────────────────
// The table uses table-layout:fixed with a colgroup so every column has a
// PREDICTABLE width regardless of content.
//
// Measurement fidelity: earlier this section was measured by rendering a
// bare <div> at an approximated width (a % of 182mm). That was still an
// approximation — border-collapse, sub-pixel rounding, and box-model
// differences between a <div> and a real <td> meant the measured height
// could drift from the real render by enough to clip a row at the page
// boundary (see the impulse-pd row cutting off mid-line). The fix below
// measures the ACTUAL <table><colgroup><tbody><ScopeRow/> markup — the
// exact same component and column widths used in the real page — so there
// is nothing left to approximate; measured height = real rendered height.
const COL_WIDTHS = ["7%", "51%", "9%", "16.5%", "16.5%"] as const;
const CONTENT_WIDTH_MM = 182;

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
  const subsystemVariants = project.data.subsystemVariants ?? {};

  // ── Subsystem rows ──────────────────────────────────────────────────────────
  const all = getMajorSubsystems(project.data.systemType);
  const selectedIds = new Set(project.data.selectedSubsystems);
  const subs = all.filter((s) => selectedIds.has(s.id) || selectedIds.has(s.title));
  const list = subs.length ? subs : all;

  const subsystemRows: Row[] = list.map((s, i) => {
    const entry = getEntry(scopePricing, s.id);
    // FIX: resolve through the active variant (e.g. "Manual" LV Trolley)
    // instead of always using the subsystem's default title.
    const title = resolveSubsystemTitle(s, subsystemVariants);
    return {
      sr: i + 1,
      description: `${title}\n${s.preview ?? ""}`.trim(),
      qty: entry.qty || "1",
      unitPrice: entry.unitPrice,
      price: lineTotal(entry),
    };
  });

  // ── Proprietary item rows — ONLY items flagged inScopeOfSupply (Power Panel,
  //    LV Test Trolley). Every other selected proprietary item is rendered
  //    instead in ScopeOfServicesPdf's on-site table. Instruments/Equipment
  //    are intentionally never listed here — their pricing is supplied
  //    separately, outside this proposal document. ────────────────────────
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

  // Installation price: if the user hasn't manually typed a price for this
  // row (pricing.scopeOfSupply.installation), fall back to whatever was
  // configured back in the Proprietary/Installation step — lump sum for
  // Full Installation, days×perDayCost for Supervision. Manual entry (once
  // typed, anywhere in Step 9) always takes priority over this default.
  const installationDefaultPrice = (() => {
    if (!project.data.installationType) return null;
    const ip = project.data.installationPricing;
    if (!ip || ip.pricingType === "inclusive") return null;
    if (project.data.installationType === "full" && ip.lumpSum) {
      return Number(ip.lumpSum);
    }
    if (project.data.installationType === "supervision" && ip.days && ip.perDayCost) {
      return Number(ip.days) * Number(ip.perDayCost);
    }
    return null;
  })();

  const installationRow: Row[] =
  project.data.installationType
    ? [
        (() => {
          const rawEntry = getEntry(scopePricing, "installation");
          const effectiveUnitPrice =
            rawEntry.unitPrice || (installationDefaultPrice != null ? String(installationDefaultPrice) : "");
          const entry = { ...rawEntry, unitPrice: effectiveUnitPrice, qty: rawEntry.qty || "1" };
          return {
            sr: subsystemRows.length + proprietaryLibraryRows.length + 1,
            description:
              project.data.installationType === "full"
                ? "Full Installation\nComplete on-site installation of all supplied equipment and subsystems by Electrosoft's certified engineers, including mechanical mounting, electrical wiring, earthing, and final alignment."
                : "Supervision Installation\nElectrosoft's engineers will supervise the customer's team during installation, providing technical guidance, inspection, and sign-off at each stage to ensure compliance with design specifications.",
            qty: entry.qty,
            unitPrice: entry.unitPrice,
            price: lineTotal(entry),
          };
        })(),
      ]
    : [];

  const rows: Row[] = [...subsystemRows, ...proprietaryLibraryRows, ...installationRow];

  // Sum of every row's Price column, parsed back out of the already-
  // formatted "₹1,23,456" / "---" strings — shown as a Grand Total row on
  // the last page of this table.
  const grandTotal = rows.reduce((sum, r) => {
    const n = Number(String(r.price).replace(/[^\d.-]/g, ""));
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  // ── Measure & paginate ──────────────────────────────────────────────────────
  // Wraps the REAL <ScopeRow> in the REAL table/colgroup structure, measured
  // at the REAL content width (182mm) — pixel-identical to production, so
  // there's no width/wrapping mismatch left that could under-measure a row
  // and cause it to get clipped by the page boundary.
  const { heightsMm, measuring, MeasurementPortal } = useBlockHeights(
    rows,
    (r) => (
      <table className="w-full text-[13px] border border-slate-300" style={{ tableLayout: "fixed" }}>
        <colgroup>
          {COL_WIDTHS.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <tbody>
          <ScopeRow row={r} />
        </tbody>
      </table>
    ),
    CONTENT_WIDTH_MM,
  );

  // Reduced capacities to leave headroom for table borders/padding and
  // the section heading gap on the first page — prevents the last row from
  // being clipped by PdfPage's overflow:hidden. The second value is kept
  // lower than the true page capacity specifically to reserve room for the
  // Grand Total row, which is appended AFTER pagination runs (whichever
  // page ends up last doesn't know in advance it'll need ~10mm more).
  const pages = measuring ? [] : paginateByHeights(rows, heightsMm, [175, 205]);

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

            {/* Table — thead on EVERY page so continued pages aren't headerless.
                table-layout:fixed + colgroup below is the source of truth for
                column widths; the header th classes are cosmetic only now. */}
            <table
              className="w-full text-[13px] mt-3 border border-slate-300"
              style={{ tableLayout: "fixed" }}
            >
              <colgroup>
                {COL_WIDTHS.map((w, i) => (
                  <col key={i} style={{ width: w }} />
                ))}
              </colgroup>
              <thead className="bg-slate-50">
                <tr>
                  <th className="border border-slate-300 p-1.5 text-left">Sr. No.</th>
                  <th className="border border-slate-300 p-1.5 text-left">Description</th>
                  <th className="border border-slate-300 p-1.5 text-center">Quantity</th>
                  <th className="border border-slate-300 p-1.5 text-right">Unit Price (INR)</th>
                  <th className="border border-slate-300 p-1.5 text-right">Price (INR)</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <ScopeRow key={r.sr} row={r} />
                ))}
                {isLast && (
                  <tr className="bg-slate-100 font-bold" style={{ breakInside: "avoid" }}>
                    <td className="border border-slate-300 p-1.5" colSpan={4} style={{ textAlign: "right" }}>
                      Grand Total
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right text-blue-900">
                      ₹{grandTotal.toLocaleString("en-IN")}
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

function ScopeRow({ row }: { row: Row }) {
  const [title, ...rest] = row.description.split("\n");
  const subtitle = rest.join("\n");
  return (
    <tr style={{ breakInside: "avoid" }}>
      <td className="border border-slate-300 p-1.5 align-top">{row.sr}</td>
      <td className="border border-slate-300 p-1.5 align-top whitespace-pre-line" style={{ wordBreak: "break-word" }}>
        <span className="font-semibold">{title}</span>
        {subtitle && <span className="block text-slate-600">{subtitle}</span>}
      </td>
      <td className="border border-slate-300 p-1.5 text-center align-top">{row.qty}</td>
      <td className="border border-slate-300 p-1.5 text-right align-top">{row.unitPrice ? `₹${Number(row.unitPrice).toLocaleString("en-IN")}` : "---"}</td>
      <td className="border border-slate-300 p-1.5 text-right align-top">{row.price}</td>
    </tr>
  );
}