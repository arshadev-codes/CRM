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
        <h1 className="text-[18px] font-bold text-blue-900 tracking-wide uppercase">{intro.title}</h1>
        <div className="text-[14px]  font-bold  italic text-black-900 mt-3.5">{intro.subtitle}</div>
      </div>

      <p className="text-[13px] leading-relaxed mt-4">{intro.body}</p>

      <div className="mt-4" style={{ breakInside: "avoid" }}>
        <div className="font-bold text-[14px] text-black-800">{intro.realWorld.heading}</div>
        <p className="text-[13px] leading-relaxed mt-1">{intro.realWorld.body}</p>
      </div>

      <div className="mt-6 font-bold text-[14px] ital text-black-900">{intro.highlightsHeading}</div>
      <div className="mt-6 space-y-3">
        {intro.highlights.map(h => (
          <div key={h.n} style={{ breakInside: "avoid" }}>
            <div className="font-bold text-[14px] text-black-900">{h.n}. {h.title}</div>
            <p className="text-[13px] leading-relaxed mt-0.5">{h.body}</p>
          </div>
        ))}
      </div>
    </PdfPage>
  );
}
