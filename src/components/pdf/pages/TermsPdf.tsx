import type React from "react";
import { useMemo, useEffect } from "react";
import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import {
  termsClauses,
  termsIntro,
  weightClause,
  type TermsClause,
} from "@/data/termsAndConditions";
import { useBlockHeights } from "@/hooks/useBlockHeights";
import { paginateByMeasuredHeights } from "@/data/paginateByMeasuredHeights";
import { paginateBlocks } from "@/data/paginationHelpers";

const PAGE_CONTENT_MM = 239;
const CONTENT_WIDTH_MM = 182;
const TITLE_BLOCK_MM = 35;

function ClauseBlock({ c }: { c: TermsClause }) {
  return (
    <div style={{ breakInside: "avoid" }}>
      {c.title && (
        <div className="font-bold text-[14px] text-slate-900">
          {c.n}. {c.title}
        </div>
      )}
      {c.body && (
        <p className="text-[13px] leading-relaxed mt-0.5">
          {!c.title && <span className="font-semibold">{c.n}. </span>}
          {c.body}
        </p>
      )}
      {c.bullets && (
        <ul className="mt-1 list-disc pl-6 text-[13px] space-y-0.5">
          {c.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function renderClause(c: TermsClause) {
  return (
    <div className="space-y-2.5 pb-[10px]">
      <ClauseBlock c={c} />
    </div>
  );
}

interface TermsPdfProps {
  project: Project;
  startPage: number;
  onPageCountKnown?: (count: number) => void;
}

// Format an ISO date (YYYY-MM-DD) as e.g. "14th July 2026"
function formatEffectiveDate(iso: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return iso;
  const day = d.getDate();
  const suffix = (n: number) => {
    const v = n % 100;
    if (v >= 11 && v <= 13) return "th";
    switch (n % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${day}${suffix(day)} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function TermsPdf({ project, startPage, onPageCountKnown }: TermsPdfProps): React.ReactElement {
  const effectiveDate = formatEffectiveDate(project.data.meta.date);
  const { heightsMm, measuring, MeasurementPortal } = useBlockHeights(
    termsClauses,
    renderClause,
    CONTENT_WIDTH_MM,
  );

  const measuredPages = useMemo(() => {
    if (measuring || heightsMm.length === 0) return null;
    return paginateByMeasuredHeights(
      termsClauses,
      heightsMm,
      PAGE_CONTENT_MM - TITLE_BLOCK_MM,
      PAGE_CONTENT_MM,
    );
  }, [measuring, heightsMm]);

  // Fallback pagination while measuring — guarantees the Terms section
  // renders in the PDF even if measurement hasn't completed yet (e.g. when
  // print fires after the safety-net timeout).
  const fallbackPages = useMemo(
    () => paginateBlocks(termsClauses, weightClause, [PAGE_CONTENT_MM - TITLE_BLOCK_MM, PAGE_CONTENT_MM]),
    [],
  );

  const pages = measuredPages ?? fallbackPages;

  useEffect(() => {
    if (measuredPages && onPageCountKnown) {
      onPageCountKnown(measuredPages.length);
    }
  }, [measuredPages, onPageCountKnown]);

  return (
    <>
      {pages.map((clauses, pageIdx) => {
        const isFirst = pageIdx === 0;
        return (
          <PdfPage key={pageIdx} pageNumber={startPage + pageIdx}>
            {isFirst && (
              <div style={{ breakInside: "avoid" }}>
                <h1 className="text-[18px] font-bold text-blue-900 tracking-wide text-center">
                  GENERAL TERMS &amp; CONDITIONS
                </h1>
                <div className="text-[14px] text-black-600 text-center mt-1">
                  Effective date: {effectiveDate}
                </div>
                <p className="text-[13px] leading-relaxed mt-3 whitespace-pre-line">
                  {termsIntro}
                </p>
              </div>
            )}
            <div className={`${isFirst ? "mt-4" : ""} space-y-2.5`}>
              {clauses.map((c) => (
                <ClauseBlock key={c.n} c={c} />
              ))}
              {pageIdx === pages.length - 1 && (
                <div className="text-center text-[10px] text-slate-500 mt-6 tracking-widest">
                  - - - - - - - - - - - - - - - [ END OF DOCUMENT ] - - - - - - - - - - - - - -
                </div>
              )}
            </div>
          </PdfPage>
        );
      })}
      {MeasurementPortal}
    </>
  );
}

export function termsPageCount(): number {
  return 4;
}
