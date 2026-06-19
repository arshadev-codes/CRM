import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { getSystemIntro } from "@/data/proposalContent";

// Page 3 — System Introduction (ATTS / SATTS / CTTS).
// Content is fully driven by the selected system type. User MUST NOT edit it.
export function SystemIntroPdf({ project, pageNumber = 3 }: { project: Project; pageNumber?: number }) {
  const intro = getSystemIntro(project.data.systemType);
  return (
    <PdfPage pageNumber={pageNumber}>
      <div style={{ breakInside: "avoid" }}>
        <h1 className="text-[15px] font-bold text-blue-800 tracking-wide uppercase">{intro.title}</h1>
        <div className="text-[11px] italic text-slate-600 mt-0.5">{intro.subtitle}</div>
      </div>

      <p className="text-[10px] leading-relaxed mt-4">{intro.body}</p>

      <div className="mt-4" style={{ breakInside: "avoid" }}>
        <div className="font-bold text-[11px] text-slate-800">{intro.realWorld.heading}</div>
        <p className="text-[10px] leading-relaxed mt-1">{intro.realWorld.body}</p>
      </div>

      <div className="mt-4 font-bold text-[11px] text-slate-800">{intro.highlightsHeading}</div>
      <div className="mt-2 space-y-3">
        {intro.highlights.map(h => (
          <div key={h.n} style={{ breakInside: "avoid" }}>
            <div className="font-semibold text-[10.5px] text-slate-900">{h.n}. {h.title}</div>
            <p className="text-[10px] leading-relaxed mt-0.5">{h.body}</p>
          </div>
        ))}
      </div>
    </PdfPage>
  );
}
