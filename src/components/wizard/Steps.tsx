import type React from "react";
import { useState } from "react";
import type {
  Project, ProposalData, CustomizationItem, ProprietaryCustomItem,
  PriceEntry, PricingData,
} from "@/store/proposalStore";
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
import { getOnSiteServiceRows } from "@/data/scopeOfServiceRows";
import { lineTotal } from "@/data/pricingHelpers";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
              <SelectContent>{["Mr.", "Ms.", "Mrs.", "Dr."].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
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
              <SelectContent>{Array.from({ length: 11 }).map((_, i) => <SelectItem key={i} value={`R${i}`}>R{i}</SelectItem>)}</SelectContent>
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
            <Select value={transformer.ratingUnit} onValueChange={v => t({ ratingUnit: v as "MVA" | "KVA" })}>
              <SelectTrigger className="neo-inset !shadow-none border-0 h-[42px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="MVA">MVA</SelectItem><SelectItem value="KVA">KVA</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field className="col-span-3" label="Voltage"><NeoInput value={transformer.voltage} onChange={e => t({ voltage: e.target.value })} /></Field>
          <Field className="col-span-2" label="Voltage Unit">
            <Select value={transformer.voltageUnit} onValueChange={v => t({ voltageUnit: v })}>
              <SelectTrigger className="neo-inset !shadow-none border-0 h-[42px]"><SelectValue /></SelectTrigger>
              <SelectContent>{["kV", "V"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
      </NeoSection>

      <NeoSection title="System Type">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {systemTypesData.map(st => {
            const active = systemType === st.id;
            return (
              <button key={st.id} type="button"
                onClick={() => { setSystemType(project.id, st.id as SystemType); toast.success(`Switched to ${st.label}`); }}
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
  const { selectedSubsystems, systemType } = project.data;
  const subsystemVariants = project.data.subsystemVariants ?? {};
  const proposalCustomizations = project.data.proposalCustomizations ?? [];
  const items = getMajorSubsystems(systemType);
  const toggle = (id: string) =>
    update({ selectedSubsystems: selectedSubsystems.includes(id) ? selectedSubsystems.filter(x => x !== id) : [...selectedSubsystems, id] });

  const setVariant = (subsystemId: string, key: string) =>
    update({ subsystemVariants: { ...subsystemVariants, [subsystemId]: key } });

  const resolveTitle = (s: (typeof items)[number]) => {
    if (!s.variants) return s.title;
    const activeKey = subsystemVariants[s.id] ?? s.variants.default;
    const active = s.variants.options.find(o => o.key === activeKey);
    return active?.title ?? s.title;
  };

  const addCustItem = () =>
    update({ proposalCustomizations: [...proposalCustomizations, { id: crypto.randomUUID(), title: "", description: "" }] });
  const updCustItem = (iid: string, patch: Partial<CustomizationItem>) =>
    update({ proposalCustomizations: proposalCustomizations.map(it => it.id === iid ? { ...it, ...patch } : it) });
  const removeCustItem = (iid: string) =>
    update({ proposalCustomizations: proposalCustomizations.filter(it => it.id !== iid) });
  const moveCustItem = (idx: number, dir: -1 | 1) => {
    const arr = [...proposalCustomizations];
    const ni = idx + dir;
    if (ni < 0 || ni >= arr.length) return;
    [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
    update({ proposalCustomizations: arr });
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
          const activeVariantKey = subsystemVariants[s.id] ?? s.variants?.default;
          return (
            <div key={s.id} className={`rounded border-2 transition ${sel ? "border-blue-600 bg-blue-50/50" : "border-slate-200 bg-white"}`}>
              <button type="button" onClick={() => toggle(s.id)} className="w-full text-left p-3 flex items-start gap-3">
                <Checkbox checked={sel} onCheckedChange={() => toggle(s.id)} className="mt-1" />
                <div>
                  <div className="font-semibold text-sm">{resolveTitle(s)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.preview}</div>
                </div>
              </button>
              {sel && s.variants && (
                <div
                  className="px-3 pb-3 pt-2 border-t border-blue-100 flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Label className="text-xs text-slate-600 shrink-0">Type:</Label>
                  <Select value={activeVariantKey} onValueChange={(v) => setVariant(s.id, v)}>
                    <SelectTrigger className="h-8 text-xs w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {s.variants.options.map(o => (
                        <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded border-2 border-slate-200 bg-white p-3">
        <div className="font-semibold text-sm mb-1">Proposed Customizations</div>
        <p className="text-xs text-muted-foreground mb-3">
          These appear as their own block at the end of the Major Subsystems section in the PDF.
        </p>
        <div className="space-y-3">
          {proposalCustomizations.map((it, idx) => (
            <div key={it.id} className="rounded border bg-white p-2 space-y-2">
              <div className="flex gap-2">
                <Input placeholder="Customization title (e.g. Additional safety measures…)"
                  value={it.title} onChange={e => updCustItem(it.id, { title: e.target.value })} />
                <Button size="icon" variant="ghost" onClick={() => moveCustItem(idx, -1)} disabled={idx === 0}>↑</Button>
                <Button size="icon" variant="ghost" onClick={() => moveCustItem(idx, 1)} disabled={idx === proposalCustomizations.length - 1}>↓</Button>
                <Button size="icon" variant="ghost" onClick={() => removeCustItem(it.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
              <Textarea rows={4} placeholder={"a. Description line one\nb. Description line two"}
                value={it.description} onChange={e => updCustItem(it.id, { description: e.target.value })} />
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addCustItem}>
            <Plus className="h-3 w-3 mr-1" />Add customization
          </Button>
        </div>
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
  rows: AnyRow[];
  onChange: (rows: AnyRow[]) => void;
  firstCol: { key: string; label: string };
  extraCols?: { key: string; label: string }[];
  includedCol?: boolean;
  library: AnyRow[];
}) {
  const update = (i: number, patch: Partial<AnyRow>) => onChange(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const addBlank = () => {
    const blank: AnyRow = { id: crypto.randomUUID(), spec1: "", spec2: "", spec3: "", spec4: "", spec5: "" };
    blank[firstCol.key] = "";
    extraCols.forEach(c => (blank[c.key] = ""));
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
            {[1, 2, 3, 4, 5].map(n => <th key={n} className="border p-1.5 text-left">Spec-{n}</th>)}
            <th className="border p-1.5 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td className="border p-0.5"><Input className="h-7 text-xs" value={String(r[firstCol.key] ?? "")} onChange={e => update(i, { [firstCol.key]: e.target.value })} /></td>
              {includedCol && (
                <td className="border p-0.5 text-center">
                  <Checkbox checked={!!r.included} onCheckedChange={v => update(i, { included: !!v })} />
                </td>
              )}
              {extraCols.map(c => (
                <td key={c.key} className="border p-0.5">
                  <Input className="h-7 text-xs" value={String(r[c.key] ?? "")} onChange={e => update(i, { [c.key]: e.target.value })} />
                </td>
              ))}
              {[1, 2, 3, 4, 5].map(n => {
                const key = `spec${n}`;
                return <td key={n} className="border p-0.5"><Input className="h-7 text-xs" value={String(r[key] ?? "")} onChange={e => update(i, { [key]: e.target.value })} /></td>;
              })}
              <td className="border p-0.5 text-center">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(i)}><Trash2 className="h-3 w-3" /></Button>
              </td>
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
  const { proprietary, systemType, installationType } = project.data;
  const proprietaryCustom: ProprietaryCustomItem[] = project.data.proprietaryCustom ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const installationPricing = (project.data as any).installationPricing ?? {
    pricingType: "calculate" as "calculate" | "inclusive",
    days: "",
    perDayCost: "",
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingType, setPendingType] = useState<"full" | "supervision" | null>(null);
  const [step, setStep] = useState<"choose" | "pricing">("choose");

  const [warrantyDialogOpen, setWarrantyDialogOpen] = useState(false);
  const [warrantyMonths, setWarrantyMonths] = useState(
    project.data.additionalWarrantyMonths ? String(project.data.additionalWarrantyMonths) : ""
  );

  const visibleItems = proprietaryItemsData.filter(
    p => p.systemTypes.length === 0 || p.systemTypes.includes(systemType)
  );

  const toggleLibrary = (id: string) =>
    update({ proprietary: proprietary.includes(id) ? proprietary.filter(x => x !== id) : [...proprietary, id] });

  const addCustom = () =>
    update({ proprietaryCustom: [...proprietaryCustom, { id: crypto.randomUUID(), title: "" }] });

  const updateCustom = (id: string, title: string) =>
    update({ proprietaryCustom: proprietaryCustom.map(x => x.id === id ? { ...x, title } : x) });

  const removeCustom = (id: string) =>
    update({ proprietaryCustom: proprietaryCustom.filter(x => x.id !== id) });

  const openDialog = () => {
    setPendingType(installationType ?? "full");
    setStep(installationType ? "pricing" : "choose");
    setDialogOpen(true);
  };

  const removeInstallation = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update({ installationType: null } as any);
  };

  const handleChooseNext = () => {
    if (pendingType) setStep("pricing");
  };

  const handleConfirm = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update({ installationType: pendingType, installationPricing } as any);
    setDialogOpen(false);
  };

  const updatePricing = (patch: object) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update({ installationPricing: { ...installationPricing, ...patch } } as any);

  const totalCost =
    installationPricing.pricingType === "calculate" &&
      installationPricing.days &&
      installationPricing.perDayCost
      ? Number(installationPricing.days) * Number(installationPricing.perDayCost)
      : null;

  const installationChecked = installationType !== null;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Showing items for <strong>{systemType}</strong> system type. Items marked for all types always appear.
      </p>

      {/* Library items filtered by system type */}
      <div className="space-y-2">
        {visibleItems.map(p => {
          if (p.id === "additional-warranty") {
            const checked = proprietary.includes(p.id);
            return (
              <div key={p.id}>
                <label className="flex items-center gap-3 p-3 border rounded hover:bg-slate-50 cursor-pointer">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => {
                      if (checked) {
                        // unchecking — remove and clear stored months
                        update({
                          proprietary: proprietary.filter(x => x !== p.id),
                          additionalWarrantyMonths: null,
                        });
                      } else {
                        setWarrantyMonths(project.data.additionalWarrantyMonths ? String(project.data.additionalWarrantyMonths) : "");
                        setWarrantyDialogOpen(true);
                      }
                    }}
                  />
                  <span className="text-sm">{p.title}</span>
                  {checked && project.data.additionalWarrantyMonths ? (
                    <span className="text-xs text-blue-600 ml-1">
                      ({project.data.additionalWarrantyMonths} month{project.data.additionalWarrantyMonths === 1 ? "" : "s"})
                      {" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={(e) => { e.preventDefault(); setWarrantyMonths(String(project.data.additionalWarrantyMonths)); setWarrantyDialogOpen(true); }}
                      >
                        Edit
                      </button>
                    </span>
                  ) : null}
                </label>
              </div>
            );
          }
          return (
            <label key={p.id} className="flex items-center gap-3 p-3 border rounded hover:bg-slate-50 cursor-pointer">
              <Checkbox checked={proprietary.includes(p.id)} onCheckedChange={() => toggleLibrary(p.id)} />
              <span className="text-sm">{p.title}</span>
            </label>
          );
        })}
      </div>

      {/* Installation card */}
      <div className={`border-2 rounded-lg transition ${installationChecked ? "border-blue-500 bg-blue-50/40" : "border-slate-200 bg-white"}`}>
        {!installationChecked ? (
          /* Not yet selected — show as a simple clickable checkbox row */
          <div
            className="flex items-center gap-3 p-3 cursor-pointer"
            onClick={openDialog}
          >
            <Checkbox checked={false} onCheckedChange={() => openDialog()} />
            <span className="text-sm font-medium text-slate-800">Installation</span>
            <span className="text-xs text-slate-400 ml-1">(click to configure)</span>
          </div>
        ) : (
          /* Already selected — show summary card */
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox checked={true} onCheckedChange={removeInstallation} />
                <span className="text-sm font-semibold text-blue-800">
                  {installationType === "full" ? "Full Installation" : "Supervision of Installation"}
                </span>
                <button
                  type="button"
                  onClick={openDialog}
                  className="text-xs text-blue-600 underline ml-1 hover:text-blue-800"
                >
                  Edit
                </button>
              </div>
              <button type="button" onClick={removeInstallation} title="Remove installation">
                <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500 transition" />
              </button>
            </div>

            {/* Pricing summary pill */}
            {installationPricing.pricingType === "inclusive" ? (
              <div className="text-xs text-slate-600 bg-slate-100 rounded px-3 py-1.5">
                Pricing: <span className="font-semibold">Will be inclusive</span>
              </div>
           ) : installationPricing.lumpSum && installationType === "full" ? (
  <div className="text-xs text-slate-600 bg-slate-100 rounded px-3 py-1.5">
    Installation cost:{" "}
    <span className="font-semibold text-blue-800">
      ₹{Number(installationPricing.lumpSum).toLocaleString("en-IN")}
    </span>
  </div>
) : installationPricing.days && installationPricing.perDayCost ? (
  <div className="text-xs text-slate-600 bg-slate-100 rounded px-3 py-1.5">
    {installationPricing.days} days × ₹{Number(installationPricing.perDayCost).toLocaleString("en-IN")}{" "}
    = <span className="font-semibold text-blue-800">
      ₹{(Number(installationPricing.days) * Number(installationPricing.perDayCost)).toLocaleString("en-IN")}
    </span>
  </div>
) : (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
                ⚠ Pricing not configured — click <strong>Edit</strong> to add details.
              </div>
            )}

            {/* Red warning for full installation */}
            {installationType === "full" && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded px-3 py-2 text-xs text-red-700">
                <span className="text-base leading-none mt-0.5 shrink-0">⚠</span>
                <span>
                  <strong>Full Installation selected.</strong> All installation options are included in this proposal.
                  Ensure pricing and scope are confirmed before sharing with the customer.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom items */}
      <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 space-y-2">
        <div className="text-xs font-medium text-slate-600 mb-1">Custom Items</div>
        {proprietaryCustom.map(item => (
          <div key={item.id} className="flex items-center gap-2">
            <Input
              value={item.title}
              onChange={e => updateCustom(item.id, e.target.value)}
              placeholder="Enter item name…"
              className="h-8 text-sm"
            />
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removeCustom(item.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={addCustom}>
          <Plus className="h-3 w-3 mr-1" />Add item
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {proprietary.length + proprietaryCustom.length} item{(proprietary.length + proprietaryCustom.length) === 1 ? "" : "s"} selected
        {installationChecked ? ` · ${installationType === "full" ? "Full" : "Supervision"} Installation` : ""}.
      </p>

      {/* ── Installation Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">

          {/* Step 1: Choose type */}
          {step === "choose" && (
            <>
              <DialogHeader>
                <DialogTitle>Select Installation Type</DialogTitle>
                <DialogDescription>
                  Choose the type of installation to include in this proposal.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition
                  ${pendingType === "full" ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300"}`}>
                  <input
                    type="radio"
                    name="install-type-dialog"
                    value="full"
                    checked={pendingType === "full"}
                    onChange={() => setPendingType("full")}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <div className="font-semibold text-sm text-slate-800">Full Installation</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Complete on-site installation by Electrosoft's engineers — mechanical mounting,
                      electrical wiring, earthing and final alignment.
                    </div>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition
                  ${pendingType === "supervision" ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300"}`}>
                  <input
                    type="radio"
                    name="install-type-dialog"
                    value="supervision"
                    checked={pendingType === "supervision"}
                    onChange={() => setPendingType("supervision")}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <div className="font-semibold text-sm text-slate-800">Supervision of Installation</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Electrosoft engineers supervise the customer's team, providing technical guidance,
                      inspection and sign-off at each stage.
                    </div>
                  </div>
                </label>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleChooseNext} disabled={!pendingType}>Next →</Button>
              </DialogFooter>
            </>
          )}

          {/* Step 2: Pricing */}
          {step === "pricing" && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {pendingType === "full" ? "Full Installation" : "Supervision of Installation"} — Pricing
                </DialogTitle>
                <DialogDescription>
                  How should the installation cost appear in this proposal?
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                {/* Option A: Give Pricing */}
                <div
                  className={`border-2 rounded-lg transition cursor-pointer
                    ${installationPricing.pricingType === "calculate"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-blue-300"}`}
                  onClick={() => updatePricing({ pricingType: "calculate" })}
                >
                  <div className="flex items-start gap-3 p-4">
                    <input
                      type="radio"
                      name="pricing-type-dialog"
                      value="calculate"
                      checked={installationPricing.pricingType === "calculate"}
                      onChange={() => updatePricing({ pricingType: "calculate" })}
                      onClick={e => e.stopPropagation()}
                      className="mt-0.5 accent-blue-600 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-800 mb-3">Give Pricing</div>

                      {installationPricing.pricingType === "calculate" && (
  <div className="space-y-3" onClick={e => e.stopPropagation()}>
    {pendingType === "full" ? (
      /* Full installation — single lump-sum price box */
      <div>
        <Label className="text-xs text-slate-600">Installation Cost (₹)</Label>
        <Input
          type="number"
          min="0"
          className="mt-1 h-8 text-sm"
          placeholder="e.g. 50000"
          value={installationPricing.lumpSum ?? ""}
          onChange={e => updatePricing({ lumpSum: e.target.value })}
        />
        {installationPricing.lumpSum && (
          <div className="mt-2 bg-white border border-blue-200 rounded px-3 py-2.5">
            <div className="text-xs text-slate-500 mb-0.5">Total Installation Cost</div>
            <div className="text-lg font-bold text-blue-800">
              ₹{Number(installationPricing.lumpSum).toLocaleString("en-IN")}
            </div>
          </div>
        )}
      </div>
    ) : (
      /* Supervision — man-days basis */
      <>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-600">Number of Days</Label>
            <Input
              type="number"
              min="0"
              className="mt-1 h-8 text-sm"
              placeholder="e.g. 5"
              value={installationPricing.days}
              onChange={e => updatePricing({ days: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs text-slate-600">Per Day Cost (₹)</Label>
            <Input
              type="number"
              min="0"
              className="mt-1 h-8 text-sm"
              placeholder="e.g. 10000"
              value={installationPricing.perDayCost}
              onChange={e => updatePricing({ perDayCost: e.target.value })}
            />
          </div>
        </div>

        {totalCost !== null && (
          <div className="bg-white border border-blue-200 rounded px-3 py-2.5">
            <div className="text-xs text-slate-500 mb-0.5">Total Installation Cost</div>
            <div className="text-lg font-bold text-blue-800">
              ₹{totalCost.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {installationPricing.days} days × ₹{Number(installationPricing.perDayCost).toLocaleString("en-IN")} per day
            </div>
          </div>
        )}
      </>
    )}
  </div>
)}
                    </div>
                  </div>
                </div>

                {/* Option B: Will be Inclusive */}
                <label
                  className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition
                    ${installationPricing.pricingType === "inclusive"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-blue-300"}`}
                >
                  <input
                    type="radio"
                    name="pricing-type-dialog"
                    value="inclusive"
                    checked={installationPricing.pricingType === "inclusive"}
                    onChange={() => updatePricing({ pricingType: "inclusive" })}
                    className="mt-0.5 accent-blue-600 shrink-0"
                  />
                  <div>
                    <div className="font-semibold text-sm text-slate-800">Will be Inclusive</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Installation cost is bundled into the overall proposal price — no separate line item will appear.
                    </div>
                  </div>
                </label>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setStep("choose")}>← Back</Button>
                <Button onClick={handleConfirm}>Confirm</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Additional Warranty Dialog ── */}
      <Dialog open={warrantyDialogOpen} onOpenChange={setWarrantyDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Additional Warranty</DialogTitle>
            <DialogDescription>
              Standard warranty is 12 months. How many additional months would you like to offer?
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs text-slate-600">Additional Months</Label>
            <Input
              type="number"
              min="1"
              className="mt-1 h-9"
              placeholder="e.g. 6"
              value={warrantyMonths}
              onChange={e => setWarrantyMonths(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarrantyDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!warrantyMonths || Number(warrantyMonths) <= 0}
              onClick={() => {
                update({
                  proprietary: proprietary.includes("additional-warranty") ? proprietary : [...proprietary, "additional-warranty"],
                  additionalWarrantyMonths: Number(warrantyMonths),
                });
                setWarrantyDialogOpen(false);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function Step6Delivery({ project, update }: { project: Project; update: Update }) {
  const { delivery } = project.data;
  const updateRow = (i: number, patch: Partial<typeof delivery[number]>) =>
    update({ delivery: delivery.map((r, idx) => idx === i ? { ...r, ...patch } : r) });
  const remove = (i: number) => update({ delivery: delivery.filter((_, idx) => idx !== i) });
  const add = () => update({ delivery: [...delivery, { id: crypto.randomUUID(), deliverable: "New Deliverable", duration: "Will Be Decided Later" }] });
  return (
    <div className="space-y-3">
      <table className="w-full text-sm border">
        <thead className="bg-slate-100">
          <tr>
            <th className="border p-2 text-left">Deliverable</th>
            <th className="border p-2 text-left w-56">Duration</th>
            <th className="border p-2 text-left">If Custom</th>
            <th className="border p-2 w-12"></th>
          </tr>
        </thead>
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
              <td className="border p-1">
                {r.duration === "Custom" && (
                  <Input value={r.custom ?? ""} onChange={e => updateRow(i, { custom: e.target.value })} placeholder="e.g. 25 days from PO" />
                )}
              </td>
              <td className="border p-1 text-center">
                <Button size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-3 w-3" /></Button>
              </td>
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
  const toggleEx = (id: string) =>
    update({ exclusions: exclusions.includes(id) ? exclusions.filter(x => x !== id) : [...exclusions, id] });
  const updMake = (id: string, patch: Partial<typeof makes[number]>) =>
    update({ makes: makes.map(m => m.id === id ? { ...m, ...patch } : m) });
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
          <thead className="bg-slate-100">
            <tr>
              <th className="border p-2 w-16">Use</th>
              <th className="border p-2 text-left">Item</th>
              <th className="border p-2 text-left w-64">Manufacturer</th>
            </tr>
          </thead>
          <tbody>
            {makesOfSupplyData.map(row => {
              const sel = makes.find(m => m.id === row.id);
              if (!sel) return null;
              return (
                <tr key={row.id}>
                  <td className="border p-1 text-center">
                    <Checkbox checked={sel.enabled} onCheckedChange={v => updMake(row.id, { enabled: !!v })} />
                  </td>
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

export function StepPricing({ project, update }: { project: Project; update: Update }) {
  // FIX: merge per-key defaults instead of falling back only when `pricing` itself is missing.
  // Previously: `project.data.pricing ?? { ...defaults }` left `scopeOfServices` (and any other
  // newly-added key) as `undefined` whenever an older saved project had a `pricing` object that
  // predated that field — causing `pricing.scopeOfServices[r.key]` to throw
  // "Cannot read properties of undefined (reading '...')" in the Scope of Services table below.
  const pricing: PricingData = {
    scopeOfSupply: {},
    instruments: {},
    equipment: {},
    scopeOfServices: {},
    ...project.data.pricing,
  };

  const setEntry = (section: "scopeOfSupply" | "instruments" | "equipment", key: string, patch: Partial<PriceEntry>) => {
    const current = pricing[section][key] ?? { unitPrice: "", qty: "1" };
    update({
      pricing: {
        ...pricing,
        [section]: { ...pricing[section], [key]: { ...current, ...patch } },
      },
    });
  };

  const setServicePrice = (key: string, price: string) => {
    update({
      pricing: {
        ...pricing,
        scopeOfServices: { ...pricing.scopeOfServices, [key]: price },
      },
    });
  };

  // ── Scope of Supply rows: subsystems + the 2 in-scope proprietary items only ──
  const allSubs = getMajorSubsystems(project.data.systemType);
  const selectedSubIds = new Set(project.data.selectedSubsystems);
  const subsystemRows = allSubs.filter(s => selectedSubIds.has(s.id) || selectedSubIds.has(s.title));

  const selectedProprietaryIds = new Set(project.data.proprietary);
  const scopeProprietaryRows = proprietaryItemsData.filter(
    p => p.inScopeOfSupply && selectedProprietaryIds.has(p.id)
  );

  // ── Scope of Services (on-site) rows — everything else, incl. Installation & Additional Warranty
  const serviceRows = getOnSiteServiceRows(project);

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Enter the unit price for each Scope of Supply / Instrument / Equipment line — quantity defaults to 1
        and the total is calculated automatically. Scope of Services items below take a single direct price.
      </p>

      <PricingSection title="Scope of Supply">
        <PricingTable
          rows={[
            ...subsystemRows.map(s => ({ key: s.id, label: s.title })),
            ...scopeProprietaryRows.map(p => ({ key: p.id, label: p.title })),
          ]}
          entries={pricing.scopeOfSupply}
          onChangeEntry={(key, patch) => setEntry("scopeOfSupply", key, patch)}
        />
      </PricingSection>

      <PricingSection title="Testing Instruments">
        <PricingTable
          rows={project.data.instruments.map(i => ({ key: i.id, label: `${i.instrument}${i.make ? ` — ${i.make} ${i.model}` : ""}` }))}
          entries={pricing.instruments}
          onChangeEntry={(key, patch) => setEntry("instruments", key, patch)}
        />
      </PricingSection>

      <PricingSection title="Other Equipment">
        <PricingTable
          rows={project.data.equipment.filter(e => e.included).map(e => ({ key: e.id, label: e.equipment }))}
          entries={pricing.equipment}
          onChangeEntry={(key, patch) => setEntry("equipment", key, patch)}
        />
      </PricingSection>

      <PricingSection title="Scope of Services (On-site)">
        {serviceRows.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nothing selected yet — pick proprietary items, additional warranty, or installation in earlier steps.</p>
        ) : (
          <table className="w-full text-sm border">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2 text-left">Description</th>
                <th className="border p-2 w-40 text-right">Price (₹)</th>
              </tr>
            </thead>
            <tbody>
              {serviceRows.map(r => (
                <tr key={r.key}>
                  <td className="border p-2">{r.description}</td>
                  <td className="border p-1">
                    <Input
                      type="number"
                      min="0"
                      className="h-8 text-sm text-right"
                      value={pricing.scopeOfServices[r.key] ?? ""}
                      onChange={e => setServicePrice(r.key, e.target.value)}
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PricingSection>
    </div>
  );
}

function PricingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-blue-800 mb-3 border-b border-blue-100 pb-1">{title}</h3>
      {children}
    </div>
  );
}

function PricingTable({
  rows,
  entries,
  onChangeEntry,
}: {
  rows: { key: string; label: string }[];
  entries: Record<string, PriceEntry>;
  onChangeEntry: (key: string, patch: Partial<PriceEntry>) => void;
}) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Nothing selected yet for this section.</p>;
  }
  return (
    <table className="w-full text-sm border">
      <thead className="bg-slate-100">
        <tr>
          <th className="border p-2 text-left">Item</th>
          <th className="border p-2 w-32">Unit Price (₹)</th>
          <th className="border p-2 w-24">Qty</th>
          <th className="border p-2 w-32 text-right">Price (₹)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => {
          const entry = entries[r.key] ?? { unitPrice: "", qty: "1" };
          return (
            <tr key={r.key}>
              <td className="border p-2">{r.label}</td>
              <td className="border p-1">
                <Input
                  type="number"
                  min="0"
                  className="h-8 text-sm"
                  value={entry.unitPrice}
                  onChange={e => onChangeEntry(r.key, { unitPrice: e.target.value })}
                  placeholder="0"
                />
              </td>
              <td className="border p-1">
                <Input
                  type="number"
                  min="0"
                  className="h-8 text-sm"
                  value={entry.qty}
                  onChange={e => onChangeEntry(r.key, { qty: e.target.value })}
                />
              </td>
              <td className="border p-2 text-right font-semibold text-blue-800">{lineTotal(entry)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function Step8Payment({ project, update }: { project: Project; update: Update }) {
  const { payment } = project.data;
  const templates = useProposalStore(s => s.paymentTemplates);
  const saveTpl = useProposalStore(s => s.savePaymentTemplate);
  const total = payment.reduce((s, m) => s + Number(m.percent || 0), 0);
  const updRow = (i: number, patch: Partial<typeof payment[number]>) =>
    update({ payment: payment.map((m, idx) => idx === i ? { ...m, ...patch } : m) });
  const add = () => update({ payment: [...payment, { id: crypto.randomUUID(), label: "New milestone", percent: 0 }] });
  const remove = (i: number) => update({ payment: payment.filter((_, idx) => idx !== i) });
  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Label>Load template:</Label>
        <Select onValueChange={v => {
          const t = templates.find(x => x.id === v);
          if (t) update({ payment: t.milestones.map(m => ({ ...m })) });
        }}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Choose…" /></SelectTrigger>
          <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => {
          const n = prompt("Template name?");
          if (n) { saveTpl(n, payment); toast.success("Template saved"); }
        }}>
          <Save className="h-3 w-3 mr-1" />Save as template
        </Button>
      </div>
      <table className="w-full text-sm border">
        <thead className="bg-slate-100">
          <tr>
            <th className="border p-2 text-left">Milestone</th>
            <th className="border p-2 w-32">Percent</th>
            <th className="border p-2 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {payment.map((m, i) => (
            <tr key={m.id}>
              <td className="border p-1"><Input value={m.label} onChange={e => updRow(i, { label: e.target.value })} /></td>
              <td className="border p-1"><Input type="number" value={m.percent} onChange={e => updRow(i, { percent: Number(e.target.value) })} /></td>
              <td className="border p-1 text-center">
                <Button size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-3 w-3" /></Button>
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
      <Button size="sm" variant="outline" onClick={add}><Plus className="h-3 w-3 mr-1" />Add milestone</Button>
      {total !== 100 && <p className="text-sm text-destructive">⚠ Total must equal 100% (currently {total}%)</p>}
    </div>
  );
}

export function Step9Review({ project }: { project: Project; update: Update }) {
  const d = project.data;
  const proprietaryCustom = d.proprietaryCustom ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const installationPricing = (d as any).installationPricing;
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 text-sm space-y-1">
          <div><strong>Customer:</strong> {d.customer.title} {d.customer.contactPerson} — {d.customer.companyFullName || d.customer.companyShortName}</div>
          <div><strong>Email/Mobile:</strong> {d.customer.email} / {d.customer.mobile}</div>
          <div><strong>Offer:</strong> {d.meta.offerNumber} · {d.meta.revision} · {d.meta.date}</div>
          <div><strong>Transformer:</strong> {d.transformer.rating} {d.transformer.ratingUnit}, {d.transformer.voltage} {d.transformer.voltageUnit}</div>
          <div><strong>System Type:</strong> {d.systemType}</div>
          <div><strong>Tests selected:</strong> {d.selectedTests.length}</div>
          <div><strong>Subsystems selected:</strong> {d.selectedSubsystems.length}</div>
          <div><strong>Instruments:</strong> {d.instruments.length}</div>
          <div><strong>Equipment (included):</strong> {d.equipment.filter(e => e.included).length}</div>
          <div><strong>Proprietary items:</strong> {d.proprietary.length + proprietaryCustom.length}</div>
          <div><strong>Installation:</strong> {d.installationType
            ? (d.installationType === "full" ? "Full Installation" : "Supervision Installation")
            : "Not selected"}
            {d.installationType && installationPricing && (
              installationPricing.pricingType === "inclusive"
                ? " — Inclusive"
                : installationPricing.days && installationPricing.perDayCost
                  ? ` — ₹${(Number(installationPricing.days) * Number(installationPricing.perDayCost)).toLocaleString("en-IN")}`
                  : " — Pricing not set"
            )}
          </div>
          <div><strong>Additional Warranty:</strong> {d.additionalWarrantyMonths ? `${d.additionalWarrantyMonths} month(s)` : "Not selected"}</div>
          <div><strong>Delivery rows:</strong> {d.delivery.length}</div>
          <div><strong>Exclusions:</strong> {d.exclusions.length}</div>
          <div><strong>Makes enabled:</strong> {d.makes.filter(m => m.enabled).length}</div>
          <div><strong>Payment total:</strong> {d.payment.reduce((s, m) => s + Number(m.percent || 0), 0)}%</div>
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Button onClick={() => window.open(`/print/${project.id}`, "_blank")}>Open Print View (Puppeteer entry)</Button>
        <Button variant="outline" onClick={() => {
          const blob = new Blob([JSON.stringify({ project }, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${project.name}.json`;
          a.click();
        }}>Download proposal JSON</Button>
      </div>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

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