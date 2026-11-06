import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { useProposalStore } from "@/store/proposalStore";
import type { PaymentTemplate } from "@/data/paymentTermsData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { requireAdminPassword } from "@/lib/passwordGate";

export const Route = createFileRoute("/settings/payment")({ component: PaymentTemplates });

function PaymentTemplates() {
  const templates = useProposalStore(s => s.paymentTemplates);
  const saveTpl = useProposalStore(s => s.savePaymentTemplate);
  const updateTpl = useProposalStore(s => s.updatePaymentTemplate);
  const deleteTpl = useProposalStore(s => s.deletePaymentTemplate);
  const resetTpls = useProposalStore(s => s.resetPaymentTemplates);
  const [editing, setEditing] = useState<string | null>(null);

  const add = () => {
    if (!requireAdminPassword("settings")) return;
    saveTpl("New template", [{ id: crypto.randomUUID(), label: "Advance against PO", percent: 100 }]);
    const created = useProposalStore.getState().paymentTemplates.at(-1);
    if (created) setEditing(created.id);
  };
  const remove = (id: string) => {
    if (!requireAdminPassword("settings")) return;
    if (templates.length <= 1) { toast.error("Keep at least one template"); return; }
    deleteTpl(id);
    toast.success("Deleted");
  };
  const reset = () => {
    if (!requireAdminPassword("settings")) return;
    if (!window.confirm("Bring back the built-in templates? Every change made on this page will be lost.")) return;
    resetTpls();
    setEditing(null);
    toast.success("Reset to built-in templates");
  };

  return (
    <SettingsShell title="Payment Templates">
      <p className="text-sm text-muted-foreground mb-4">
        Templates offered under "Load template" in the wizard's Payment step. The first one is used for new quotations.
      </p>
      <div className="flex justify-end gap-2 mb-3">
        <Button size="sm" variant="ghost" onClick={reset}><RotateCcw className="h-3 w-3 mr-1" />Reset</Button>
        <Button size="sm" onClick={add}><Plus className="h-3 w-3 mr-1" />Add template</Button>
      </div>
      <div className="space-y-4">{templates.map((t, idx) => (
        <div key={t.id} className="border rounded p-3">
          {editing === t.id ? (
            <TemplateForm
              initial={t}
              onCancel={() => setEditing(null)}
              onSave={next => {
                if (!requireAdminPassword("settings")) return;
                updateTpl(t.id, { name: next.name, milestones: next.milestones });
                setEditing(null);
                toast.success("Saved");
              }}
            />
          ) : (
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-semibold">
                  {t.name}
                  {idx === 0 && <span className="ml-2 text-xs font-normal text-muted-foreground">(used for new quotations)</span>}
                </div>
                <ol className="list-decimal pl-5 text-sm mt-1">{t.milestones.map(m => <li key={m.id}>{m.label} — <strong>{m.percent}%</strong></li>)}</ol>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setEditing(t.id)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(t.id)} title="Delete"><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          )}
        </div>
      ))}</div>
    </SettingsShell>
  );
}

function TemplateForm({ initial, onSave, onCancel }: {
  initial: PaymentTemplate; onSave: (t: PaymentTemplate) => void; onCancel: () => void;
}) {
  const [t, setT] = useState(initial);
  const total = t.milestones.reduce((s, m) => s + Number(m.percent || 0), 0);
  const updRow = (i: number, patch: Partial<PaymentTemplate["milestones"][number]>) =>
    setT({ ...t, milestones: t.milestones.map((m, idx) => idx === i ? { ...m, ...patch } : m) });
  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs font-medium">Template name</label>
        <Input value={t.name} onChange={e => setT({ ...t, name: e.target.value })} />
      </div>
      <table className="w-full text-sm border">
        <thead className="bg-slate-100">
          <tr><th className="border p-2 text-left">Milestone</th><th className="border p-2 w-28">Percent</th><th className="border p-2 w-12"></th></tr>
        </thead>
        <tbody>
          {t.milestones.map((m, i) => (
            <tr key={m.id}>
              <td className="border p-1"><Input value={m.label} onChange={e => updRow(i, { label: e.target.value })} /></td>
              <td className="border p-1"><Input type="number" value={m.percent} onChange={e => updRow(i, { percent: Number(e.target.value) })} /></td>
              <td className="border p-1 text-center">
                <Button size="icon" variant="ghost" onClick={() => setT({ ...t, milestones: t.milestones.filter((_, idx) => idx !== i) })}><Trash2 className="h-3 w-3" /></Button>
              </td>
            </tr>
          ))}
          <tr className="font-bold bg-slate-50">
            <td className="border p-2 text-right">Total</td>
            <td className={`border p-2 ${total === 100 ? "text-emerald-700" : "text-destructive"}`}>{total}%</td>
            <td className="border"></td>
          </tr>
        </tbody>
      </table>
      <div className="flex flex-wrap justify-between gap-2">
        <Button size="sm" variant="outline" onClick={() => setT({ ...t, milestones: [...t.milestones, { id: crypto.randomUUID(), label: "New milestone", percent: 0 }] })}>
          <Plus className="h-3 w-3 mr-1" />Add milestone
        </Button>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button size="sm" disabled={total !== 100} title={total !== 100 ? "Total must be 100%" : undefined} onClick={() => onSave(t)}>Save</Button>
        </div>
      </div>
    </div>
  );
}
