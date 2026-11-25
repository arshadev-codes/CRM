import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { useLibrary } from "@/hooks/useLibrary";
import { connectionLabels, type ConnectionGroup } from "@/data/connectionsData";
import { useEffect, useState } from "react";
import { useProposalStore } from "@/store/proposalStore";
import { CMS_CONNECTIONS_KEY, resolveConnectionsMap } from "@/data/connectionsHelpers";
import { Button } from "@/components/ui/button";
import { AsyncButton } from "@/components/ui/async-button";
import { SaveButtons } from "@/components/settings/LayeredListEditor";
import { clearSharedValue, saveSharedValue, sharedKey } from "@/lib/sharedSettings";
import { requireAdminPassword } from "@/lib/passwordGate";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const GROUPS: (ConnectionGroup | "__unset__")[] = ["A", "B", "C", "Other", "__unset__"];

export const Route = createFileRoute("/settings/connections")({
  component: ConnectionsSettings,
});

function ConnectionsSettings() {
  const override = useProposalStore(s => s.cmsOverrides[CMS_CONNECTIONS_KEY]);
  const shared = useProposalStore(s => s.cmsOverrides[sharedKey(CMS_CONNECTIONS_KEY)]);
  const setCms = useProposalStore(s => s.setCms);
  const loadSharedSettings = useProposalStore(s => s.loadSharedSettings);
  const saved = resolveConnectionsMap(override, shared);
  const testsData = useLibrary("tests");
  // Changes are collected here and saved with Save locally / Save globally.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const map = resolveConnectionsMap({ ...((override as Record<string, string>) ?? {}), ...draft }, shared);
  const dirty = Object.keys(draft).length > 0;
  const hasLocal = !!override && Object.keys(override as object).length > 0;
  const hasGlobal = !!shared && Object.keys(shared as object).length > 0;
  useEffect(() => { void loadSharedSettings(); }, [loadSharedSettings]);

  const setGroup = (testId: string, group: ConnectionGroup | "__unset__") =>
    setDraft(d => ({ ...d, [testId]: group }));

  const saveLocal = async () => {
    if (!requireAdminPassword("settings")) return;
    if (!dirty) { toast.info("No changes to save."); return; }
    setCms(CMS_CONNECTIONS_KEY, { ...((override as Record<string, string>) ?? {}), ...draft });
    setDraft({});
    toast.success("Saved locally (this browser only).");
  };
  const saveGlobal = async () => {
    if (!requireAdminPassword("settings")) return;
    // The whole mapping as shown, so every user gets exactly this.
    const full: Record<string, string> = {};
    for (const t of testsData) full[t.id] = map[t.id] ?? "__unset__";
    if (!(await saveSharedValue(CMS_CONNECTIONS_KEY, full))) {
      toast.error("Could not save globally. Check the internet connection and try again.");
      return;
    }
    setCms(CMS_CONNECTIONS_KEY, undefined);
    setDraft({});
    await loadSharedSettings();
    toast.success("Saved globally: every user now uses this mapping.");
  };
  const resetLocal = () => {
    if (!requireAdminPassword("settings")) return;
    setCms(CMS_CONNECTIONS_KEY, undefined);
    setDraft({});
    toast.success("Local changes removed");
  };
  const resetGlobal = async () => {
    if (!requireAdminPassword("settings")) return;
    if (!window.confirm("Bring back the built-in mapping for every user?")) return;
    if (!(await clearSharedValue(CMS_CONNECTIONS_KEY))) { toast.error("Could not reset. Try again."); return; }
    await loadSharedSettings();
    toast.success("Built-in mapping restored for every user");
  };
  void saved;

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

      <div className="flex flex-wrap items-center justify-end gap-2 mb-2">
        {hasLocal && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">Local changes in this browser</span>}
        {hasGlobal && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">Global mapping</span>}
        {hasLocal && <Button size="sm" variant="ghost" onClick={resetLocal}>Undo local changes</Button>}
        {hasGlobal && <AsyncButton size="sm" variant="ghost" onClick={resetGlobal}>Reset for everyone</AsyncButton>}
        <SaveButtons onCancel={() => setDraft({})} onSaveLocal={saveLocal} onSaveGlobal={saveGlobal} />
      </div>
      {dirty && <p className="text-xs text-amber-700 mb-2 text-right">Unsaved changes: press Save locally or Save globally.</p>}

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
