import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { pageContent } from "@/data/pageContent";

export function StubPage({ project, pageNumber, pageKey }: { project: Project; pageNumber: number; pageKey: string }) {
  const content = pageContent[project.data.systemType]?.[pageKey];
  if (!content) return <PdfPage pageNumber={pageNumber}><div className="text-slate-400">No content for {pageKey}</div></PdfPage>;
  return (
    <PdfPage pageNumber={pageNumber}>
      <h2 className="text-[14px] font-bold text-blue-800 border-b border-blue-200 pb-1">{content.title}</h2>
      {content.intro && <p className="text-[10px] mt-3 italic text-slate-600">{content.intro}</p>}
      {content.body && <p className="text-[10px] mt-3 leading-relaxed">{content.body}</p>}
      {content.bullets && (
        <ul className="mt-3 text-[10px] space-y-1 list-disc pl-5">
          {content.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      )}
      <div className="mt-6 p-3 border border-dashed border-slate-300 bg-slate-50 text-[9px] text-slate-500">
        Placeholder layout — replace this component with the approved page design. Data wiring already in place.
      </div>
    </PdfPage>
  );
}
