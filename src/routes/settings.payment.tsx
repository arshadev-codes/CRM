import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { useProposalStore } from "@/store/proposalStore";
export const Route = createFileRoute("/settings/payment")({ component: () => {
  const templates = useProposalStore(s => s.paymentTemplates);
  return (
  <SettingsShell title="Payment Templates">
    <div className="space-y-4">{templates.map(t => (
      <div key={t.id} className="border rounded p-3">
        <div className="font-semibold">{t.name}</div>
        <ol className="list-decimal pl-5 text-sm mt-1">{t.milestones.map(m => <li key={m.id}>{m.label} — <strong>{m.percent}%</strong></li>)}</ol>
      </div>
    ))}</div>
  </SettingsShell>
)}});
