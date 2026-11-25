import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SettingsShell } from "@/components/settings/SettingsShell";
import {
  useProposalStore, mergedPaymentTemplates, PAYMENT_TEMPLATES_KEY, PAYMENT_HIDDEN_KEY,
} from "@/store/proposalStore";
import { paymentTemplatesData, type PaymentTemplate } from "@/data/paymentTermsData";
import type { LibraryOverride } from "@/data/libraries";
import { clearSharedItem, removeSharedItem, saveSharedItem, sharedKey } from "@/lib/sharedSettings";
import type { LayeredLibrary } from "@/hooks/useLayeredLibrary";
import { LayeredListEditor, SaveButtons, type ItemFormProps } from "@/components/settings/LayeredListEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/settings/payment")({ component: PaymentTemplates });

/**
 * Payment templates in the same three layers as the other Settings lists:
 * built-in, global (every user, database) and this browser's own list.
 */
function usePaymentTemplatesLibrary(): LayeredLibrary<PaymentTemplate> {
  const localList = useProposalStore(s => s.paymentTemplates);
  const cms = useProposalStore(s => s.cmsOverrides);
  const setCms = useProposalStore(s => s.setCms);
  const reload = useProposalStore(s => s.loadSharedSettings);
  const shared = (cms[sharedKey(PAYMENT_TEMPLATES_KEY)] as LibraryOverride<PaymentTemplate> | undefined) ?? { items: [], deleted: [] };
  const hidden = (cms[PAYMENT_HIDDEN_KEY] as string[] | undefined) ?? [];
  const builtIn = new Set(paymentTemplatesData.map(t => t.id));
  const sharedIds = new Set(shared.items.map(t => t.id));
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const setLocal = (list: PaymentTemplate[]) => useProposalStore.setState({ paymentTemplates: list });
  const unhide = (id: string) => setCms(PAYMENT_HIDDEN_KEY, hidden.filter(h => h !== id));

  const all = mergedPaymentTemplates(localList, { ...cms, [PAYMENT_HIDDEN_KEY]: [] });
  return {
    items: all.filter(t => !hidden.includes(t.id)),
    scopeOf: id => {
      if (sharedIds.has(id)) return "global";
      const mine = localList.find(t => t.id === id);
      const original = paymentTemplatesData.find(t => t.id === id);
      return mine && (!original || !same(mine, original)) ? "local" : "builtin";
    },
    existsBeyondLocal: id => builtIn.has(id) || sharedIds.has(id),
    saveLocal: t => {
      setLocal(localList.some(x => x.id === t.id) ? localList.map(x => (x.id === t.id ? t : x)) : [...localList, t]);
      if (hidden.includes(t.id)) unhide(t.id);
    },
    saveGlobal: async t => {
      if (!(await saveSharedItem(PAYMENT_TEMPLATES_KEY, t))) return false;
      await reload();
      return true;
    },
    removeLocal: id => {
      if (builtIn.has(id) || sharedIds.has(id)) setCms(PAYMENT_HIDDEN_KEY, Array.from(new Set([...hidden, id])));
      else setLocal(localList.filter(t => t.id !== id));
    },
    removeGlobal: async id => {
      if (!(await removeSharedItem(PAYMENT_TEMPLATES_KEY, id, true))) return false;
      await reload();
      return true;
    },
    locallyRemoved: all.filter(t => hidden.includes(t.id)),
    restoreLocal: unhide,
    globallyRemoved: [...paymentTemplatesData, ...localList].filter(
      (t, i, arr) => shared.deleted.includes(t.id) && arr.findIndex(x => x.id === t.id) === i,
    ),
    restoreGlobal: async id => {
      if (!(await clearSharedItem(PAYMENT_TEMPLATES_KEY, id))) return false;
      await reload();
      return true;
    },
    hasLocalChanges: hidden.length > 0 || !same(localList, paymentTemplatesData),
    resetLocal: () => {
      setLocal(paymentTemplatesData);
      setCms(PAYMENT_HIDDEN_KEY, []);
    },
    reload,
  };
}

function PaymentTemplates() {
  const lib = usePaymentTemplatesLibrary();
  const reload = useProposalStore(s => s.loadSharedSettings);
  useEffect(() => { void reload(); }, [reload]);
  const firstId = lib.items[0]?.id;

  return (
    <SettingsShell title="Payment Templates">
      <p className="text-sm text-muted-foreground mb-4">
        Templates offered under "Load template" in the wizard's Payment step. The first one is used for new quotations.
      </p>
      <LayeredListEditor<PaymentTemplate>
        lib={lib}
        itemLabel="template"
        newItem={() => ({ id: crypto.randomUUID(), name: "", milestones: [{ id: crypto.randomUUID(), label: "Advance against PO", percent: 100 }] })}
        isBlank={t => !t.name.trim()}
        renderSummary={t => (
          <div className="min-w-0">
            <div className="font-semibold text-sm">
              {t.name || "(no name)"}
              {t.id === firstId && <span className="ml-2 text-xs font-normal text-muted-foreground">(used for new quotations)</span>}
            </div>
            <ol className="list-decimal pl-5 text-sm mt-1">{t.milestones.map(m => <li key={m.id}>{m.label} — <strong>{m.percent}%</strong></li>)}</ol>
          </div>
        )}
        renderForm={props => <TemplateForm {...props} />}
      />
    </SettingsShell>
  );
}

function TemplateForm({ initial, isNew, onSaveLocal, onSaveGlobal, onCancel }: ItemFormProps<PaymentTemplate>) {
  const [t, setT] = useState(initial);
  const total = t.milestones.reduce((s, m) => s + Number(m.percent || 0), 0);
  const updRow = (i: number, patch: Partial<PaymentTemplate["milestones"][number]>) =>
    setT({ ...t, milestones: t.milestones.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) });
  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs font-medium">Template name</label>
        <Input autoFocus={isNew} value={t.name} placeholder="e.g. 30% advance, 70% before dispatch" onChange={e => setT({ ...t, name: e.target.value })} />
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
        {total !== 100 && <span className="text-xs text-destructive self-center">Total must be 100% to save.</span>}
        <SaveButtons disabled={total !== 100} onCancel={onCancel} onSaveLocal={() => onSaveLocal(t)} onSaveGlobal={() => onSaveGlobal(t)} />
      </div>
    </div>
  );
}
