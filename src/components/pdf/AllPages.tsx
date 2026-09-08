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

  // Walk sections in the user's order, handing each one its running start page.
  let p = 1;
  const rendered: ReactNode[] = [];

  for (const { id } of active) {
    const def = SECTION_BY_ID[id];
    if (!def) continue;
    const startPage = p;
    let node: ReactNode = null;

    switch (id) {
      case "rfq":
        node = <RFQPdf project={project} />; p += 1; break;
      case "requirement":
        node = <RequirementPdf project={project} />; p += 1; break;
      case "systemIntro":
        node = <SystemIntroPdf project={project} pageNumber={startPage} />; p += 1; break;
      case "subsystems": {
        const n = Math.max(1, getCount("subsystems", def.fallbackPages ?? 6));
        node = <SubsystemsPdf project={project} startPage={startPage} onPageCountKnown={report("subsystems")} />;
        p += n; break;
      }
      case "connections":
        node = <ConnectionsTestsPdf project={project} pageNumber={startPage} />; p += 1; break;
      case "systemLayout":
        node = <SystemLayoutPdf project={project} pageNumber={startPage} />; p += 1; break;
      case "scopeOfSupply": {
        const n = Math.max(1, getCount("scopeOfSupply", def.fallbackPages ?? 3));
        node = <ScopeOfSupplyPdf project={project} startPage={startPage} onPageCountKnown={report("scopeOfSupply")} />;
        p += n; break;
      }
      case "equipmentInstruments":
        node = <EquipmentInstrumentsPdf project={project} pageNumber={startPage} />; p += 1; break;
      case "scopeOfServices":
        node = <ScopeOfServicesPdf project={project} pageNumber={startPage} />; p += 1; break;
      case "exclusionsMakes":
        node = <ExclusionsMakesPdf project={project} pageNumber={startPage} />; p += 1; break;
      case "commercial":
        node = <CommercialTermsPdf project={project} pageNumber={startPage} />; p += 1; break;
      case "terms": {
        const n = Math.max(1, getCount("terms", def.fallbackPages ?? 2));
        node = <TermsPdf project={project} startPage={startPage} onPageCountKnown={report("terms")} />;
        p += n; break;
      }
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

  const totalPages = Math.max(1, p - 1);

  return (
    <TotalPagesProvider value={totalPages}>
      <div className="proposal-print" data-pdf-settled={isSettled ? "true" : "false"}>
        {rendered}
      </div>
    </TotalPagesProvider>
  );
}
