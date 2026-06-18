import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { scopeOfSupplyData } from "@/data/scopeOfSupplyData";
export const Route = createFileRoute("/settings/scope-supply")({ component: () => (
  <SettingsShell title="Scope of Supply">
    <ol className="list-decimal pl-5 text-sm space-y-1">{scopeOfSupplyData.map(s => <li key={s.id}>{s.title}{s.defaultIncluded === false && <span className="text-xs text-muted-foreground"> (optional)</span>}</li>)}</ol>
  </SettingsShell>
)});
