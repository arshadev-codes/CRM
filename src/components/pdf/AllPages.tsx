import type { ReactNode } from "react";
import { useProposalStore, type Project } from "@/store/proposalStore";
import { TotalPagesProvider } from "./PdfPage";
import { SectionShell } from "./SectionShell";
import { useDynamicPageCounts, type DynamicSectionKey } from "@/hooks/useDynamicPageCounts";
import { useLibrary } from "@/hooks/useLibrary";
import { resolveLayout, SECTION_BY_ID, type ProposalLayout } from "@/data/proposalLayout";
import { supplyRows } from "@/data/quotationPricing";
import { OfferTypeProvider, type OfferType } from "./offerType";
import { RFQPdf } from "./pages/RFQPdf";
import { RequirementPdf } from "./pages/RequirementPdf";
import { SystemIntroPdf } from "./pages/SystemIntroPdf";
import { SubsystemsPdf } from "./pages/SubsystemsPdf";
import { ConnectionsTestsPdf } from "./pages/ConnectionsTestsPdf";
import { SystemLayoutPdf, hasSystemLayout } from "./pages/SystemLayoutPdf";
import { ScopeOfSupplyPdf } from "./pages/ScopeOfSupplyPdf";
import { EquipmentInstrumentsPdf, hasEquipmentOrInstruments } from "./pages/EquipmentInstrumentsPdf";
import { ScopeOfServicesPdf, DeliverySchedulePdf, hasServiceRows } from "./pages/ScopeOfServicesPdf";
import { ExclusionsMakesPdf } from "./pages/ExclusionsMakesPdf";
import { CommercialTermsPdf } from "./pages/CommercialTermsPdf";
import { TermsPdf } from "./pages/TermsPdf";
import { TableOfContentsPdf, sectionAnchor, type TocEntry } from "./pages/TableOfContentsPdf";

/** Section order of the Commercial Offer (sections hidden in the project's layout stay hidden). */
const COMMERCIAL_ORDER = [
  "rfq", "toc", "scopeOfSupply", "equipmentInstruments", "scopeOfServices",
  "exclusionsMakes", "commercial", "delivery", "terms",
];

/** Sections that print prices: their edited HTML (preview editor) isn't used where prices must not show. */
const PRICED_SECTIONS = new Set(["scopeOfSupply", "equipmentInstruments", "scopeOfServices", "commercial"]);

/** Lines in the Table of Contents for a section (some pages hold two headings). */
function tocLabels(id: string, offer: OfferType): string[] {
  switch (id) {
    case "requirement": return ["Requirement"];
    case "systemIntro": return ["System Introduction"];
    case "subsystems": return ["Major Subsystems Offered"];
    case "connections": return ["Tests & Connections"];
    case "systemLayout": return ["Schematic of Offered System"];
    case "scopeOfSupply": return ["Electrosoft's Scope of Supply — Major Subsystems"];
    case "equipmentInstruments": return ["Electrosoft's Scope of Supply — Equipment & Instruments"];
    case "scopeOfServices": return offer === "commercial" ? ["Electrosoft's Scope of Services"] : ["Electrosoft's Scope of Services", "Delivery Schedule"];
    case "exclusionsMakes": return ["List of Exclusions", "Makes of Supply"];
    case "commercial": return ["Commercial Terms"];
    case "delivery": return ["Delivery Schedule"];
    case "terms": return ["General Terms & Conditions"];
    default: return [SECTION_BY_ID[id]?.label ?? id];
  }
}

// data-pdf-settled flips to "true" only once every dynamic section included in
// THIS document has reported its real measured page count — printing waits on it.
export function AllPages({
  project,
  layout,
  offerType = "techno",
  editableSectionId,
  onSectionCommit,
}: {
  project: Project;
  layout?: ProposalLayout;
  /** Techno-Commercial (complete), Technical (no prices) or Commercial Offer. */
  offerType?: OfferType;
  /** Section currently being edited inline in the preview editor */
  editableSectionId?: string | null;
  onSectionCommit?: (sectionId: string, html: string) => void;
}) {
  const cmsOverrides = useProposalStore((s) => s.cmsOverrides);
  const proprietary = useLibrary("proprietary");
  const resolved = resolveLayout(layout ?? project.data.layout);
  const enabled = new Set(resolved.sections.filter((s) => s.enabled).map((s) => s.id));
  const overrides = resolved.htmlOverrides ?? {};

  const order: string[] =
    offerType === "commercial"
      ? COMMERCIAL_ORDER.filter((id) => enabled.has(id === "delivery" ? "scopeOfServices" : id))
      : resolved.sections
          .filter((s) => s.enabled && !(offerType === "technical" && s.id === "commercial"))
          .map((s) => s.id);

  const dynamicKeys = order
    .map((id) => SECTION_BY_ID[id]?.dynamic)
    .filter((k): k is DynamicSectionKey => !!k);
  const { isSettled, getCount, report } = useDynamicPageCounts(dynamicKeys);

  const hasSupply = supplyRows(project, cmsOverrides, proprietary).length > 0;

  // ── Pass 1: page budget ────────────────────────────────────────────────
  // How many pages each section takes, so the contents page shows real page
  // numbers and every footer a consistent "Page X of Y".
  const pagesFor = (id: string): number => {
    if (id === "scopeOfSupply" && !hasSupply) return 0;
    if (id === "delivery") return 1;
    const def = SECTION_BY_ID[id];
    if (!def) return 0;
    // 0 when the section has nothing to show (e.g. no major subsystems ticked).
    if (def.dynamic) return Math.max(0, getCount(def.dynamic, def.fallbackPages ?? 1));
    // Nothing uploaded in the System Layout step: leave the Schematic page out.
    if (id === "systemLayout" && !hasSystemLayout(project)) return 0;
    if (id === "equipmentInstruments" && !hasEquipmentOrInstruments(project)) return 0;
    // The Commercial Offer prints Scope of Services only when there are services.
    if (id === "scopeOfServices" && offerType === "commercial" && !hasServiceRows(project, proprietary)) return 0;
    if (id === "commercial") return 2; // Pricing + Freight, then the other commercial terms
    return 1;
  };

  let cursor = 1;
  const plan = order.map((id) => {
    const count = pagesFor(id);
    const entry = { id, start: cursor, end: cursor + count - 1, count };
    cursor += count;
    return entry;
  });

  const totalPages = Math.max(1, cursor - 1);

  const tocEntries: TocEntry[] = plan
    .filter((e) => e.id !== "toc" && e.id !== "rfq" && e.count > 0)
    .flatMap(({ id, start, end }) =>
      tocLabels(id, offerType).map((label, i) => ({ key: `${id}-${i}`, anchor: sectionAnchor(id), label, start, end })),
    );

  // ── Pass 2: render with the resolved page numbers ─────────────────────
  const rendered: ReactNode[] = [];

  for (const { id, start, count } of plan) {
    // Sections measured after rendering stay mounted even at 0 pages, so they can report when content appears.
    const dynamic = !!SECTION_BY_ID[id]?.dynamic;
    if (count === 0 && !dynamic) continue;
    let node: ReactNode = null;

    switch (id) {
      case "rfq":
        node = <RFQPdf project={project} pageNumber={start} />; break;
      case "toc":
        node = <TableOfContentsPdf pageNumber={start} entries={tocEntries} />; break;
      case "requirement":
        node = <RequirementPdf project={project} pageNumber={start} />; break;
      case "systemIntro":
        node = <SystemIntroPdf project={project} pageNumber={start} />; break;
      case "subsystems":
        node = <SubsystemsPdf project={project} startPage={start} onPageCountKnown={report("subsystems")} />; break;
      case "connections":
        node = <ConnectionsTestsPdf project={project} pageNumber={start} />; break;
      case "systemLayout":
        node = <SystemLayoutPdf project={project} pageNumber={start} />; break;
      case "scopeOfSupply":
        node = <ScopeOfSupplyPdf project={project} startPage={start} onPageCountKnown={report("scopeOfSupply")} />; break;
      case "equipmentInstruments":
        node = <EquipmentInstrumentsPdf project={project} pageNumber={start} />; break;
      case "scopeOfServices":
        node = <ScopeOfServicesPdf project={project} pageNumber={start} withDelivery={offerType !== "commercial"} />; break;
      case "exclusionsMakes":
        node = <ExclusionsMakesPdf project={project} pageNumber={start} />; break;
      case "commercial":
        node = <CommercialTermsPdf project={project} pageNumber={start} />; break;
      case "delivery":
        node = <DeliverySchedulePdf project={project} pageNumber={start} />; break;
      case "terms":
        node = <TermsPdf project={project} startPage={start} onPageCountKnown={report("terms")} />; break;
      default:
        continue;
    }

    // Edited HTML from the preview editor belongs to the complete offer's layout:
    // the other offers print priced or split sections fresh.
    const useOverride = offerType === "techno" || !PRICED_SECTIONS.has(id);
    rendered.push(
      <SectionShell
        key={id}
        id={id}
        anchorId={sectionAnchor(id)}
        overrideHtml={useOverride ? overrides[id] : undefined}
        editable={editableSectionId === id}
        onCommit={(html) => onSectionCommit?.(id, html)}
      >
        {node}
      </SectionShell>,
    );
  }

  return (
    <OfferTypeProvider value={offerType}>
      <TotalPagesProvider value={totalPages}>
        <div className="proposal-print" data-pdf-settled={isSettled ? "true" : "false"}>
          {rendered}
        </div>
      </TotalPagesProvider>
    </OfferTypeProvider>
  );
}
