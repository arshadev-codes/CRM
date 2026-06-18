import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { scopeOfServicesData } from "@/data/scopeOfServicesData";
export const Route = createFileRoute("/settings/scope-services")({ component: () => (
  <SettingsShell title="Scope of Services">
    <ol className="list-decimal pl-5 text-sm space-y-1">{scopeOfServicesData.map(s => <li key={s.id}>{s.title}</li>)}</ol>
  </SettingsShell>
)});
