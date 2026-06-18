import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { testsData } from "@/data/testsData";
export const Route = createFileRoute("/settings/tests")({ component: () => (
  <SettingsShell title="Tests Library">
    <table className="w-full text-sm border">
      <thead className="bg-slate-100"><tr><th className="border p-2 text-left">Test</th><th className="border p-2 text-left w-32">Group</th></tr></thead>
      <tbody>{testsData.map(t => <tr key={t.id}><td className="border p-2">{t.title}</td><td className="border p-2">{t.group}</td></tr>)}</tbody>
    </table>
  </SettingsShell>
)});
