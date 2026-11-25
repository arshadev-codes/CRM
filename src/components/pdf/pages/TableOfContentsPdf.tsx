import { PdfPage } from "../PdfPage";

export interface TocEntry {
  /** Unique per line. */
  key: string;
  /** Element id the line links to (the section's first page). */
  anchor: string;
  label: string;
  start: number;
  end: number;
}

/** Element id of a section's first page, for the contents links. */
export const sectionAnchor = (sectionId: string) => `pdf-section-${sectionId}`;

/**
 * Contents page. Page ranges come from AllPages once every dynamic section has
 * reported its measured page count, so they match the real document. Every
 * line is a link: clicking it in the preview or in the saved PDF jumps to
 * that section.
 */
export function TableOfContentsPdf({ pageNumber, entries }: { pageNumber: number; entries: TocEntry[] }) {
  return (
    <PdfPage pageNumber={pageNumber}>
      <h2 className="text-[18px] font-bold text-blue-900 uppercase tracking-wide">Table of Contents</h2>
      <div className="mt-4 text-[13px]">
        {entries.map((e, i) => (
          <a
            key={e.key}
            href={`#${e.anchor}`}
            className="flex items-end gap-2 py-[5px] border-b border-dotted border-slate-300 text-slate-900 no-underline hover:text-blue-700"
            style={{ textDecoration: "none" }}
          >
            <span className="w-6 shrink-0 text-slate-500 tabular-nums">{i + 1}.</span>
            <span className="flex-1 truncate">{e.label}</span>
            <span className="shrink-0 tabular-nums text-slate-700">
              {e.start === e.end ? e.start : `${e.start}–${e.end}`}
            </span>
          </a>
        ))}
      </div>
      <p className="mt-4 text-[10px] italic text-slate-400">Click a line to go to that section.</p>
    </PdfPage>
  );
}
