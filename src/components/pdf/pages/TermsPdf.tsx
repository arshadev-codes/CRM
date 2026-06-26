import type React from "react";
import { useMemo, useEffect } from "react";
import { PdfPage } from "../PdfPage";
import {
  termsClauses,
  termsEffectiveDate,
  termsIntro,
  type TermsClause,
} from "@/data/termsAndConditions";
import { useBlockHeights } from "@/hooks/useBlockHeights";
import { paginateByMeasuredHeights } from "@/data/paginateByMeasuredHeights";

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
  startPage: number;
  onPageCountKnown?: (count: number) => void;
}

export function TermsPdf({ startPage, onPageCountKnown }: TermsPdfProps): React.ReactElement {
  // MeasurementPortal MUST be rendered at all times — while measuring so
  // React commits the hidden blocks and heights can be read, and after
  // measuring so the portal stays mounted and doesn't trigger a re-measure.
  const { heightsMm, measuring, MeasurementPortal } = useBlockHeights(
    termsClauses,
    renderClause,
    CONTENT_WIDTH_MM,
  );

  const pages = useMemo(() => {
    if (measuring || heightsMm.length === 0) return null;
    return paginateByMeasuredHeights(
      termsClauses,
      heightsMm,
      PAGE_CONTENT_MM - TITLE_BLOCK_MM,
      PAGE_CONTENT_MM,
    );
  }, [measuring, heightsMm]);

  useEffect(() => {
    if (pages && onPageCountKnown) {
      onPageCountKnown(pages.length);
    }
  }, [pages, onPageCountKnown]);

  // While measuring: render nothing visible but keep MeasurementPortal in the
  // tree so React commits the hidden clause blocks and heights get captured.
  // Previously this rendered a placeholder <PdfPage> with "Measuring layout…"
  // which appeared in the PDF output and hid the real Terms pages.
  if (!pages) {
    return <>{MeasurementPortal}</>;
  }

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
                  Effective date: {termsEffectiveDate}
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
      {/* Keep portal mounted after measurement — unmounting triggers a re-measure */}
      {MeasurementPortal}
    </>
  );
}

export function termsPageCount(): number {
  return 4;
}