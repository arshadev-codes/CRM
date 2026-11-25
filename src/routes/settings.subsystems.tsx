import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Globe, Loader2, Monitor } from "lucide-react";
import { toast } from "sonner";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { useProposalStore } from "@/store/proposalStore";
import { getBaseMajorSubsystems, subsystemsCmsKey, type SubsystemContent } from "@/data/proposalContent";
import { systemTypesData, type SystemType } from "@/data/systemTypesData";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useLayeredLibrary } from "@/hooks/useLayeredLibrary";
import { LayeredListEditor, SaveButtons, type SaveScope } from "@/components/settings/LayeredListEditor";
import { SubsystemForm, blankSubsystem, isBlankSubsystem } from "@/components/settings/SubsystemForm";
import { requireAdminPassword } from "@/lib/passwordGate";

export const Route = createFileRoute("/settings/subsystems")({
  component: SubsystemsSettings,
});

/** Where the on/off switches in the list save to; remembered in this browser. */
const QUICK_SCOPE_KEY = "es_subsystems_switch_scope";
function readQuickScope(): SaveScope {
  try { return localStorage.getItem(QUICK_SCOPE_KEY) === "local" ? "local" : "global"; } catch { return "global"; }
}

function SubsystemsSettings() {
  const loadSharedSettings = useProposalStore(s => s.loadSharedSettings);
  // Fetch again on opening, so changes other users saved show up.
  useEffect(() => { void loadSharedSettings(); }, [loadSharedSettings]);
  const [quickScope, setQuickScope] = useState<SaveScope>("global");
  useEffect(() => setQuickScope(readQuickScope()), []);
  const chooseScope = (s: SaveScope) => {
    setQuickScope(s);
    try { localStorage.setItem(QUICK_SCOPE_KEY, s); } catch { /* not remembered */ }
  };
  return (
    <SettingsShell title="Major Sub Systems">
      <p className="text-sm text-muted-foreground mb-4">
        This library powers the <strong>Major Subsystems</strong> pages and the Scope of Supply pricing table of the PDF.
        The switch on each row is <strong>Show title &amp; description in the PDF</strong>: off means the item is only
        priced (no description block).
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-600">Switches save:</span>
        <div className="flex rounded-md border bg-slate-50 p-0.5">
          <button
            onClick={() => chooseScope("global")}
            className={`inline-flex items-center gap-1 rounded px-2.5 py-1 font-medium ${quickScope === "global" ? "bg-white shadow text-emerald-700" : "text-slate-500"}`}
          >
            <Globe className="h-3 w-3" />Globally (every user)
          </button>
          <button
            onClick={() => chooseScope("local")}
            className={`inline-flex items-center gap-1 rounded px-2.5 py-1 font-medium ${quickScope === "local" ? "bg-white shadow text-amber-700" : "text-slate-500"}`}
          >
            <Monitor className="h-3 w-3" />Locally (this browser)
          </button>
        </div>
      </div>
      <Tabs defaultValue="Advanced" className="w-full">
        <TabsList className="flex-wrap h-auto">
          {systemTypesData.map(st => (
            <TabsTrigger key={st.id} value={st.id}>{st.label}</TabsTrigger>
          ))}
        </TabsList>
        {systemTypesData.map(st => (
          <TabsContent key={st.id} value={st.id}>
            <SubsystemsEditor systemType={st.id} quickScope={quickScope} />
          </TabsContent>
        ))}
      </Tabs>
    </SettingsShell>
  );
}

function SubsystemsEditor({ systemType, quickScope }: { systemType: SystemType; quickScope: SaveScope }) {
  const lib = useLayeredLibrary<SubsystemContent>(subsystemsCmsKey(systemType), getBaseMajorSubsystems(systemType));
  const [pending, setPending] = useState<Set<string>>(new Set());

  const setShown = async (item: SubsystemContent, shown: boolean) => {
    if (!requireAdminPassword("settings") || pending.has(item.id)) return;
    const next = { ...item, pricingOnly: !shown };
    const label = shown ? "shown with title & description" : "pricing only";
    if (quickScope === "local") {
      lib.saveLocal(next);
      toast.success(`"${item.title}": ${label} (this browser only).`);
      return;
    }
    setPending(p => new Set(p).add(item.id));
    try {
      if (await lib.saveGlobal(next)) toast.success(`"${item.title}": ${label} (every user).`);
      else toast.error("Could not save globally. Check the internet connection and try again.");
    } finally {
      setPending(p => { const n = new Set(p); n.delete(item.id); return n; });
    }
  };

  return (
    <LayeredListEditor<SubsystemContent>
      lib={lib}
      itemLabel="subsystem"
      newItem={() => blankSubsystem(crypto.randomUUID())}
      isBlank={s => isBlankSubsystem(s) || !s.title.trim()}
      renderSummary={item => (
        <div className="min-w-0">
          <div className="font-semibold text-sm">
            {item.title || "(no title)"}
            {item.pricingOnly && (
              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">Pricing only</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{item.preview}</div>
        </div>
      )}
      renderRowExtra={item => (
        <label
          className="mr-2 flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer whitespace-nowrap"
          title="Show title & description in the PDF (off = pricing only)"
        >
          {pending.has(item.id) && <Loader2 className="h-3 w-3 animate-spin" />}
          <Switch
            checked={!item.pricingOnly}
            disabled={pending.has(item.id)}
            onCheckedChange={on => void setShown(item, on)}
          />
          In PDF
        </label>
      )}
      renderForm={({ initial, isNew, onSaveLocal, onSaveGlobal, onCancel }) => (
        <SubsystemForm
          initial={initial}
          autoFocus={isNew}
          actions={(s, busy) => (
            <SaveButtons disabled={busy} onCancel={onCancel} onSaveLocal={() => onSaveLocal(s)} onSaveGlobal={() => onSaveGlobal(s)} />
          )}
        />
      )}
    />
  );
}
