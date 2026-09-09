import { PdfPage } from "../PdfPage";

export interface TocEntry {
  id: string;
  label: string;
  start: number;
  end: number;
}

/**
 * Contents page. Page ranges are computed by AllPages once every dynamic
 * section has reported its measured page count, so start/end always match
 * the real document.
 */
export function TableOfContentsPdf({ pageNumber, entries }: { pageNumber: number; entries: TocEntry[] }) {
  return (
    <PdfPage pageNumber={pageNumber}>
      <h2 className="text-[18px] font-bold text-blue-900 uppercase tracking-wide">Table of Contents</h2>
      <div className="mt-4 text-[13px]">
        {entries.map((e, i) => (
          <div key={e.id} className="flex items-end gap-2 py-[5px] border-b border-dotted border-slate-300">
            <span className="w-6 shrink-0 text-slate-500 tabular-nums">{i + 1}.</span>
            <span className="flex-1 truncate">{e.label}</span>
            <span className="shrink-0 tabular-nums text-slate-700">
              {e.start === e.end ? e.start : `${e.start}–${e.end}`}
            </span>
          </div>
        ))}
      </div>
    </PdfPage>
  );
}
