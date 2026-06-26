import type React from "react";
import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { getMajorSubsystems, type SubsystemContent } from "@/data/proposalContent";
import { paginateByHeights } from "@/data/paginationHelpers";
import { useBlockHeights } from "@/hooks/useBlockHeights";
import { useEffect } from "react";

// ── Image size constants ───────────────────────────────────────────────────────
// Defined once here so SubsystemImages (visible render) and the measurement
// pass both use exactly the same values — if they drift, measured height won't
// match real height and blocks will get clipped again.
//
// KEY FIX for "image cut off at page bottom":
// Previously the image containers had no explicit height in the measurement
// pass, so getBoundingClientRect() returned the block height BEFORE the image
// loaded (just the text height). paginateByHeights then allocated too little
// space for that page, and PdfPage's overflow:hidden clipped the image.
//
// Fix: give every image container a fixed px height that matches the mm values
// below. At 96 dpi: 1mm = 3.7795px, so 100mm ≈ 378px, 90mm ≈ 340px.
// The containers are sized in px (not mm) because getBoundingClientRect()
// works in px and the off-screen host is a screen-resolution DOM node.
const SINGLE_IMAGE_HEIGHT_MM = 100;
const MULTI_IMAGE_HEIGHT_MM  = 90;

// px equivalents used for explicit container sizing in the measurement pass
const MM_TO_PX = 96 / 25.4;
const SINGLE_IMAGE_HEIGHT_PX = Math.round(SINGLE_IMAGE_HEIGHT_MM * MM_TO_PX); // ≈ 378px
const MULTI_IMAGE_HEIGHT_PX  = Math.round(MULTI_IMAGE_HEIGHT_MM  * MM_TO_PX); // ≈ 340px

export function SubsystemsPdf({
  project,
  startPage = 4,
  onPageCountKnown,
}: {
  project: Project;
  startPage?: number;
  onPageCountKnown?: (count: number) => void;
}): React.ReactElement | null {
  const all = getMajorSubsystems(project.data.systemType);
  const selectedIds = new Set(project.data.selectedSubsystems);
  const blocks: SubsystemContent[] = all.filter(
    (s) => selectedIds.has(s.id) || selectedIds.has(s.title),
  );
  const list = blocks.length ? blocks : all;
  const cust = project.data.subsystemCustomizations ?? {};

  const { heightsMm, measuring, MeasurementPortal } = useBlockHeights(
    list,
    (s, i) => <SubsystemBlockBody s={s} cust={cust[s.id]} index={i} />,
    182,
  );

  const pages = measuring ? [] : paginateByHeights(list, heightsMm, [185, 240]);

  useEffect(() => {
    if (!measuring && onPageCountKnown) {
      onPageCountKnown(Math.max(1, pages.length));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuring, pages.length]);

  if (list.length === 0) return null;

  if (measuring) {
    return <>{MeasurementPortal}</>;
  }

  let counter = -1;

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
                return (
                  <SubsystemBlockBody
                    key={s.id}
                    s={s}
                    cust={cust[s.id]}
                    index={counter}
                  />
                );
              })}
            </div>
          </PdfPage>
        );
      })}
      {MeasurementPortal}
    </>
  );
}

function SubsystemBlockBody({
  s,
  cust,
  index,
}: {
  s: SubsystemContent;
  cust?: { include: boolean; items: { id: string; title: string; description: string }[] };
  index: number;
}) {
  return (
    <section className="pdf-block" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
      <h3 className="text-[14px] font-bold text-slate-900">
        {index + 1}. {s.title}
      </h3>
      <p className="text-[13px] leading-relaxed mt-1.5 text-justify">{s.description}</p>

      <SubsystemImages images={s.images} title={s.title} />

      {cust?.include && cust.items && cust.items.length > 0 && (
        <div className="mt-3" style={{ breakInside: "avoid" }}>
          <div className="text-[14px] font-semibold italic text-slate-800">
            Proposed customizations:
          </div>
          {cust.items.map((item) => (
            <div key={item.id} className="mt-2" style={{ breakInside: "avoid" }}>
              <div className="text-[14px] font-semibold text-slate-900">{item.title}</div>
              <p className="text-[13px] leading-relaxed mt-1 pl-3 whitespace-pre-line">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SubsystemImages({ images, title }: { images?: string[]; title: string }) {
  if (!images || images.length === 0) return null;

  if (images.length === 1) {
    return (
      // Explicit height in px so getBoundingClientRect() in the measurement
      // pass sees the full container height regardless of image load state.
      <div
        className="mt-3 flex justify-center overflow-hidden"
        style={{ height: `${SINGLE_IMAGE_HEIGHT_PX}px` }}
      >
        <img
          src={images[0]}
          alt={title}
          style={{
            height: "100%",
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
      style={{
        gridTemplateColumns: `repeat(${images.length}, 1fr)`,
        height: `${MULTI_IMAGE_HEIGHT_PX}px`, // explicit height for measurement
      }}
    >
      {images.map((src, i) => (
        <div key={i} className="overflow-hidden rounded" style={{ height: "100%" }}>
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