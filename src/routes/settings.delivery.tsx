import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { deliveryDefaults, deliveryDurationOptions } from "@/data/deliveryData";
export const Route = createFileRoute("/settings/delivery")({ component: () => (
  <SettingsShell title="Delivery Templates">
    <h3 className="font-semibold mb-2 text-sm">Default rows</h3>
    <ol className="list-decimal pl-5 text-sm space-y-1 mb-4">{deliveryDefaults.map(d => <li key={d.id}>{d.deliverable} — {d.duration}</li>)}</ol>
    <h3 className="font-semibold mb-2 text-sm">Duration options</h3>
    <div className="flex flex-wrap gap-1 text-xs">{deliveryDurationOptions.map(o => <span key={o} className="px-2 py-1 bg-slate-100 rounded">{o}</span>)}</div>
  </SettingsShell>
)});
