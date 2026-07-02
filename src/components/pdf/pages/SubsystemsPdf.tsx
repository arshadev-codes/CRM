import type React from "react";
import { PdfPage } from "../PdfPage";
import type { Project, CustomizationItem } from "@/store/proposalStore";
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

// A renderable entry in the Major Subsystems flow. Either an actual
// subsystem block, or the single general "Proposed Customizations" block
// that appears once at the end. Using a discriminated union lets both kinds
// of block flow through the same measurement + pagination pipeline, so
// "Proposed Customizations" paginates naturally with everything else
// instead of needing special-cased layout logic.
type FlowItem =
  | { kind: "subsystem"; id: string; subsystem: SubsystemContent }
  | { kind: "customizations"; id: "__proposal_customizations__"; items: CustomizationItem[] };

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
  const subsystemList = blocks.length ? blocks : all;
  // Per-subsystem selected variant key (e.g. "manual", "pneumatic"). Falls
  // back to each subsystem's own variants.default inside SubsystemBlockBody
  // when a given id isn't present here — same fallback rule used in the wizard.
  const variants = project.data.subsystemVariants ?? {};
  // General "Proposed Customizations" — a single flat list, not tied to any
  // specific subsystem. Rendered as its own block at the end of this section.
  const proposalCustomizations = project.data.proposalCustomizations ?? [];

  const flow: FlowItem[] = [
    ...subsystemList.map((s): FlowItem => ({ kind: "subsystem", id: s.id, subsystem: s })),
    ...(proposalCustomizations.length
      ? [{ kind: "customizations", id: "__proposal_customizations__", items: proposalCustomizations } as FlowItem]
      : []),
  ];

  const { heightsMm, measuring, MeasurementPortal } = useBlockHeights(
    flow,
    (item, i) => <FlowBlockBody item={item} variantKey={item.kind === "subsystem" ? variants[item.id] : undefined} index={i} />,
    182,
  );

  const pages = measuring ? [] : paginateByHeights(flow, heightsMm, [185, 240]);

  useEffect(() => {
    if (!measuring && onPageCountKnown) {
      onPageCountKnown(Math.max(1, pages.length));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuring, pages.length]);

  if (flow.length === 0) return null;

  if (measuring) {
    return <>{MeasurementPortal}</>;
  }

  let subsystemCounter = -1;

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
              {pageBlocks.map((item) => {
                // Only subsystem blocks are numbered ("1.", "2.", ...); the
                // trailing customizations block has its own heading instead.
                const index = item.kind === "subsystem" ? ++subsystemCounter : -1;
                return (
                  <FlowBlockBody
                    key={item.id}
                    item={item}
                    variantKey={item.kind === "subsystem" ? variants[item.id] : undefined}
                    index={index}
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

function FlowBlockBody({
  item,
  variantKey,
  index,
}: {
  item: FlowItem;
  variantKey?: string;
  index: number;
}) {
  if (item.kind === "customizations") {
    return <ProposalCustomizationsBlock items={item.items} />;
  }
  return <SubsystemBlockBody s={item.subsystem} variantKey={variantKey} index={index} />;
}

function ProposalCustomizationsBlock({ items }: { items: CustomizationItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="pdf-block" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
      <h3 className="text-[14px] font-bold text-slate-900 italic">Proposed Customizations</h3>
      {items.map((item) => (
        <div key={item.id} className="mt-2" style={{ breakInside: "avoid" }}>
          <div className="text-[14px] font-semibold text-slate-900">{item.title}</div>
          <p className="text-[13px] leading-relaxed mt-1 pl-3 whitespace-pre-line">
            {item.description}
          </p>
        </div>
      ))}
    </section>
  );
}

function SubsystemBlockBody({
  s,
  variantKey,
  index,
}: {
  s: SubsystemContent;
  variantKey?: string;
  index: number;
}) {
  // Resolve which variant option is active. If the project has no explicit
  // selection (variantKey is undefined — e.g. older saved projects, or this
  // subsystem just got added to the wizard), fall back to the subsystem's
  // own default option. If the subsystem has no `variants` at all, both are
  // undefined and we fall straight through to the static title/description.
  const activeKey = variantKey ?? s.variants?.default;
  const activeVariant = s.variants?.options.find((o) => o.key === activeKey);
  const title = activeVariant?.title ?? s.title;
  const description = activeVariant?.description ?? s.description;

  return (
    <section className="pdf-block" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
      <h3 className="text-[14px] font-bold text-slate-900">
        {index + 1}. {title}
      </h3>
      <p className="text-[13px] leading-relaxed mt-1.5 text-justify">{description}</p>

      <SubsystemImages images={s.images} title={title} />
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