import { PdfPage } from "../PdfPage";
import type { Project } from "@/store/proposalStore";
import { testsData } from "@/data/testsData";
import { testToConnection, connectionLabels, type ConnectionGroup } from "@/data/connectionsData";

// Auto-generated CONNECTIONS AND TESTS page.
// Tests are grouped under A/B/C by `connectionsData`. Empty connections (and
// their images) are hidden entirely. No manual editing allowed.
export function ConnectionsTestsPdf({ project, pageNumber }: { project: Project; pageNumber: number }) {
  const selected = new Set(project.data.selectedTests);
  const groups: Record<ConnectionGroup, { id: string; title: string }[]> = { A: [], B: [], C: [], Other: [] };
  for (const t of testsData) {
    if (!selected.has(t.id)) continue;
    const g = testToConnection[t.id] ?? "Other";
    groups[g].push({ id: t.id, title: t.title });
  }
  const activeGroups = (Object.keys(groups) as ConnectionGroup[]).filter(g => groups[g].length > 0);

  return (
    <PdfPage pageNumber={pageNumber}>
      <div style={{ breakInside: "avoid" }}>
        <h2 className="text-[13px] font-bold text-blue-800 uppercase tracking-wide">Connections and Tests</h2>
        <p className="text-[10px] text-slate-600 mt-1">
          Selected tests have been automatically grouped under the connection setups required to perform them.
          Connections without any selected tests are not shown.
        </p>
      </div>

      {/* Connection images — placeholder boxes for now; replace with real schematics later. */}
      <div className="mt-4 grid grid-cols-3 gap-3" style={{ breakInside: "avoid" }}>
        {activeGroups.filter(g => g !== "Other").map(g => (
          <div key={g} className="border border-slate-300 rounded">
            <div className="aspect-[4/3] grid place-items-center text-[10px] text-slate-400 bg-slate-50">
              [{connectionLabels[g]} schematic]
            </div>
            <div className="text-center text-[10px] font-semibold py-1 border-t border-slate-200">
              {connectionLabels[g]}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {activeGroups.map(g => (
          <div key={g} style={{ breakInside: "avoid" }}>
            <div className="font-bold text-[11px] text-blue-800">{connectionLabels[g]}</div>
            <ol className="mt-1 list-decimal pl-6 text-[10px] space-y-0.5">
              {groups[g].map(t => <li key={t.id}>{t.title}</li>)}
            </ol>
          </div>
        ))}
      </div>

      {activeGroups.length === 0 && (
        <p className="text-[10px] text-slate-500 italic mt-6">No tests selected yet.</p>
      )}
    </PdfPage>
  );
}
