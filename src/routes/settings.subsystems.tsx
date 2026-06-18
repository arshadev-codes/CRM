import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { subsystemsData } from "@/data/subsystemsData";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/settings/subsystems")({ component: () => (
  <SettingsShell title="Major Sub Systems">
    <div className="space-y-3">
      {subsystemsData.map(s => (
        <div key={s.id} className="border rounded p-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{s.title}</div>
            <div className="flex gap-1">{s.systemTypes.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">{s.preview}</div>
          <details className="mt-2"><summary className="text-xs text-blue-700 cursor-pointer">Full description</summary>
            <p className="text-xs mt-1 text-slate-600">{s.description}</p></details>
        </div>
      ))}
    </div>
  </SettingsShell>
)});
