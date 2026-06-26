import type { Project, ProposalData, SubsystemCustomization, CustomizationItem } from "@/store/proposalStore";
import { useProposalStore } from "@/store/proposalStore";
import { systemTypesData, type SystemType } from "@/data/systemTypesData";
import { testsData } from "@/data/testsData";
import { getMajorSubsystems } from "@/data/proposalContent";
import { instrumentsData } from "@/data/instrumentsData";
import { equipmentData } from "@/data/equipmentData";
import { proprietaryItemsData } from "@/data/proprietaryItemsData";
import { deliveryDurationOptions, deliveryDefaults } from "@/data/deliveryData";
import { exclusionsData } from "@/data/exclusionsData";
import { makesOfSupplyData } from "@/data/makesOfSupplyData";
import { CompanyAutocomplete } from "@/components/wizard/CompanyAutocomplete";
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
import { Link } from "@tanstack/react-router";



type Update = (patch: Partial<ProposalData>) => void;

export function Step1ProjectSetup({ project, update }: { project: Project; update: Update }) {
  const setSystemType = useProposalStore(s => s.setSystemType);
  const employees = useProposalStore(s => s.employees);
  const { customer, meta, transformer, systemType } = project.data;
  const c = (patch: Partial<typeof customer>) => update({ customer: { ...customer, ...patch } });
  const m = (patch: Partial<typeof meta>) => update({ meta: { ...meta, ...patch } });
  const t = (patch: Partial<typeof transformer>) => update({ transformer: { ...transformer, ...patch } });

  return (
    <div className="space-y-8 p-2">
      {/* COMPANY NAME — TOP / FIRST FIELD with autocomplete */}
      <NeoSection title="Company">
        <div className="grid grid-cols-12 gap-4">
          <Field className="col-span-12 md:col-span-8" label="Company Name (start typing to search)">
            <CompanyAutocomplete
              value={customer.companyFullName}
              onChange={(v) => c({ companyFullName: v })}
              onPick={(co) => c({
                companyFullName: co.companyFullName,
                companyShortName: co.companyShortName,
                address: co.address,
                city: co.city,
                state: co.state,
                country: co.country,
                gst: co.gst,
                contactPerson: co.contactPerson ?? customer.contactPerson,
                designation: co.designation ?? customer.designation,
                mobile: co.mobile ?? customer.mobile,
                email: co.email ?? customer.email,
              })}
            />
          </Field>
          <Field className="col-span-12 md:col-span-4" label="Short Name">
            <NeoInput value={customer.companyShortName} onChange={e => c({ companyShortName: e.target.value })} placeholder="e.g. PGCIL" />
          </Field>
          <div className="col-span-12 -mt-1 text-[11px] text-slate-500">
            Don't see your company? <Link to="/settings/companies" className="text-blue-700 underline font-medium">Add it in Settings → Companies</Link>
          </div>
        </div>
      </NeoSection>

      <NeoSection title="Customer Details">
        <div className="grid grid-cols-12 gap-4">
          <Field className="col-span-2" label="Title">
            <Select value={customer.title} onValueChange={v => c({ title: v })}>
              <SelectTrigger className="neo-inset !shadow-none border-0 h-[42px]"><SelectValue /></SelectTrigger>
              <SelectContent>{["Mr.","Ms.","Mrs.","Dr."].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field className="col-span-5" label="Contact Person"><NeoInput value={customer.contactPerson} onChange={e => c({ contactPerson: e.target.value })} /></Field>
          <Field className="col-span-5" label="Designation"><NeoInput value={customer.designation} onChange={e => c({ designation: e.target.value })} /></Field>
          <Field className="col-span-4" label="Mobile"><NeoInput value={customer.mobile} onChange={e => c({ mobile: e.target.value })} /></Field>
          <Field className="col-span-4" label="Alternate Mobile"><NeoInput value={customer.altMobile} onChange={e => c({ altMobile: e.target.value })} /></Field>
          <Field className="col-span-4" label="Email"><NeoInput type="email" value={customer.email} onChange={e => c({ email: e.target.value })} /></Field>
          <Field className="col-span-12" label="Address">
            <textarea rows={2} className="neo-inset w-full px-3 py-2 text-sm outline-none resize-y"
              value={customer.address} onChange={e => c({ address: e.target.value })} />
          </Field>
          <Field className="col-span-4" label="City"><NeoInput value={customer.city} onChange={e => c({ city: e.target.value })} /></Field>
          <Field className="col-span-3" label="State"><NeoInput value={customer.state} onChange={e => c({ state: e.target.value })} /></Field>
          <Field className="col-span-2" label="Country"><NeoInput value={customer.country} onChange={e => c({ country: e.target.value })} /></Field>
          <Field className="col-span-3" label="GST Number"><NeoInput value={customer.gst} onChange={e => c({ gst: e.target.value })} /></Field>
        </div>
      </NeoSection>

      <NeoSection title="Proposal Details">
        <div className="grid grid-cols-12 gap-4">
          <Field className="col-span-3" label="Prepared By">
            <Select value={meta.preparedBy} onValueChange={v => m({ preparedBy: v })}>
              <SelectTrigger className="neo-inset !shadow-none border-0 h-[42px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}{e.designation ? ` — ${e.designation}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field className="col-span-3" label="Checked By">
            <Select value={meta.checkedBy} onValueChange={v => m({ checkedBy: v })}>
              <SelectTrigger className="neo-inset !shadow-none border-0 h-[42px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}{e.designation ? ` — ${e.designation}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field className="col-span-3" label="Offer Number"><NeoInput value={meta.offerNumber} onChange={e => m({ offerNumber: e.target.value })} /></Field>
          <Field className="col-span-1" label="Revision">
            <Select value={meta.revision} onValueChange={v => m({ revision: v })}>
              <SelectTrigger className="neo-inset !shadow-none border-0 h-[42px]"><SelectValue /></SelectTrigger>
              <SelectContent>{Array.from({length: 11}).map((_, i) => <SelectItem key={i} value={`R${i}`}>R{i}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field className="col-span-2" label="Date"><NeoInput type="date" value={meta.date} onChange={e => m({ date: e.target.value })} /></Field>
          <div className="col-span-12 -mt-1 text-[11px] text-slate-500">
            Need to add or change an employee? <Link to="/settings/employees" className="text-blue-700 underline font-medium">Manage in Settings → Employees</Link>
          </div>
        </div>
      </NeoSection>

      <NeoSection title="Transformer Details">
        <div className="grid grid-cols-12 gap-4">
          <Field className="col-span-3" label="Rating"><NeoInput value={transformer.rating} onChange={e => t({ rating: e.target.value })} /></Field>
          <Field className="col-span-2" label="Unit">
            <Select value={transformer.ratingUnit} onValueChange={v => t({ ratingUnit: v as "MVA"|"KVA" })}>
              <SelectTrigger className="neo-inset !shadow-none border-0 h-[42px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="MVA">MVA</SelectItem><SelectItem value="KVA">KVA</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field className="col-span-3" label="Voltage"><NeoInput value={transformer.voltage} onChange={e => t({ voltage: e.target.value })} /></Field>
          <Field className="col-span-2" label="Voltage Unit">
            <Select value={transformer.voltageUnit} onValueChange={v => t({ voltageUnit: v })}>
              <SelectTrigger className="neo-inset !shadow-none border-0 h-[42px]"><SelectValue /></SelectTrigger>
              <SelectContent>{["kV","V"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
      </NeoSection>

      <NeoSection title="System Type">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {systemTypesData.map(st => {
            const active = systemType === st.id;
            return (
              <button key={st.id} type="button" onClick={() => { setSystemType(project.id, st.id as SystemType); toast.success(`Switched to ${st.label}`); }}
                className={`text-left p-4 rounded-2xl transition ${active ? "neo-inset ring-2 ring-blue-400/60" : "neo-pop"}`}>
                <Badge variant="outline" className="mb-2">{st.badge}</Badge>
                <div className="font-semibold text-slate-800">{st.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{st.tagline}</div>
                <p className="text-[11px] text-slate-600 mt-2">{st.description}</p>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">⚠ Changing system type resets test/instrument/equipment/subsystem defaults (customer info preserved).</p>
      </NeoSection>
    </div>
  );
}

function NeoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="neo-surface p-5">
      <h3 className="text-sm font-bold text-blue-800 mb-4 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

function NeoInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`neo-inset w-full px-3 py-2 text-sm outline-none ${className}`} />;
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
  const { selectedSubsystems, subsystemCustomizations, systemType } = project.data;
  const items = getMajorSubsystems(systemType);
  const toggle = (id: string) =>
    update({ selectedSubsystems: selectedSubsystems.includes(id) ? selectedSubsystems.filter(x => x !== id) : [...selectedSubsystems, id] });

  const setCust = (id: string, patch: Partial<SubsystemCustomization>) => {
    const current = subsystemCustomizations[id] ?? { include: false, items: [] };
    update({ subsystemCustomizations: { ...subsystemCustomizations, [id]: { ...current, ...patch } } });
  };
  const addCustItem = (id: string) => {
    const current = subsystemCustomizations[id] ?? { include: true, items: [] };
    setCust(id, { include: true, items: [...current.items, { id: crypto.randomUUID(), title: "", description: "" }] });
  };
  const updCustItem = (sid: string, iid: string, patch: Partial<CustomizationItem>) => {
    const current = subsystemCustomizations[sid] ?? { include: true, items: [] };
    setCust(sid, { items: current.items.map(it => it.id === iid ? { ...it, ...patch } : it) });
  };
  const removeCustItem = (sid: string, iid: string) => {
    const current = subsystemCustomizations[sid] ?? { include: false, items: [] };
    setCust(sid, { items: current.items.filter(it => it.id !== iid) });
  };
  const moveCustItem = (sid: string, idx: number, dir: -1 | 1) => {
    const current = subsystemCustomizations[sid] ?? { include: false, items: [] };
    const arr = [...current.items];
    const ni = idx + dir;
    if (ni < 0 || ni >= arr.length) return;
    [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
    setCust(sid, { items: arr });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Select the subsystems to include. Titles, descriptions and images are managed in <strong>Settings → Major Sub Systems</strong>
        {" "}and are inserted automatically into the PDF — you do not see or edit that content here.
      </p>
      <div className="space-y-2">
        {items.map(s => {
          const sel = selectedSubsystems.includes(s.id);
          const cust = subsystemCustomizations[s.id] ?? { include: false, items: [] };
          return (
            <div key={s.id} className={`rounded border-2 transition ${sel ? "border-blue-600 bg-blue-50/50" : "border-slate-200 bg-white"}`}>
              <button type="button" onClick={() => toggle(s.id)} className="w-full text-left p-3 flex items-start gap-3">
                <Checkbox checked={sel} onCheckedChange={() => toggle(s.id)} className="mt-1" />
                <div>
                  <div className="font-semibold text-sm">{s.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.preview}</div>
                </div>
              </button>

              {sel && (
                <div className="px-3 pb-3 border-t border-blue-100 pt-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox checked={cust.include} onCheckedChange={v => setCust(s.id, { include: !!v })} />
                    <span>Include <strong>Proposed Customizations</strong> for this subsystem</span>
                  </label>
                  {cust.include && (
                    <div className="mt-3 space-y-3 pl-5 border-l-2 border-blue-200">
                      {cust.items.map((it, idx) => (
                        <div key={it.id} className="rounded border bg-white p-2 space-y-2">
                          <div className="flex gap-2">
                            <Input placeholder="Customization title (e.g. Additional safety measures…)"
                              value={it.title} onChange={e => updCustItem(s.id, it.id, { title: e.target.value })} />
                            <Button size="icon" variant="ghost" onClick={() => moveCustItem(s.id, idx, -1)} disabled={idx === 0}>↑</Button>
                            <Button size="icon" variant="ghost" onClick={() => moveCustItem(s.id, idx, 1)} disabled={idx === cust.items.length - 1}>↓</Button>
                            <Button size="icon" variant="ghost" onClick={() => removeCustItem(s.id, it.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                          <Textarea rows={4} placeholder={"a. Description line one\nb. Description line two"}
                            value={it.description} onChange={e => updCustItem(s.id, it.id, { description: e.target.value })} />
                        </div>
                      ))}
                      <Button size="sm" variant="outline" onClick={() => addCustItem(s.id)}>
                        <Plus className="h-3 w-3 mr-1" />Add customization
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Step3bSystemLayout({ project, update }: { project: Project; update: Update }) {
  const layout = project.data.systemLayout ?? {};
  const onFile = (file: File | null, key: "imageUrl" | "designPdfUrl") => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ systemLayout: { ...layout, [key]: String(reader.result) } });
    reader.readAsDataURL(file);
  };
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        The <strong>Schematic of Offered System</strong> page text is fixed and not editable. Only the layout image and the
        design PDF link below appear on that page. Defaults can be set in Settings; replace them here for this specific project.
      </p>

      <Section title="Layout Image">
        <div className="flex items-start gap-4">
          <div className="w-64 h-48 border rounded grid place-items-center overflow-hidden bg-slate-50 shrink-0">
            {layout.imageUrl
              ? <img src={layout.imageUrl} alt="Layout" className="max-w-full max-h-full object-contain" />
              : <span className="text-xs text-muted-foreground">No image uploaded</span>}
          </div>
          <div className="space-y-2">
            <Input type="file" accept="image/*" onChange={e => onFile(e.target.files?.[0] ?? null, "imageUrl")} />
            {layout.imageUrl && (
              <Button size="sm" variant="ghost" onClick={() => update({ systemLayout: { ...layout, imageUrl: undefined } })}>
                <Trash2 className="h-3 w-3 mr-1" />Remove image
              </Button>
            )}
          </div>
        </div>
      </Section>

      <Section title="Design PDF">
        <div className="space-y-2 max-w-xl">
          <Input type="file" accept="application/pdf" onChange={e => onFile(e.target.files?.[0] ?? null, "designPdfUrl")} />
          {layout.designPdfUrl && (
            <div className="text-xs text-blue-700">
              <a href={layout.designPdfUrl} target="_blank" rel="noreferrer" className="underline">Open uploaded design PDF</a>
              {" · "}
              <button className="underline" onClick={() => update({ systemLayout: { ...layout, designPdfUrl: undefined } })}>Remove</button>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}


export function Step4InstrumentsEquipment({ project, update }: { project: Project; update: Update }) {
  const { instruments, equipment } = project.data;
  return (
    <div className="space-y-6">
      <Section title="Instruments">
        <SpecTable
          rows={instruments as unknown as AnyRow[]}
          onChange={rows => update({ instruments: rows as unknown as typeof instruments })}
          firstCol={{ key: "instrument", label: "Instrument" }}
          extraCols={[{ key: "make", label: "Make" }, { key: "model", label: "Model" }]}
          library={instrumentsData as unknown as AnyRow[]}
        />
      </Section>
      <Section title="Equipment">
        <SpecTable
          rows={equipment as unknown as AnyRow[]}
          onChange={rows => update({ equipment: rows as unknown as typeof equipment })}
          firstCol={{ key: "equipment", label: "Equipment" }}
          includedCol
          library={equipmentData as unknown as AnyRow[]}
        />
      </Section>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any> & { id: string };
function SpecTable({ rows, onChange, firstCol, extraCols = [], includedCol = false, library }: {
  rows: AnyRow[]; onChange: (rows: AnyRow[]) => void;
  firstCol: { key: string; label: string };
  extraCols?: { key: string; label: string }[];
  includedCol?: boolean;
  library: AnyRow[];
}) {
  const update = (i: number, patch: Partial<AnyRow>) => onChange(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const addBlank = () => {
    const blank: AnyRow = { id: crypto.randomUUID(), qty: 1, price: "", spec1: "", spec2: "", spec3: "", spec4: "", spec5: "" };
    blank[firstCol.key] = ""; extraCols.forEach(c => (blank[c.key] = ""));
    if (includedCol) blank.included = true;
    onChange([...rows, blank]);
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
              <td className="border p-0.5"><Input className="h-7 text-xs" value={String(r[firstCol.key] ?? "")} onChange={e => update(i, { [firstCol.key]: e.target.value })} /></td>
              {includedCol && <td className="border p-0.5 text-center">
                <Checkbox checked={!!r.included} onCheckedChange={v => update(i, { included: !!v })} />
              </td>}
              {extraCols.map(c => (
                <td key={c.key} className="border p-0.5"><Input className="h-7 text-xs" value={String(r[c.key] ?? "")} onChange={e => update(i, { [c.key]: e.target.value })} /></td>
              ))}
              {[1,2,3,4,5].map(n => {
                const key = `spec${n}`;
                return <td key={n} className="border p-0.5"><Input className="h-7 text-xs" value={String(r[key] ?? "")} onChange={e => update(i, { [key]: e.target.value })} /></td>;
              })}
              <td className="border p-0.5"><Input type="number" className="h-7 text-xs" value={r.qty} onChange={e => update(i, { qty: Number(e.target.value) })} /></td>
              <td className="border p-0.5"><Input className="h-7 text-xs" value={r.price} onChange={e => update(i, { price: e.target.value })} /></td>
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
