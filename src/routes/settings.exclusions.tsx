import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { exclusionsData } from "@/data/exclusionsData";
export const Route = createFileRoute("/settings/exclusions")({ component: () => (
  <SettingsShell title="Exclusions">
    <ul className="text-sm space-y-1">{exclusionsData.map(e => <li key={e.id} className="border-b py-1">{e.title}</li>)}</ul>
  </SettingsShell>
)});
