import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { useLibrary } from "@/hooks/useLibrary";
import { connectionLabels, type ConnectionGroup } from "@/data/connectionsData";
import { useProposalStore } from "@/store/proposalStore";
import { CMS_CONNECTIONS_KEY, resolveConnectionsMap } from "@/data/connectionsHelpers";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const GROUPS: (ConnectionGroup | "__unset__")[] = ["A", "B", "C", "Other", "__unset__"];

export const Route = createFileRoute("/settings/connections")({
  component: ConnectionsSettings,
});

function ConnectionsSettings() {
  const override = useProposalStore(s => s.cmsOverrides[CMS_CONNECTIONS_KEY]);
  const setCms = useProposalStore(s => s.setCms);
  const map = resolveConnectionsMap(override);
  const testsData = useLibrary("tests");

  const setGroup = (testId: string, group: ConnectionGroup | "__unset__") => {
    const current = (override as Record<string, string>) ?? {};
    const next = { ...current, [testId]: group };
    setCms(CMS_CONNECTIONS_KEY, next);
  };

  const reset = () => {
    setCms(CMS_CONNECTIONS_KEY, {});
    toast.success("Reset to defaults");
  };

  // Group tests by current assignment for an at-a-glance view
  const grouped: Record<string, string[]> = { A: [], B: [], C: [], Other: [], Unmapped: [] };
  for (const t of testsData) {
    const g = map[t.id];
    if (g === "A" || g === "B" || g === "C" || g === "Other") grouped[g].push(t.id);
    else grouped.Unmapped.push(t.id);
  }

  return (
    <SettingsShell title="Connections (A / B / C) Mapping">
      <p className="text-sm text-muted-foreground mb-4">
        Assign each test to a connection group. The proposal PDF automatically lists tests under
        their corresponding connection on the Connections &amp; Tests page. Empty groups are hidden
        from the PDF.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
        {(["A", "B", "C", "Other", "Unmapped"] as const).map(g => (
          <div key={g} className="border rounded p-3 bg-slate-50">
            <div className="font-semibold text-sm mb-1">
              {g === "Unmapped" ? "Unmapped" : connectionLabels[g as ConnectionGroup]}
            </div>
            <div className="text-xs text-muted-foreground">{grouped[g].length} test(s)</div>
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-2">
        <Button size="sm" variant="outline" onClick={reset}>Reset to defaults</Button>
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-slate-100">
          <tr>
            <th className="border p-2 text-left">Test</th>
            <th className="border p-2 text-left w-24">Type</th>
            <th className="border p-2 text-left w-48">Connection group</th>
          </tr>
        </thead>
        <tbody>
          {testsData.map(t => {
            const current = (map[t.id] as ConnectionGroup | undefined) ?? "__unset__";
            return (
              <tr key={t.id}>
                <td className="border p-2">{t.title}</td>
                <td className="border p-2 text-xs text-muted-foreground">{t.group}</td>
                <td className="border p-2">
                  <Select value={current} onValueChange={(v) => setGroup(t.id, v as ConnectionGroup | "__unset__")}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GROUPS.map(g => (
                        <SelectItem key={g} value={g}>
                          {g === "__unset__" ? "— Not mapped —" : connectionLabels[g as ConnectionGroup]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </SettingsShell>
  );
}
