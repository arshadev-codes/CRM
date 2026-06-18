import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { employeesData } from "@/data/employeesData";
export const Route = createFileRoute("/settings/employees")({ component: () => (
  <SettingsShell title="Employees Master">
    <table className="w-full text-sm border">
      <thead className="bg-slate-100"><tr><th className="border p-2 text-left">Name</th><th className="border p-2 text-left">Designation</th></tr></thead>
      <tbody>{employeesData.map(e => <tr key={e.id}><td className="border p-2">{e.name}</td><td className="border p-2">{e.designation}</td></tr>)}</tbody>
    </table>
  </SettingsShell>
)});
