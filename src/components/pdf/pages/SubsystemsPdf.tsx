import type React from "react";
import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { getMajorSubsystems, type SubsystemContent } from "@/data/proposalContent";
import { paginateBlocks, weightSubsystem } from "@/data/paginationHelpers";

// Renders all selected Major Subsystems, paginating across as many A4 pages as
// needed. Each subsystem block (title + body + image(s) + customisations) stays
// on a single page — if it doesn't fit the remaining space we push it to a new
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
}): React.ReactElement | null {
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
                <div className="bg-slate-100 border-l-4 border-blue-700 px-3 py-1.5 font-bold text-[14px] text-slate-800">
                  Major Subsystems Offered:
                </div>
                <p className="text-[13px] mt-5 text-slate-700">
                  The following major subsystems are included in the proposed test setup:
                </p>
                <p className="text-[13px] italic text-slate-500 mt-1.5">
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
                    <h3 className="text-[14px] font-bold text-slate-900">
                      {counter}. {s.title}
                    </h3>
                    <p className="text-[13px] leading-relaxed mt-1.5 text-justify">
                      {s.description}
                    </p>

                    <SubsystemImages images={s.images} title={s.title} />

                    {c?.include && c.items && c.items.length > 0 && (
                      <div className="mt-3" style={{ breakInside: "avoid" }}>
                        <div className="text-[14px] font-semibold italic text-slate-800">
                          Proposed customizations:
                        </div>
                        {c.items.map((item) => (
                          <div key={item.id} className="mt-2" style={{ breakInside: "avoid" }}>
                            <div className="text-[14px] font-semibold text-slate-900">
                              {item.title}
                            </div>
                            <p className="text-[13px] leading-relaxed mt-1 pl-3 whitespace-pre-line">
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

// Renders 1, 2, or 3 images for a subsystem block, auto-choosing the layout:
//   1 image  -> full-width, centered, capped height
//   2 images -> side-by-side, 50/50
//   3 images -> side-by-side, 33/33/33
// Each <img> uses object-fit: cover so source photos of any aspect ratio fill
// their slot cleanly without the squashed/blurry look caused by missing
// width constraints.
function SubsystemImages({ images, title }: { images?: string[]; title: string }) {
  if (!images || images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="mt-3 flex justify-center">
        <img
          src={images[0]}
          alt={title}
          style={{
            maxHeight: "65mm",
            maxWidth: "100%",
            width: "auto",
            objectFit: "contain",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="mt-3 grid gap-2"
      style={{ gridTemplateColumns: `repeat(${images.length}, 1fr)` }}
    >
      {images.map((src, i) => (
        <div key={i} className="overflow-hidden rounded" style={{ height: "50mm" }}>
          <img
            src={src}
            alt={`${title} ${i + 1}`}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ))}
    </div>
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