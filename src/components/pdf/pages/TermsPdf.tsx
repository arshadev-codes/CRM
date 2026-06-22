import type React from "react";
import { PdfPage } from "../PdfPage";
import { termsClauses, termsEffectiveDate, termsIntro, weightClause, type TermsClause } from "@/data/termsAndConditions";
import { paginateBlocks } from "@/data/paginationHelpers";

// Renders the GENERAL TERMS & CONDITIONS section across as many A4 pages as
// needed. Clauses are never split mid-block — if a clause won't fit the
// remaining space on the current page, it's pushed to a new page.
export function TermsPdf({ startPage }: { startPage: number }): React.ReactElement {
  // First page is smaller because of the title block + intro paragraph.
  const pages = paginateBlocks<TermsClause>(termsClauses, weightClause, [150, 240]);
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
                <p className="text-[13px] leading-relaxed mt-3 whitespace-pre-line">{termsIntro}</p>
              </div>
            )}
            <div className={`${isFirst ? "mt-4" : ""} space-y-2.5`}>
              {clauses.map((c) => (
                <div key={c.n} style={{ breakInside: "avoid" }}>
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
                      {c.bullets.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  )}
                </div>
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
    </>
  );
}

export function termsPageCount(): number {
  return paginateBlocks<TermsClause>(termsClauses, weightClause, [150, 240]).length;
}
