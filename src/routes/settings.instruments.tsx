import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { instrumentsData } from "@/data/instrumentsData";
export const Route = createFileRoute("/settings/instruments")({ component: () => (
  <SettingsShell title="Instruments Library">
    <table className="w-full text-xs border">
      <thead className="bg-slate-100"><tr>{["Instrument","Make","Model","Spec-1","Spec-2","Spec-3","Spec-4","Spec-5"].map(h => <th key={h} className="border p-1.5 text-left">{h}</th>)}</tr></thead>
      <tbody>{instrumentsData.map(i => (
        <tr key={i.id}><td className="border p-1.5">{i.instrument}</td><td className="border p-1.5">{i.make}</td><td className="border p-1.5">{i.model}</td><td className="border p-1.5">{i.spec1}</td><td className="border p-1.5">{i.spec2}</td><td className="border p-1.5">{i.spec3}</td><td className="border p-1.5">{i.spec4}</td><td className="border p-1.5">{i.spec5}</td></tr>
      ))}</tbody>
    </table>
  </SettingsShell>
)});
