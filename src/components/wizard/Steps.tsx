import type { Project, ProposalData } from "@/store/proposalStore";
import { useProposalStore } from "@/store/proposalStore";
import { systemTypesData, type SystemType } from "@/data/systemTypesData";
import { employeesData } from "@/data/employeesData";
import { testsData } from "@/data/testsData";
import { subsystemsData } from "@/data/subsystemsData";
import { instrumentsData } from "@/data/instrumentsData";
import { equipmentData } from "@/data/equipmentData";
import { proprietaryItemsData } from "@/data/proprietaryItemsData";
import { deliveryDurationOptions, deliveryDefaults } from "@/data/deliveryData";
import { exclusionsData } from "@/data/exclusionsData";
import { makesOfSupplyData } from "@/data/makesOfSupplyData";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

type Update = (patch: Partial<ProposalData>) => void;

export function Step1ProjectSetup({ project, update }: { project: Project; update: Update }) {
  const setSystemType = useProposalStore(s => s.setSystemType);
  const { customer, meta, transformer, systemType } = project.data;
  const c = (patch: Partial<typeof customer>) => update({ customer: { ...customer, ...patch } });
  const m = (patch: Partial<typeof meta>) => update({ meta: { ...meta, ...patch } });
  const t = (patch: Partial<typeof transformer>) => update({ transformer: { ...transformer, ...patch } });

  return (
    <div className="space-y-6">
      <Section title="Customer Details">
        <div className="grid grid-cols-12 gap-3">
          <Field className="col-span-2" label="Title">
            <Select value={customer.title} onValueChange={v => c({ title: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Mr.","Ms.","Mrs.","Dr."].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field className="col-span-5" label="Contact Person"><Input value={customer.contactPerson} onChange={e => c({ contactPerson: e.target.value })} /></Field>
          <Field className="col-span-5" label="Designation"><Input value={customer.designation} onChange={e => c({ designation: e.target.value })} /></Field>
          <Field className="col-span-4" label="Mobile"><Input value={customer.mobile} onChange={e => c({ mobile: e.target.value })} /></Field>
          <Field className="col-span-4" label="Alternate Mobile"><Input value={customer.altMobile} onChange={e => c({ altMobile: e.target.value })} /></Field>
          <Field className="col-span-4" label="Email"><Input type="email" value={customer.email} onChange={e => c({ email: e.target.value })} /></Field>
          <Field className="col-span-7" label="Company Full Name"><Input value={customer.companyFullName} onChange={e => c({ companyFullName: e.target.value })} /></Field>
          <Field className="col-span-5" label="Short Name"><Input value={customer.companyShortName} onChange={e => c({ companyShortName: e.target.value })} /></Field>
          <Field className="col-span-12" label="Address"><Textarea rows={2} value={customer.address} onChange={e => c({ address: e.target.value })} /></Field>
          <Field className="col-span-4" label="City"><Input value={customer.city} onChange={e => c({ city: e.target.value })} /></Field>
          <Field className="col-span-3" label="State"><Input value={customer.state} onChange={e => c({ state: e.target.value })} /></Field>
          <Field className="col-span-2" label="Country"><Input value={customer.country} onChange={e => c({ country: e.target.value })} /></Field>
          <Field className="col-span-3" label="GST Number"><Input value={customer.gst} onChange={e => c({ gst: e.target.value })} /></Field>
        </div>
      </Section>

      <Section title="Proposal Details">
        <div className="grid grid-cols-12 gap-3">
          <Field className="col-span-3" label="Prepared By">
            <Select value={meta.preparedBy} onValueChange={v => m({ preparedBy: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{employeesData.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field className="col-span-3" label="Checked By">
            <Select value={meta.checkedBy} onValueChange={v => m({ checkedBy: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{employeesData.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field className="col-span-3" label="Offer Number"><Input value={meta.offerNumber} onChange={e => m({ offerNumber: e.target.value })} /></Field>
          <Field className="col-span-1" label="Revision">
            <Select value={meta.revision} onValueChange={v => m({ revision: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Array.from({length: 11}).map((_, i) => <SelectItem key={i} value={`R${i}`}>R{i}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field className="col-span-2" label="Date"><Input type="date" value={meta.date} onChange={e => m({ date: e.target.value })} /></Field>
        </div>
      </Section>

      <Section title="Transformer Details">
        <div className="grid grid-cols-12 gap-3">
          <Field className="col-span-3" label="Rating"><Input value={transformer.rating} onChange={e => t({ rating: e.target.value })} /></Field>
          <Field className="col-span-2" label="Unit">
            <Select value={transformer.ratingUnit} onValueChange={v => t({ ratingUnit: v as "MVA"|"KVA" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="MVA">MVA</SelectItem><SelectItem value="KVA">KVA</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field className="col-span-3" label="Voltage"><Input value={transformer.voltage} onChange={e => t({ voltage: e.target.value })} /></Field>
          <Field className="col-span-2" label="Voltage Unit">
            <Select value={transformer.voltageUnit} onValueChange={v => t({ voltageUnit: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["kV","V"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="System Type">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {systemTypesData.map(st => {
            const active = systemType === st.id;
            return (
              <button key={st.id} type="button" onClick={() => { setSystemType(project.id, st.id as SystemType); toast.success(`Switched to ${st.label}`); }}
                className={`text-left p-4 rounded-lg border-2 transition ${active ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200" : "border-slate-200 bg-white hover:border-blue-300"}`}>
                <Badge variant="outline" className="mb-2">{st.badge}</Badge>
                <div className="font-semibold text-slate-900">{st.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{st.tagline}</div>
                <p className="text-[11px] text-slate-600 mt-2">{st.description}</p>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">⚠ Changing system type resets test/instrument/equipment/subsystem defaults (customer info preserved).</p>
      </Section>
    </div>
  );
}

export function Step2Tests({ project, update }: { project: Project; update: Update }) {
  const { selectedTests } = project.data;
  const toggle = (id: string) => update({ selectedTests: selectedTests.includes(id) ? selectedTests.filter(x => x !== id) : [...selectedTests, id] });
  const groups = Array.from(new Set(testsData.map(t => t.group)));
  return (
    <div className="space-y-6">
      {groups.map(g => (
        <Section key={g} title={`${g} Tests`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {testsData.filter(t => t.group === g).map(t => {
              const sel = selectedTests.includes(t.id);
              return (
                <button key={t.id} type="button" onClick={() => toggle(t.id)}
                  className={`text-left p-3 rounded border transition ${sel ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"}`}>
                  <div className="flex items-start gap-2">
                    <Checkbox checked={sel} onCheckedChange={() => toggle(t.id)} className="mt-0.5" />
                    <div className="text-sm">{t.title}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Section>
      ))}
      <p className="text-xs text-muted-foreground">{selectedTests.length} test{selectedTests.length === 1 ? "" : "s"} selected.</p>
    </div>
  );
}

export function Step3Subsystems({ project, update }: { project: Project; update: Update }) {
  const { selectedSubsystems, systemType } = project.data;
  const items = subsystemsData.filter(s => s.systemTypes.includes(systemType));
  const toggle = (id: string) => update({ selectedSubsystems: selectedSubsystems.includes(id) ? selectedSubsystems.filter(x => x !== id) : [...selectedSubsystems, id] });
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Pick the subsystems to include. Descriptions and images are pulled from the CMS at export time — manage them in <strong>Settings → Sub Systems</strong>.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(s => {
          const sel = selectedSubsystems.includes(s.id);
          return (
            <button key={s.id} type="button" onClick={() => toggle(s.id)}
              className={`text-left p-4 rounded border-2 transition ${sel ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"}`}>
              <div className="flex items-start gap-3">
                <Checkbox checked={sel} onCheckedChange={() => toggle(s.id)} className="mt-1" />
                <div>
                  <div className="font-semibold text-sm">{s.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.preview}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Step4InstrumentsEquipment({ project, update }: { project: Project; update: Update }) {
  const { instruments, equipment } = project.data;
  return (
    <div className="space-y-6">
      <Section title="Instruments">
        <SpecTable
          rows={instruments}
          onChange={rows => update({ instruments: rows })}
          firstCol={{ key: "instrument", label: "Instrument" }}
          extraCols={[{ key: "make", label: "Make" }, { key: "model", label: "Model" }]}
          library={instrumentsData}
        />
      </Section>
      <Section title="Equipment">
        <SpecTable
          rows={equipment}
          onChange={rows => update({ equipment: rows })}
          firstCol={{ key: "equipment", label: "Equipment" }}
          includedCol
          library={equipmentData}
        />
      </Section>
    </div>
  );
}

type Row = Record<string, unknown> & { id: string; qty: number; price: string; spec1: string; spec2: string; spec3: string; spec4: string; spec5: string };
function SpecTable<T extends Row>({ rows, onChange, firstCol, extraCols = [], includedCol = false, library }: {
  rows: T[]; onChange: (rows: T[]) => void;
  firstCol: { key: keyof T & string; label: string };
  extraCols?: { key: keyof T & string; label: string }[];
  includedCol?: boolean;
  library: T[];
}) {
  const update = (i: number, patch: Partial<T>) => onChange(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const addBlank = () => {
    const blank: Row = { id: crypto.randomUUID(), qty: 1, price: "", spec1: "", spec2: "", spec3: "", spec4: "", spec5: "" };
    blank[firstCol.key] = ""; extraCols.forEach(c => (blank[c.key] = ""));
    if (includedCol) (blank as Row & { included?: boolean }).included = true;
    onChange([...rows, blank as T]);
  };
  const addFromLib = (id: string) => {
    const item = library.find(l => l.id === id);
    if (item) onChange([...rows, { ...item, id: crypto.randomUUID() }]);
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border">
        <thead className="bg-slate-100">
          <tr>
            <th className="border p-1.5 text-left">{firstCol.label}</th>
            {includedCol && <th className="border p-1.5 w-16">Yes/No</th>}
            {extraCols.map(c => <th key={c.key} className="border p-1.5 text-left">{c.label}</th>)}
            {[1,2,3,4,5].map(n => <th key={n} className="border p-1.5 text-left">Spec-{n}</th>)}
            <th className="border p-1.5 w-14">Qty</th>
            <th className="border p-1.5 w-24">Price</th>
            <th className="border p-1.5 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td className="border p-0.5"><Input className="h-7 text-xs" value={String(r[firstCol.key] ?? "")} onChange={e => update(i, { [firstCol.key]: e.target.value } as Partial<T>)} /></td>
              {includedCol && <td className="border p-0.5 text-center">
                <Checkbox checked={!!(r as Row & { included?: boolean }).included} onCheckedChange={v => update(i, { included: !!v } as unknown as Partial<T>)} />
              </td>}
              {extraCols.map(c => (
                <td key={c.key} className="border p-0.5"><Input className="h-7 text-xs" value={String(r[c.key] ?? "")} onChange={e => update(i, { [c.key]: e.target.value } as Partial<T>)} /></td>
              ))}
              {([1,2,3,4,5] as const).map(n => {
                const key = `spec${n}` as keyof T & string;
                return <td key={n} className="border p-0.5"><Input className="h-7 text-xs" value={String(r[key] ?? "")} onChange={e => update(i, { [key]: e.target.value } as Partial<T>)} /></td>;
              })}
              <td className="border p-0.5"><Input type="number" className="h-7 text-xs" value={r.qty} onChange={e => update(i, { qty: Number(e.target.value) } as Partial<T>)} /></td>
              <td className="border p-0.5"><Input className="h-7 text-xs" value={r.price} onChange={e => update(i, { price: e.target.value } as Partial<T>)} /></td>
              <td className="border p-0.5 text-center"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(i)}><Trash2 className="h-3 w-3" /></Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 mt-2">
        <Button size="sm" variant="outline" onClick={addBlank}><Plus className="h-3 w-3 mr-1" />Add row</Button>
        <Select onValueChange={addFromLib}>
          <SelectTrigger className="w-64 h-8 text-xs"><SelectValue placeholder="Add from library…" /></SelectTrigger>
          <SelectContent>{library.map(l => <SelectItem key={l.id} value={l.id}>{String(l[firstCol.key])}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function Step5Proprietary({ project, update }: { project: Project; update: Update }) {
  const { proprietary } = project.data;
  const toggle = (id: string) => update({ proprietary: proprietary.includes(id) ? proprietary.filter(x => x !== id) : [...proprietary, id] });
  return (
    <div className="space-y-2">
      {proprietaryItemsData.map(p => (
        <label key={p.id} className="flex items-center gap-3 p-3 border rounded hover:bg-slate-50 cursor-pointer">
          <Checkbox checked={proprietary.includes(p.id)} onCheckedChange={() => toggle(p.id)} />
          <span className="text-sm">{p.title}</span>
        </label>
      ))}
    </div>
  );
}

export function Step6Delivery({ project, update }: { project: Project; update: Update }) {
  const { delivery } = project.data;
  const updateRow = (i: number, patch: Partial<typeof delivery[number]>) => update({ delivery: delivery.map((r, idx) => idx === i ? { ...r, ...patch } : r) });
  const remove = (i: number) => update({ delivery: delivery.filter((_, idx) => idx !== i) });
  const add = () => update({ delivery: [...delivery, { id: crypto.randomUUID(), deliverable: "New Deliverable", duration: "Will Be Decided Later" }] });
  return (
    <div className="space-y-3">
      <table className="w-full text-sm border">
        <thead className="bg-slate-100"><tr>
          <th className="border p-2 text-left">Deliverable</th>
          <th className="border p-2 text-left w-56">Duration</th>
          <th className="border p-2 text-left">If Custom</th>
          <th className="border p-2 w-12"></th>
        </tr></thead>
        <tbody>
          {delivery.map((r, i) => (
            <tr key={r.id}>
              <td className="border p-1"><Input value={r.deliverable} onChange={e => updateRow(i, { deliverable: e.target.value })} /></td>
              <td className="border p-1">
                <Select value={r.duration} onValueChange={v => updateRow(i, { duration: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{deliveryDurationOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </td>
              <td className="border p-1">{r.duration === "Custom" && <Input value={r.custom ?? ""} onChange={e => updateRow(i, { custom: e.target.value })} placeholder="e.g. 25 days from PO" />}</td>
              <td className="border p-1 text-center"><Button size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-3 w-3" /></Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={add}><Plus className="h-3 w-3 mr-1" />Add row</Button>
        <Button size="sm" variant="ghost" onClick={() => update({ delivery: deliveryDefaults.map(d => ({ ...d })) })}>Reset to defaults</Button>
      </div>
    </div>
  );
}

export function Step7ExclusionsMakes({ project, update }: { project: Project; update: Update }) {
  const { exclusions, makes } = project.data;
  const toggleEx = (id: string) => update({ exclusions: exclusions.includes(id) ? exclusions.filter(x => x !== id) : [...exclusions, id] });
  const updMake = (id: string, patch: Partial<typeof makes[number]>) => update({ makes: makes.map(m => m.id === id ? { ...m, ...patch } : m) });
  return (
    <div className="space-y-6">
      <Section title="Exclusions">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {exclusionsData.map(e => (
            <label key={e.id} className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer">
              <Checkbox checked={exclusions.includes(e.id)} onCheckedChange={() => toggleEx(e.id)} />
              <span className="text-sm">{e.title}</span>
            </label>
          ))}
        </div>
      </Section>
      <Section title="Makes of Supply">
        <table className="w-full text-sm border">
          <thead className="bg-slate-100"><tr>
            <th className="border p-2 w-16">Use</th><th className="border p-2 text-left">Item</th><th className="border p-2 text-left w-64">Manufacturer</th>
          </tr></thead>
          <tbody>
            {makesOfSupplyData.map(row => {
              const sel = makes.find(m => m.id === row.id);
              if (!sel) return null;
              return (
                <tr key={row.id}>
                  <td className="border p-1 text-center"><Checkbox checked={sel.enabled} onCheckedChange={v => updMake(row.id, { enabled: !!v })} /></td>
                  <td className="border p-1">{row.item}</td>
                  <td className="border p-1">
                    <Select value={sel.make} onValueChange={v => updMake(row.id, { make: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{row.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

export function Step8Payment({ project, update }: { project: Project; update: Update }) {
  const { payment } = project.data;
  const templates = useProposalStore(s => s.paymentTemplates);
  const saveTpl = useProposalStore(s => s.savePaymentTemplate);
  const total = payment.reduce((s, m) => s + Number(m.percent || 0), 0);
  const updRow = (i: number, patch: Partial<typeof payment[number]>) => update({ payment: payment.map((m, idx) => idx === i ? { ...m, ...patch } : m) });
  const add = () => update({ payment: [...payment, { id: crypto.randomUUID(), label: "New milestone", percent: 0 }] });
  const remove = (i: number) => update({ payment: payment.filter((_, idx) => idx !== i) });
  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Label>Load template:</Label>
        <Select onValueChange={v => { const t = templates.find(x => x.id === v); if (t) update({ payment: t.milestones.map(m => ({ ...m })) }); }}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Choose…" /></SelectTrigger>
          <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => { const n = prompt("Template name?"); if (n) { saveTpl(n, payment); toast.success("Template saved"); } }}><Save className="h-3 w-3 mr-1" />Save as template</Button>
      </div>
      <table className="w-full text-sm border">
        <thead className="bg-slate-100"><tr>
          <th className="border p-2 text-left">Milestone</th><th className="border p-2 w-32">Percent</th><th className="border p-2 w-12"></th>
        </tr></thead>
        <tbody>
          {payment.map((m, i) => (
            <tr key={m.id}>
              <td className="border p-1"><Input value={m.label} onChange={e => updRow(i, { label: e.target.value })} /></td>
              <td className="border p-1"><Input type="number" value={m.percent} onChange={e => updRow(i, { percent: Number(e.target.value) })} /></td>
              <td className="border p-1 text-center"><Button size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-3 w-3" /></Button></td>
            </tr>
          ))}
          <tr className="font-bold bg-slate-50">
            <td className="border p-2 text-right">Total</td>
            <td className={`border p-2 ${total === 100 ? "text-emerald-700" : "text-destructive"}`}>{total}%</td>
            <td className="border"></td>
          </tr>
        </tbody>
      </table>
      <Button size="sm" variant="outline" onClick={add}><Plus className="h-3 w-3 mr-1" />Add milestone</Button>
      {total !== 100 && <p className="text-sm text-destructive">⚠ Total must equal 100% (currently {total}%)</p>}
    </div>
  );
}

export function Step9Review({ project }: { project: Project; update: Update }) {
  const d = project.data;
  return (
    <div className="space-y-4">
      <Card><CardContent className="pt-4 text-sm space-y-1">
        <div><strong>Customer:</strong> {d.customer.title} {d.customer.contactPerson} — {d.customer.companyFullName || d.customer.companyShortName}</div>
        <div><strong>Email/Mobile:</strong> {d.customer.email} / {d.customer.mobile}</div>
        <div><strong>Offer:</strong> {d.meta.offerNumber} · {d.meta.revision} · {d.meta.date}</div>
        <div><strong>Transformer:</strong> {d.transformer.rating} {d.transformer.ratingUnit}, {d.transformer.voltage} {d.transformer.voltageUnit}</div>
        <div><strong>System Type:</strong> {d.systemType}</div>
        <div><strong>Tests selected:</strong> {d.selectedTests.length}</div>
        <div><strong>Subsystems selected:</strong> {d.selectedSubsystems.length}</div>
        <div><strong>Instruments:</strong> {d.instruments.length}</div>
        <div><strong>Equipment (included):</strong> {d.equipment.filter(e => e.included).length}</div>
        <div><strong>Proprietary items:</strong> {d.proprietary.length}</div>
        <div><strong>Delivery rows:</strong> {d.delivery.length}</div>
        <div><strong>Exclusions:</strong> {d.exclusions.length}</div>
        <div><strong>Makes enabled:</strong> {d.makes.filter(m => m.enabled).length}</div>
        <div><strong>Payment total:</strong> {d.payment.reduce((s, m) => s + Number(m.percent || 0), 0)}%</div>
      </CardContent></Card>
      <div className="flex gap-2">
        <Button onClick={() => window.open(`/print/${project.id}`, "_blank")}>Open Print View (Puppeteer entry)</Button>
        <Button variant="outline" onClick={() => { const blob = new Blob([JSON.stringify({ project }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${project.name}.json`; a.click(); }}>Download proposal JSON</Button>
      </div>
    </div>
  );
}

// ---- helpers ----
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-blue-800 mb-3 border-b border-blue-100 pb-1">{title}</h3>
      {children}
    </div>
  );
}
function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
