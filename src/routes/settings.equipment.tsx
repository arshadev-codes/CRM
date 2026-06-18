import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { equipmentData } from "@/data/equipmentData";
export const Route = createFileRoute("/settings/equipment")({ component: () => (
  <SettingsShell title="Equipment Library">
    <table className="w-full text-xs border">
      <thead className="bg-slate-100"><tr>{["Equipment","Default","Spec-1","Spec-2","Spec-3","Spec-4","Spec-5"].map(h => <th key={h} className="border p-1.5 text-left">{h}</th>)}</tr></thead>
      <tbody>{equipmentData.map(e => (
        <tr key={e.id}><td className="border p-1.5">{e.equipment}</td><td className="border p-1.5">{e.included ? "Yes" : "No"}</td><td className="border p-1.5">{e.spec1}</td><td className="border p-1.5">{e.spec2}</td><td className="border p-1.5">{e.spec3}</td><td className="border p-1.5">{e.spec4}</td><td className="border p-1.5">{e.spec5}</td></tr>
      ))}</tbody>
    </table>
  </SettingsShell>
)});
