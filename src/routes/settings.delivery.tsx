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
  const [text, setText] = useState(durations.join("\n"));
  const save = () => {
    if (!requireAdminPassword("settings")) return;
    const list = text.split("\n").map(x => x.trim()).filter(Boolean);
    if (!list.length) { toast.error("Keep at least one option"); return; }
    setCms(DELIVERY_DURATIONS_KEY, list);
    toast.success("Saved");
  };
  const reset = () => {
    if (!requireAdminPassword("settings")) return;
    setCms(DELIVERY_DURATIONS_KEY, undefined);
    setText(deliveryDurationOptions.join("\n"));
    toast.success("Reset to built-in options");
  };
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Choices in the Duration drop-down, one per line. Keep "Custom" if you want to type a free duration.
      </p>
      <Textarea rows={Math.min(16, durations.length + 2)} value={text} onChange={e => setText(e.target.value)} />
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={reset}>Reset</Button>
        <Button size="sm" onClick={save}>Save options</Button>
      </div>
    </div>
  );
}
