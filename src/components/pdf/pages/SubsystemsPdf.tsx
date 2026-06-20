import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { getMajorSubsystems, type SubsystemContent } from "@/data/proposalContent";
import { paginateBlocks, weightSubsystem } from "@/data/paginationHelpers";

// Renders all selected Major Subsystems, paginating across as many A4 pages as
// needed. Each subsystem block (title + body + image + customisations) stays on
// a single page — if it doesn't fit the remaining space we push it to a new
// page rather than splitting it.
//
// Returns null when the project has no subsystems selected (avoids an empty
// page in the PDF).
export function SubsystemsPdf({
  project,
  startPage = 4,
}: {
  project: Project;
  startPage?: number;
}): JSX.Element | null {
  const all = getMajorSubsystems(project.data.systemType);
  const selectedIds = new Set(project.data.selectedSubsystems);
  const blocks: SubsystemContent[] = all.filter(
    (s) => selectedIds.has(s.id) || selectedIds.has(s.title),
  );
  const list = blocks.length ? blocks : all;
  if (list.length === 0) return null;

  const cust = project.data.subsystemCustomizations ?? {};

  // First-page capacity is smaller because of the section heading + intro.
  const pages = paginateBlocks(
    list,
    (s) => weightSubsystem(s, cust[s.id]),
    [185, 240],
  );

  // Preserve the global numbering (1., 2., …) across pages.
  let counter = 0;

  return (
    <>
      {pages.map((pageBlocks, pageIdx) => {
        const isFirst = pageIdx === 0;
        return (
          <PdfPage key={pageIdx} pageNumber={startPage + pageIdx}>
            {isFirst && (
              <div style={{ breakInside: "avoid" }}>
                <div className="bg-slate-100 border-l-4 border-blue-700 px-3 py-1.5 font-bold text-[12px] text-slate-800">
                  Major Subsystems Offered:
                </div>
                <p className="text-[10px] mt-2 text-slate-700">
                  The following major subsystems are included in the proposed test setup:
                </p>
                <p className="text-[9.5px] italic text-slate-500 mt-0.5">
                  (Photos used in this section are for representational purposes only. Actual products
                  will differ depending on specific requirements.)
                </p>
              </div>
            )}

            <div className={`${isFirst ? "mt-4" : ""} space-y-4`}>
              {pageBlocks.map((s) => {
                counter += 1;
                const c = cust[s.id];
                return (
                  <section
                    key={s.id}
                    className="pdf-block"
                    style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                  >
                    <h3 className="text-[11.5px] font-bold text-slate-900">
                      {counter}. {s.title}
                    </h3>
                    <p className="text-[10px] leading-relaxed mt-1.5 text-justify">
                      {s.description}
                    </p>

                    {s.image && (
                      <div className="mt-2 flex justify-center">
                        <img
                          src={s.image}
                          alt={s.title}
                          style={{ maxHeight: "55mm", objectFit: "contain" }}
                        />
                      </div>
                    )}

                    {c?.include && c.items && c.items.length > 0 && (
                      <div className="mt-3" style={{ breakInside: "avoid" }}>
                        <div className="text-[10.5px] font-semibold italic text-slate-800">
                          Proposed customizations:
                        </div>
                        {c.items.map((item) => (
                          <div key={item.id} className="mt-2" style={{ breakInside: "avoid" }}>
                            <div className="text-[10px] font-semibold text-slate-900">
                              {item.title}
                            </div>
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
        );
      })}
    </>
  );
}

// How many pages will SubsystemsPdf occupy for this project? Pure function so
// other PDF sections can compute their starting page number.
export function subsystemsPageCount(project: Project): number {
  const all = getMajorSubsystems(project.data.systemType);
  const selectedIds = new Set(project.data.selectedSubsystems);
  const blocks = all.filter((s) => selectedIds.has(s.id) || selectedIds.has(s.title));
  const list = blocks.length ? blocks : all;
  if (list.length === 0) return 0;
  const cust = project.data.subsystemCustomizations ?? {};
  return paginateBlocks(list, (s) => weightSubsystem(s, cust[s.id]), [185, 240]).length;
}
