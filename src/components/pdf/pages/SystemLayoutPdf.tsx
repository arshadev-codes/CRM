import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { defaultLayoutImages } from "@/lib/defaultLayoutImages";

// SCHEMATIC OF OFFERED SYSTEM — static text; only the layout image & design PDF link change.
export function SystemLayoutPdf({ project, pageNumber }: { project: Project; pageNumber: number }) {
  const layout = project.data.systemLayout ?? {};
  const imageSrc = layout.imageUrl || defaultLayoutImages[project.data.systemType];
  return (
    <PdfPage pageNumber={pageNumber}>
      <div style={{ breakInside: "avoid" }}>
        <h2 className="text-[18px] font-bold text-blue-900 uppercase tracking-wide">
          Schematic of Offered System
        </h2>
        <p className="text-[13px] mt-2 leading-relaxed">
          The proposed transformer testing system has been designed with optimal placement of all major subsystems
          to ensure safe, efficient and ergonomic operation. The layout shown below reflects the recommended
          installation plan for the customer site. Detailed engineering drawings are provided separately as part of
          the design documentation package.
        </p>
      </div>

      <div className="mt-4 border border-slate-300 rounded overflow-hidden" style={{ breakInside: "avoid" }}>
        <img src={imageSrc} alt="System Layout" className="w-full" style={{ maxHeight: "180mm", objectFit: "contain" }} />
      </div>

      <div className="mt-3 text-[13px]" style={{ breakInside: "avoid" }}>
        <span className="font-semibold">Design PDF: </span>
        {layout.designPdfUrl
          ? <a href={layout.designPdfUrl} className="text-blue-700 underline" target="_blank" rel="noreferrer">Open detailed design drawing</a>
          : <span className="text-slate-500 italic">Not uploaded</span>}
      </div>
    </PdfPage>
  );
}
