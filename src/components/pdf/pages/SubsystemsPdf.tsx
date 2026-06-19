import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { getMajorSubsystems, type SubsystemContent } from "@/data/proposalContent";

// Renders all selected Major Subsystems across as many pages as needed.
// Each subsystem block is wrapped in a `break-inside: avoid` container so
// the title + image + description + customizations are never split mid-page.
// We use CSS column-based pagination by letting the browser/Puppeteer flow
// the blocks, with each block keeping itself together.
export function SubsystemsPdf({ project, startPage = 4 }: { project: Project; startPage?: number }) {
  const all = getMajorSubsystems(project.data.systemType);
  const selectedIds = new Set(project.data.selectedSubsystems);
  // Use CMS-managed selected subsystems but fall back to content library by id.
  const blocks: SubsystemContent[] = all.filter(s => selectedIds.has(s.id) || selectedIds.has(s.title));
  // If the wizard selected ids that don't match content library yet, render whatever the user picked from the content library order:
  const list = blocks.length ? blocks : all.slice(0, 4);

  const customizations = project.data.subsystemCustomizations ?? {};

  // We split blocks across pages by pushing them into a single A4 frame and letting
  // `break-inside: avoid` move oversized blocks to the next page automatically.
  // To make Puppeteer's print engine honour this we render ONE long PdfPage container.
  // For on-screen preview we render a single tall frame that Puppeteer will paginate.
  return (
    <div className="proposal-subsystems">
      <PdfPage pageNumber={startPage}>
        <div style={{ breakInside: "avoid" }}>
          <div className="bg-slate-100 border-l-4 border-blue-700 px-3 py-1.5 font-bold text-[12px] text-slate-800">
            Major Subsystems Offered:
          </div>
          <p className="text-[10px] italic text-slate-600 mt-2">
            The following major subsystems are included in the proposed test setup.
            (Photos used in this section are for representational purposes only. Actual products will differ depending on specific requirements.)
          </p>
        </div>

        <div className="mt-4 space-y-5">
          {list.map((s, idx) => {
            const cust = customizations[s.id];
            return (
              <section
                key={s.id}
                className="pdf-block"
                style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
              >
                <h3 className="text-[11.5px] font-bold text-slate-900">
                  {idx + 1}. {s.title}
                </h3>
                <p className="text-[10px] leading-relaxed mt-1.5 text-justify">{s.description}</p>

                {s.image && (
                  <div className="mt-2 flex justify-center">
                    <img src={s.image} alt={s.title} style={{ maxHeight: "55mm", objectFit: "contain" }} />
                  </div>
                )}

                {cust?.include && cust.items && cust.items.length > 0 && (
                  <div className="mt-3" style={{ breakInside: "avoid" }}>
                    <div className="text-[10.5px] font-semibold italic text-slate-800">
                      Proposed customizations:
                    </div>
                    {cust.items.map((item: { id: string; title: string; description: string }) => (
                      <div key={item.id} className="mt-2" style={{ breakInside: "avoid" }}>
                        <div className="text-[10px] font-semibold text-slate-900">{item.title}</div>
                        <p className="text-[10px] leading-relaxed mt-1 pl-3 whitespace-pre-line">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </PdfPage>
    </div>
  );
}
