import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { LibraryEditor } from "@/components/settings/LibraryEditor";
import { useDeliveryDurations } from "@/hooks/useLibrary";
import { useProposalStore } from "@/store/proposalStore";
import { DELIVERY_DURATIONS_KEY } from "@/data/libraries";
import { deliveryDurationOptions } from "@/data/deliveryData";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requireAdminPassword } from "@/lib/passwordGate";
import { toast } from "sonner";
import { AsyncButton } from "@/components/ui/async-button";
import { SaveButtons } from "@/components/settings/LayeredListEditor";
import { clearSharedValue, saveSharedValue, sharedKey } from "@/lib/sharedSettings";

export const Route = createFileRoute("/settings/delivery")({ component: DeliverySettings });

function DeliverySettings() {
  const durations = useDeliveryDurations();
  return (
    <SettingsShell title="Delivery Templates">
      <h3 className="font-semibold mb-1 text-sm">Default rows</h3>
      <p className="text-sm text-muted-foreground mb-3">Rows a new quotation starts with (and "Reset to defaults" in the wizard).</p>
      <LibraryEditor
        library="delivery"
        itemLabel="row"
        titleKey="deliverable"
        subtitle={d => d.duration === "Custom" ? d.custom || "Custom" : d.duration}
        newItem={{ deliverable: "New deliverable", duration: "Will Be Decided Later" }}
        fields={[
          { key: "deliverable", label: "Deliverable", type: "text" },
          { key: "duration", label: "Duration", type: "select", options: durations },
          { key: "custom", label: "If duration is Custom", type: "text", placeholder: "e.g. 25 days from PO" },
        ]}
      />
      <h3 className="font-semibold mt-8 mb-1 text-sm">Duration options</h3>
      <DurationsEditor durations={durations} />
    </SettingsShell>
  );
}

function DurationsEditor({ durations }: { durations: string[] }) {
  const setCms = useProposalStore(s => s.setCms);
  const loadSharedSettings = useProposalStore(s => s.loadSharedSettings);
  const hasLocal = useProposalStore(s => Array.isArray(s.cmsOverrides[DELIVERY_DURATIONS_KEY]));
  const hasGlobal = useProposalStore(s => Array.isArray(s.cmsOverrides[sharedKey(DELIVERY_DURATIONS_KEY)]));
  const [text, setText] = useState(durations.join("\n"));
  const list = () => text.split("\n").map(x => x.trim()).filter(Boolean);
  const unchanged = () => list().join("\n") === durations.join("\n");

  const saveLocal = async () => {
    if (!requireAdminPassword("settings")) return;
    if (!list().length) { toast.error("Keep at least one option"); return; }
    if (unchanged()) { toast.info("No changes to save."); return; }
    setCms(DELIVERY_DURATIONS_KEY, list());
    toast.success("Saved locally (this browser only).");
  };
  const saveGlobal = async () => {
    if (!requireAdminPassword("settings")) return;
    if (!list().length) { toast.error("Keep at least one option"); return; }
    if (!(await saveSharedValue(DELIVERY_DURATIONS_KEY, list()))) {
      toast.error("Could not save globally. Check the internet connection and try again.");
      return;
    }
    setCms(DELIVERY_DURATIONS_KEY, undefined);
    await loadSharedSettings();
    toast.success("Saved globally: every user now sees these options.");
  };
  const resetLocal = () => {
    if (!requireAdminPassword("settings")) return;
    setCms(DELIVERY_DURATIONS_KEY, undefined);
    const shared = useProposalStore.getState().cmsOverrides[sharedKey(DELIVERY_DURATIONS_KEY)];
    setText((Array.isArray(shared) && shared.length ? (shared as string[]) : deliveryDurationOptions).join("\n"));
    toast.success("Local changes removed");
  };
  const resetGlobal = async () => {
    if (!requireAdminPassword("settings")) return;
    if (!window.confirm("Bring back the built-in options for every user?")) return;
    if (!(await clearSharedValue(DELIVERY_DURATIONS_KEY))) { toast.error("Could not reset. Try again."); return; }
    await loadSharedSettings();
    if (!hasLocal) setText(deliveryDurationOptions.join("\n"));
    toast.success("Built-in options restored for every user");
  };
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Choices in the Duration drop-down, one per line. Keep "Custom" if you want to type a free duration.
        {hasLocal && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">This browser only</span>}
        {!hasLocal && hasGlobal && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">Global</span>}
      </p>
      <Textarea rows={Math.min(16, durations.length + 2)} value={text} onChange={e => setText(e.target.value)} />
      <div className="flex flex-wrap gap-2 justify-end">
        {hasLocal && <Button size="sm" variant="ghost" onClick={resetLocal}>Undo local changes</Button>}
        {hasGlobal && <AsyncButton size="sm" variant="ghost" onClick={resetGlobal}>Reset for everyone</AsyncButton>}
        <SaveButtons onCancel={() => setText(durations.join("\n"))} onSaveLocal={saveLocal} onSaveGlobal={saveGlobal} />
      </div>
    </div>
  );
}
