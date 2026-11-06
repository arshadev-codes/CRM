import type { ReactNode } from "react";
import type { Project } from "@/store/proposalStore";
import { TotalPagesProvider } from "./PdfPage";
import { SectionShell } from "./SectionShell";
import { useDynamicPageCounts, type DynamicSectionKey } from "@/hooks/useDynamicPageCounts";
import { resolveLayout, SECTION_BY_ID, type ProposalLayout } from "@/data/proposalLayout";
import { RFQPdf } from "./pages/RFQPdf";
import { RequirementPdf } from "./pages/RequirementPdf";
import { SystemIntroPdf } from "./pages/SystemIntroPdf";
import { SubsystemsPdf } from "./pages/SubsystemsPdf";
import { ConnectionsTestsPdf } from "./pages/ConnectionsTestsPdf";
import { SystemLayoutPdf } from "./pages/SystemLayoutPdf";
import { ScopeOfSupplyPdf } from "./pages/ScopeOfSupplyPdf";
import { EquipmentInstrumentsPdf } from "./pages/EquipmentInstrumentsPdf";
import { ScopeOfServicesPdf } from "./pages/ScopeOfServicesPdf";
import { ExclusionsMakesPdf } from "./pages/ExclusionsMakesPdf";
import { CommercialTermsPdf } from "./pages/CommercialTermsPdf";
import { TermsPdf } from "./pages/TermsPdf";
import { TableOfContentsPdf, type TocEntry } from "./pages/TableOfContentsPdf";

// data-pdf-settled flips to "true" only once every dynamic section included in
// THIS document has reported its real measured page count — Puppeteer waits on
// it before snapshotting.
export function AllPages({
  project,
  layout,
  editableSectionId,
  onSectionCommit,
}: {
  project: Project;
  layout?: ProposalLayout;
  /** Section currently being edited inline in the preview editor */
  editableSectionId?: string | null;
  onSectionCommit?: (sectionId: string, html: string) => void;
}) {
  const resolved = resolveLayout(layout ?? project.data.layout);
  const active = resolved.sections.filter((s) => s.enabled);
  const overrides = resolved.htmlOverrides ?? {};

  const dynamicKeys = active
    .map((s) => SECTION_BY_ID[s.id]?.dynamic)
    .filter((k): k is DynamicSectionKey => !!k);

  const { isSettled, getCount, report } = useDynamicPageCounts(dynamicKeys);

  // ── Pass 1: page budget ────────────────────────────────────────────────
  // Walk the section order once and work out how many pages each section
  // occupies, so the Table of Contents can print real start/end pages and
  // every footer shows a consistent "Page X of Y".
  const pagesFor = (id: string): number => {
    const def = SECTION_BY_ID[id];
    if (!def) return 0;
    if (def.dynamic) return Math.max(1, getCount(def.dynamic, def.fallbackPages ?? 1));
    return 1;
  };

  let cursor = 1;
  const plan = active.map(({ id }) => {
    const count = pagesFor(id);
    const entry = { id, label: SECTION_BY_ID[id]?.label ?? id, start: cursor, end: cursor + count - 1, count };
    cursor += count;
    return entry;
  });

  const totalPages = Math.max(1, cursor - 1);

  const tocEntries: TocEntry[] = plan
    .filter((e) => e.id !== "toc" && e.count > 0)
    .map(({ id, label, start, end }) => ({ id, label, start, end }));

  // ── Pass 2: render with the resolved page numbers ─────────────────────
  const rendered: ReactNode[] = [];

  for (const { id, start } of plan) {
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
        node = <ScopeOfServicesPdf project={project} pageNumber={start} />; break;
      case "exclusionsMakes":
        node = <ExclusionsMakesPdf project={project} pageNumber={start} />; break;
      case "commercial":
        node = <CommercialTermsPdf project={project} pageNumber={start} />; break;
      case "terms":
        node = <TermsPdf project={project} startPage={start} onPageCountKnown={report("terms")} />; break;
      default:
        continue;
    }

    rendered.push(
      <SectionShell
        key={id}
        id={id}
        overrideHtml={overrides[id]}
        editable={editableSectionId === id}
        onCommit={(html) => onSectionCommit?.(id, html)}
      >
        {node}
      </SectionShell>,
    );
  }

  return (
    <TotalPagesProvider value={totalPages}>
      <div className="proposal-print" data-pdf-settled={isSettled ? "true" : "false"}>
        {rendered}
      </div>
    </TotalPagesProvider>
  );
}
