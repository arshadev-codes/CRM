import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { makesOfSupplyData } from "@/data/makesOfSupplyData";
export const Route = createFileRoute("/settings/makes")({ component: () => (
  <SettingsShell title="Makes of Supply">
    <table className="w-full text-sm border">
      <thead className="bg-slate-100"><tr><th className="border p-2 text-left">Item</th><th className="border p-2 text-left">Default Make</th><th className="border p-2 text-left">Options</th></tr></thead>
      <tbody>{makesOfSupplyData.map(m => (
        <tr key={m.id}><td className="border p-2">{m.item}</td><td className="border p-2">{m.defaultMake}</td><td className="border p-2 text-xs text-muted-foreground">{m.options.join(", ")}</td></tr>
      ))}</tbody>
    </table>
  </SettingsShell>
)});
