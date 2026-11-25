import { isQuotationPerson } from "@/data/employeesData";
import type React from "react";
import { useEffect, useState } from "react";
import type {
  Project, ProposalData, CustomizationItem, ProprietaryCustomItem,
  PriceEntry, PricingData,
} from "@/store/proposalStore";
import { useProposalStore, mergedPaymentTemplates } from "@/store/proposalStore";
import { systemTypesData, type SystemType } from "@/data/systemTypesData";
import {
  CUSTOMER_SCOPE_ID, COMPANION_SUBSYSTEMS, getMajorSubsystems, isCompanionSubsystem,
  hasRating, withRating,
  TEST_BENCH_ID, REDUNDANT_BENCH_ID, offersRedundantBench, CUSTOM_SUBSYSTEM_PREFIX, type SubsystemContent,
} from "@/data/proposalContent";
import { SubsystemForm, blankSubsystem, isBlankSubsystem } from "@/components/settings/SubsystemForm";
import { useLibrary, useDeliveryDurations } from "@/hooks/useLibrary";
import { autoSubject } from "@/data/proposalSubject";
import { CurrencyPanel } from "@/components/wizard/CurrencyPanel";
import { lineTotal } from "@/data/pricingHelpers";
import { installationDefaultPrice, namedEquipment, namedInstruments, quotationTotals, supplyRows } from "@/data/quotationPricing";
import { CompanyAutocomplete } from "@/components/wizard/CompanyAutocomplete";
import { CatalogPickerDialog } from "@/components/wizard/CatalogPickerDialog";
import type { CatalogKind } from "@/data/catalogFamilies";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Check, X } from "lucide-react";
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
import type { FreightLogisticsData } from "@/store/proposalStore";
import {
  freightChargesOptions,
  sourceOptions,
  modeOfTransportOptions,
  incotermsOptions,
  transitInsuranceOptions,
  freightLogisticsDefaults,
  resolveDestination,
} from "@/data/freightLogisticsData";


type Update = (patch: Partial<ProposalData>) => void;

export function Step1ProjectSetup({ project, update }: { project: Project; update: Update }) {
  const setSystemType = useProposalStore(s => s.setSystemType);
  // The type picked on a card, waiting for "Switch" in the confirmation.
  const [pendingType, setPendingType] = useState<SystemType | null>(null);
  const switchType = (next: SystemType) => {
    const before = project.data;
    setSystemType(project.id, next);
    const label = systemTypesData.find(t => t.id === next)?.label ?? next;
    toast.success(`Switched to ${label}`, {
      duration: 15000,
      action: { label: "Undo", onClick: () => update(before) },
    });
  };
  const allEmployees = useProposalStore(s => s.employees);
  const { customer, meta, transformer, systemType, freightLogistics } = project.data;
  // Quotation people only, plus whoever an older proposal already names.
  const employees = allEmployees.filter(
    e => isQuotationPerson(e) || e.id === meta.preparedBy || e.id === meta.checkedBy,
  );
  const c = (patch: Partial<typeof customer>) => update({ customer: { ...customer, ...patch } });
  const m = (patch: Partial<typeof meta>) => update({ meta: { ...meta, ...patch } });
  const t = (patch: Partial<typeof transformer>) => update({ transformer: { ...transformer, ...patch } });
  const f = (patch: Partial<FreightLogisticsData>) =>
    update({ freightLogistics: { ...(freightLogistics ?? {}), ...patch } as FreightLogisticsData });

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
          <Field className="col-span-12" label="Subject (first page)">
            <NeoInput
              value={meta.subject ?? ""}
              onChange={e => m({ subject: e.target.value })}
              placeholder={autoSubject(project.data)}
            />
          </Field>
          <div className="col-span-12 -mt-2 text-[11px] text-slate-500">
            Leave empty to use the line shown in grey, which is made from the transformer details.
          </div>
          <div className="col-span-12 -mt-1 text-[11px] text-slate-500">
            Need to add or change someone? <Link to="/settings/employees" className="text-blue-700 underline font-medium">Manage in Settings → Quotation people</Link>
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
                onClick={() => { if (!active) setPendingType(st.id as SystemType); }}
                className={`text-left p-4 rounded-2xl transition ${active ? "neo-inset ring-2 ring-blue-400/60" : "neo-pop"}`}>
                <Badge variant="outline" className="mb-2">{st.badge}</Badge>
                <div className="font-semibold text-slate-800">{st.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{st.tagline}</div>
                <p className="text-[11px] text-slate-600 mt-2">{st.description}</p>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">⚠ Changing system type resets tests, major subsystems and proprietary items to that type's defaults. Everything else is kept.</p>
      </NeoSection>

      <Dialog open={pendingType !== null} onOpenChange={open => { if (!open) setPendingType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Switch to {systemTypesData.find(t => t.id === pendingType)?.label ?? pendingType}?
            </DialogTitle>
            <DialogDescription>
              Tests, major subsystems and proprietary items go back to that system's defaults. Customer details,
              ticked instruments and equipment, prices, delivery, exclusions, makes and payment terms are kept.
              You can undo it right after.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingType(null)}>Cancel</Button>
            <Button onClick={() => { if (pendingType) switchType(pendingType); setPendingType(null); }}>Switch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const notes = project.data.testsNotes ?? "";
  const toggle = (id: string) => update({ selectedTests: selectedTests.includes(id) ? selectedTests.filter(x => x !== id) : [...selectedTests, id] });
  const testsData = useLibrary("tests");
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
      <Section title="Notes (optional)">
        <Textarea
          rows={3}
          value={notes}
          onChange={e => update({ testsNotes: e.target.value })}
          placeholder="Any special note about the tests to include in the PDF. Leave empty to omit."
        />
        <p className="text-xs text-muted-foreground mt-1">
          Shown in the preview and PDF only when this field has content.
        </p>
      </Section>
      <p className="text-xs text-muted-foreground">{selectedTests.length} test{selectedTests.length === 1 ? "" : "s"} selected.</p>
    </div>
  );
}

export function Step3Subsystems({ project, update }: { project: Project; update: Update }) {
  const { selectedSubsystems, systemType } = project.data;
  const subsystemVariants = project.data.subsystemVariants ?? {};
  const proposalCustomizations = project.data.proposalCustomizations ?? [];
  const customSubsystems = project.data.customSubsystems ?? [];
  const cmsOverrides = useProposalStore(s => s.cmsOverrides);
  const makesLibrary = useLibrary("makes");
  const allItems = getMajorSubsystems(systemType, cmsOverrides);
  // RIO Panel isn't ticked on its own, and the redundant bench is asked for in a dialog.
  const items = allItems.filter(s => !isCompanionSubsystem(s.id) && s.id !== REDUNDANT_BENCH_ID);
  const hasRedundantOption = offersRedundantBench(allItems);
  const benchSelected = selectedSubsystems.includes(TEST_BENCH_ID);
  const redundantIncluded = selectedSubsystems.includes(REDUNDANT_BENCH_ID);
  const redundantTitle = allItems.find(s => s.id === REDUNDANT_BENCH_ID)?.title ?? "Redundant / Conventional Test Bench";
  const rioTitle = allItems.find(s => s.id === COMPANION_SUBSYSTEMS[REDUNDANT_BENCH_ID])?.title ?? "RIO Panel";
  const [askRedundant, setAskRedundant] = useState(false);
  // A new quotation (redundantBench === null) asks straight away when the bench is ticked.
  useEffect(() => {
    if (hasRedundantOption && benchSelected && project.data.redundantBench === null) setAskRedundant(true);
  }, [hasRedundantOption, benchSelected, project.data.redundantBench]);

  const customerScope = project.data.customerScopeHardware ?? "";
  const ratings = project.data.subsystemRatings ?? {};
  const setRating = (id: string, value: string) => update({ subsystemRatings: { ...ratings, [id]: value } });

  /** Makes of Supply rows that follow a subsystem (HT / LT Capacitor Bank, Power Panel). */
  const makesFor = (nextSelected: string[]) => {
    const linked = makesLibrary.filter(r => r.subsystemIds?.length);
    if (!linked.length) return project.data.makes;
    let makes = project.data.makes;
    for (const row of linked) {
      const enabled = row.subsystemIds!.some(id => nextSelected.includes(id));
      const was = makes.find(m => m.id === row.id);
      const wasEnabled = !!was?.enabled;
      const relevant = row.subsystemIds!.some(id => nextSelected.includes(id) !== selectedSubsystems.includes(id));
      if (!relevant || wasEnabled === enabled) continue;
      makes = was
        ? makes.map(m => (m.id === row.id ? { ...m, enabled } : m))
        : [...makes, { id: row.id, enabled, make: row.defaultMake }];
    }
    return makes;
  };
  const setSelected = (next: string[], extra: Partial<ProposalData> = {}) =>
    update({ selectedSubsystems: next, makes: makesFor(next), ...extra });

  const toggle = (id: string) => {
    const on = !selectedSubsystems.includes(id);
    if (!on) {
      // No automatic bench: no redundant bench either.
      if (id === TEST_BENCH_ID && hasRedundantOption) {
        setSelected(selectedSubsystems.filter(x => x !== id && x !== REDUNDANT_BENCH_ID), { redundantBench: null });
        return;
      }
      setSelected(selectedSubsystems.filter(x => x !== id));
      return;
    }
    setSelected([...selectedSubsystems, id]);
    if (id === TEST_BENCH_ID && hasRedundantOption) setAskRedundant(true);
  };

  const chooseRedundant = (keep: boolean) => {
    const base = selectedSubsystems.filter(x => x !== REDUNDANT_BENCH_ID);
    setSelected(keep ? [...base, REDUNDANT_BENCH_ID] : base, { redundantBench: keep });
    setAskRedundant(false);
    toast.success(keep ? `${redundantTitle} and ${rioTitle} added (${rioTitle} is item 2 in the PDF).` : `${redundantTitle} left out.`);
  };

  const setVariant = (subsystemId: string, key: string) =>
    update({ subsystemVariants: { ...subsystemVariants, [subsystemId]: key } });

  const resolveTitle = (s: (typeof items)[number]) => {
    if (!s.variants) return s.title;
    const activeKey = subsystemVariants[s.id] ?? s.variants.default;
    const active = s.variants.options.find(o => o.key === activeKey);
    return active?.title ?? s.title;
  };

  // ── Subsystems added for this quotation only ──
  const [customDraft, setCustomDraft] = useState<SubsystemContent | null>(null);
  const [editingCustom, setEditingCustom] = useState<string | null>(null);
  const saveCustom = (s: SubsystemContent, isNew: boolean) => {
    if (isBlankSubsystem(s) || !s.title.trim()) {
      if (isNew) {
        setCustomDraft(null);
        toast.info("Nothing was entered, so no subsystem was added.");
      } else toast.error("Give the subsystem a title.");
      return;
    }
    if (isNew) {
      update({ customSubsystems: [...customSubsystems, s], selectedSubsystems: [...selectedSubsystems, s.id] });
      setCustomDraft(null);
      toast.success(`"${s.title}" added to this quotation.`);
    } else {
      update({ customSubsystems: customSubsystems.map(c => (c.id === s.id ? s : c)) });
      setEditingCustom(null);
      toast.success("Saved");
    }
  };
  const removeCustom = (s: SubsystemContent) => {
    const before = { customSubsystems, selectedSubsystems };
    update({
      customSubsystems: customSubsystems.filter(c => c.id !== s.id),
      selectedSubsystems: selectedSubsystems.filter(id => id !== s.id),
    });
    toast.success(`"${s.title}" removed`, { duration: 10000, action: { label: "Undo", onClick: () => update(before) } });
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
        {" "}and are inserted automatically into the PDF. Items marked <em>Pricing only</em> get a row in the pricing table but no
        description block.
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
                  <div className="font-semibold text-sm">
                    {hasRating(s.id) ? withRating(resolveTitle(s), ratings[s.id]) : resolveTitle(s)}
                    {s.pricingOnly && (
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">Pricing only</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.preview}</div>
                </div>
              </button>
              {sel && s.id === TEST_BENCH_ID && hasRedundantOption && (
                <div className="px-3 pb-3 pt-2 border-t border-blue-100 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-600">{redundantTitle} + {rioTitle}:</span>
                  {redundantIncluded ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><Check className="h-3.5 w-3.5" />Included ({rioTitle} is item 2 in the PDF)</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-500"><X className="h-3.5 w-3.5" />Not included</span>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAskRedundant(true)}>Change</Button>
                </div>
              )}
              {sel && hasRating(s.id) && (
                <div
                  className="px-3 pb-3 pt-2 border-t border-blue-100 flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Label className="text-xs text-slate-600 shrink-0">Rating:</Label>
                  <Input
                    value={ratings[s.id] ?? ""}
                    onChange={e => setRating(s.id, e.target.value)}
                    placeholder="e.g. 1500 kVAR, 440 V"
                    className="h-8 text-xs w-64"
                  />
                  <span className="text-xs text-muted-foreground">Printed in brackets after the title.</span>
                </div>
              )}
              {sel && s.id === CUSTOMER_SCOPE_ID && (
                <div className="px-3 pb-3 pt-2 border-t border-blue-100 space-y-1">
                  <Label className="text-xs text-slate-600">
                    Which customer instruments and equipment are integrated? (printed as this item's description)
                  </Label>
                  <Textarea
                    rows={4}
                    value={customerScope}
                    onChange={e => update({ customerScopeHardware: e.target.value })}
                    placeholder="e.g. Customer's impulse generator (make, rating), PD detector, power analyzer…"
                    className={customerScope.trim() ? "" : "border-red-400"}
                  />
                  {!customerScope.trim() && (
                    <p className="text-xs text-red-600">Please describe the customer's instruments and equipment.</p>
                  )}
                </div>
              )}
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
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <div className="font-semibold text-sm">Subsystems for this quotation only</div>
          <Button size="sm" variant="outline" disabled={!!customDraft} onClick={() => { setEditingCustom(null); setCustomDraft(blankSubsystem(`${CUSTOM_SUBSYSTEM_PREFIX}${crypto.randomUUID()}`)); }}>
            <Plus className="h-3 w-3 mr-1" />Add a subsystem
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          A Major Subsystem with its own title, description and images, used only in this quotation (it is not added to
          Settings). It is printed after the subsystems above and gets its own row in the pricing table.
        </p>
        <div className="space-y-2">
          {customDraft && (
            <div className="rounded border-2 border-blue-500 bg-blue-50/40 p-3">
              <div className="text-xs font-semibold text-blue-700 mb-2">New subsystem</div>
              <SubsystemForm
                initial={customDraft}
                autoFocus
                actions={(s, busy) => (
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setCustomDraft(null)}>Cancel</Button>
                    <Button size="sm" disabled={busy} onClick={() => saveCustom(s, true)}><Plus className="h-3 w-3 mr-1" />Add to this quotation</Button>
                  </div>
                )}
              />
            </div>
          )}
          {customSubsystems.map(c => {
            const sel = selectedSubsystems.includes(c.id);
            return (
              <div key={c.id} className={`rounded border-2 p-3 ${sel ? "border-blue-600 bg-blue-50/50" : "border-slate-200"}`}>
                {editingCustom === c.id ? (
                  <SubsystemForm
                    initial={c}
                    actions={(s, busy) => (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditingCustom(null)}>Cancel</Button>
                        <Button size="sm" disabled={busy} onClick={() => saveCustom(s, false)}>Save</Button>
                      </div>
                    )}
                  />
                ) : (
                  <div className="flex items-start gap-3">
                    <Checkbox checked={sel} onCheckedChange={() => toggle(c.id)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">
                        {c.title}
                        {c.pricingOnly && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">Pricing only</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{c.preview || c.description.slice(0, 140)}</div>
                      {!!c.images?.length && <div className="text-[11px] text-slate-500 mt-0.5">{c.images.length} image(s)</div>}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { setCustomDraft(null); setEditingCustom(c.id); }}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => removeCustom(c)} title="Remove"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                )}
              </div>
            );
          })}
          {!customDraft && customSubsystems.length === 0 && (
            <p className="text-xs italic text-slate-400">None added.</p>
          )}
        </div>
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

      <Dialog open={askRedundant} onOpenChange={open => {
        // Closing without answering counts as "No" for a new quotation, so it doesn't ask again and again.
        if (!open) { if (project.data.redundantBench === null) chooseRedundant(false); else setAskRedundant(false); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a {redundantTitle}?</DialogTitle>
            <DialogDescription>
              A standalone manual control desk that can run every test even when the automatic test bench is unavailable.
              It comes with the <strong>{rioTitle}</strong>, which is printed as item 2 of the Major Subsystems.
              Both are priced in the Scope of Supply.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => chooseRedundant(false)}>
              <X className="h-4 w-4 mr-1 text-red-600" />No, leave it out
            </Button>
            <Button onClick={() => chooseRedundant(true)}>
              <Check className="h-4 w-4 mr-1" />Yes, include it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function Step3bSystemLayout({ project, update }: { project: Project; update: Update }) {
  const layout = project.data.systemLayout ?? {};
  const displayedImage = layout.imageUrl;
  const nothingUploaded = !layout.imageUrl && !layout.designPdfUrl;
  const onFile = (file: File | null, key: "imageUrl" | "designPdfUrl") => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({
      systemLayout: {
        ...layout,
        [key]: String(reader.result),
        ...(key === "designPdfUrl" ? { designPdfName: file.name } : {}),
      },
    });
    reader.readAsDataURL(file);
  };
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        The <strong>Schematic of Offered System</strong> page text is fixed and not editable. Upload this project's
        layout image and/or design PDF here.
      </p>
      {nothingUploaded && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Nothing uploaded: the Schematic of Offered System page is left out of the PDF.
        </p>
      )}
      <Section title="Layout Image">
        <div className="flex items-start gap-4">
          <div className="w-64 h-48 border rounded grid place-items-center overflow-hidden bg-slate-50 shrink-0">
            {displayedImage
              ? <img src={displayedImage} alt="Layout" className="max-w-full max-h-full object-contain" />
              : <span className="text-xs text-muted-foreground">No image</span>}
          </div>
          <div className="space-y-2">
            <div className="text-xs text-slate-600">
              {displayedImage ? <>Image uploaded for this project.</> : <>No layout image uploaded.</>}
            </div>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded border cursor-pointer bg-white hover:bg-slate-50 text-sm">
              <Plus className="h-3 w-3" />
              {displayedImage ? "Change Image" : "Upload Image"}
              <input type="file" accept="image/*" className="hidden"
                onChange={e => onFile(e.target.files?.[0] ?? null, "imageUrl")} />
            </label>
            {displayedImage && (
              <Button size="sm" variant="ghost" onClick={() => update({ systemLayout: { ...layout, imageUrl: undefined } })}>
                <Trash2 className="h-3 w-3 mr-1" />Remove image
              </Button>
            )}
          </div>
        </div>
      </Section>
      <Section title="Design PDF">
  <div className="space-y-2 max-w-xl">
    <label className="inline-flex items-center gap-2 px-3 py-2 rounded border cursor-pointer bg-white hover:bg-slate-50 text-sm">
      <Plus className="h-3 w-3" />
      Upload Design PDF
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={e => onFile(e.target.files?.[0] ?? null, "designPdfUrl")}
      />
    </label>
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
  const instrumentsData = useLibrary("instruments");
  const equipmentData = useLibrary("equipment");
  // Shown: ticked rows and the main items suggested for the system type (unticked).
  // Older quotations also hold every unticked library row; those stay hidden and
  // are dropped on the first edit (they never reached the PDF or pricing).
  const visibleEquipment = equipment.filter(e => e.included || e.suggested);
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Tick (✓) the rows to include. Only ticked rows are printed and priced. The main items for this system type are
        listed unticked; add more with <strong>Add from list</strong> or <strong>Add custom</strong>.
      </p>
      <Section title="Instruments">
        <SpecTable
          kind="instruments"
          rows={instruments as unknown as AnyRow[]}
          onChange={rows => update({ instruments: rows as unknown as typeof instruments })}
          firstCol={{ key: "instrument", label: "Instrument" }}
          extraCols={[{ key: "make", label: "Make" }, { key: "model", label: "Model" }]}
          library={instrumentsData as unknown as AnyRow[]}
        />
      </Section>
      <Section title="Equipment">
        <SpecTable
          kind="equipment"
          rows={visibleEquipment as unknown as AnyRow[]}
          onChange={rows => update({ equipment: rows as unknown as typeof equipment })}
          firstCol={{ key: "equipment", label: "Equipment" }}
          library={equipmentData as unknown as AnyRow[]}
        />
      </Section>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any> & { id: string };

/** A row counts (PDF, pricing) when ticked. Instrument rows from before the tick column have no flag: ticked. */
const isTicked = (r: AnyRow) => r.included !== false;

function SpecTable({ kind, rows, onChange, firstCol, extraCols = [], library }: {
  kind: CatalogKind;
  rows: AnyRow[];
  onChange: (rows: AnyRow[]) => void;
  firstCol: { key: string; label: string };
  extraCols?: { key: string; label: string }[];
  library: AnyRow[];
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const update = (i: number, patch: Partial<AnyRow>) => onChange(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const remove = (i: number) => {
    const before = rows;
    onChange(rows.filter((_, idx) => idx !== i));
    toast.success("Row removed", { duration: 8000, action: { label: "Undo", onClick: () => onChange(before) } });
  };
  // Row order here is the order in the PDF and the pricing table.
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const addBlank = () => {
    const blank: AnyRow = { id: crypto.randomUUID(), included: true, spec1: "", spec2: "", spec3: "", spec4: "", spec5: "" };
    blank[firstCol.key] = "";
    extraCols.forEach(c => (blank[c.key] = ""));
    onChange([...rows, blank]);
  };
  // Each added row gets its own id (pricing is keyed by row id, and the same
  // variant may be added twice); sourceId remembers which library item it was.
  // A suggested (unticked) row of the same item is ticked instead of added again.
  const addFromLib = (items: AnyRow[]) => {
    if (!items.length) return;
    let next = [...rows];
    for (const item of items) {
      const suggested = next.findIndex(r => String(r.sourceId ?? r.id) === item.id && !isTicked(r));
      if (suggested >= 0) next[suggested] = { ...next[suggested], included: true };
      else next = [...next, { ...item, id: crypto.randomUUID(), sourceId: item.id, included: true, suggested: undefined }];
    }
    onChange(next);
  };
  const addedIds = new Set(rows.filter(isTicked).map(r => String(r.sourceId ?? r.id)));
  const tickedCount = rows.filter(isTicked).length;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border">
        <thead className="bg-slate-100">
          <tr>
            <th className="border p-1.5 w-8 text-center" title="Include">✓</th>
            <th className="border p-1.5 text-left">{firstCol.label}</th>
            {extraCols.map(c => <th key={c.key} className="border p-1.5 text-left">{c.label}</th>)}
            {[1, 2, 3, 4, 5].map(n => <th key={n} className="border p-1.5 text-left">Spec-{n}</th>)}
            <th className="border p-1.5 w-24"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const on = isTicked(r);
            return (
              <tr key={r.id} className={on ? "bg-blue-50/50" : "text-slate-500"}>
                <td className="border p-0.5 text-center">
                  <Checkbox checked={on} onCheckedChange={v => update(i, { included: !!v })} aria-label="Include" />
                </td>
                <td className="border p-0.5"><Input className="h-7 text-xs" value={String(r[firstCol.key] ?? "")} onChange={e => update(i, { [firstCol.key]: e.target.value })} /></td>
                {extraCols.map(c => (
                  <td key={c.key} className="border p-0.5">
                    <Input className="h-7 text-xs" value={String(r[c.key] ?? "")} onChange={e => update(i, { [c.key]: e.target.value })} />
                  </td>
                ))}
                {[1, 2, 3, 4, 5].map(n => {
                  const key = `spec${n}`;
                  return <td key={n} className="border p-0.5"><Input className="h-7 text-xs" value={String(r[key] ?? "")} onChange={e => update(i, { [key]: e.target.value })} /></td>;
                })}
                <td className="border p-0.5 text-center whitespace-nowrap">
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>↓</Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Remove" onClick={() => remove(i)}><Trash2 className="h-3 w-3" /></Button>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={2 + extraCols.length + 6} className="border p-3 text-center text-muted-foreground">
                Nothing added yet — use “Add from list”.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <Button size="sm" onClick={() => setPickerOpen(true)}><Plus className="h-3 w-3 mr-1" />Add from list</Button>
        <Button size="sm" variant="outline" onClick={addBlank}><Plus className="h-3 w-3 mr-1" />Add custom {firstCol.label.toLowerCase()}</Button>
        <span className="text-xs text-muted-foreground ml-auto">{tickedCount} ticked · printed and priced</span>
      </div>
      <CatalogPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        kind={kind}
        library={library}
        addedIds={addedIds}
        onAdd={addFromLib}
        onAddCustom={addBlank}
      />
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

  const proprietaryItemsData = useLibrary("proprietary");
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

// Paste this in place of the existing `Step6Delivery` function in
// src/components/wizard/Steps.tsx
//
// Also add this import near your other data imports at the top of Steps.tsx:
//
//   import type { FreightLogisticsData } from "@/store/proposalStore";
//   import {
//     freightChargesOptions,
//     sourceOptions,
//     modeOfTransportOptions,
//     incotermsOptions,
//     transitInsuranceOptions,
//     freightLogisticsDefaults,
//   } from "@/data/freightLogisticsData";

export function Step6Delivery({ project, update }: { project: Project; update: Update }) {
  const { delivery } = project.data;
  const updateRow = (i: number, patch: Partial<typeof delivery[number]>) =>
    update({ delivery: delivery.map((r, idx) => idx === i ? { ...r, ...patch } : r) });
  const remove = (i: number) => update({ delivery: delivery.filter((_, idx) => idx !== i) });
  const add = () => update({ delivery: [...delivery, { id: crypto.randomUUID(), deliverable: "New Deliverable", duration: "Will Be Decided Later" }] });
  const deliveryDefaults = useLibrary("delivery");
  const durations = useDeliveryDurations();

  // ── Freight & Logistics ──────────────────────────────────────────────
  const fl: FreightLogisticsData = project.data.freightLogistics ?? {
    ...freightLogisticsDefaults,
  };
  const setFl = (patch: Partial<FreightLogisticsData>) =>
    update({ freightLogistics: { ...fl, ...patch } });

  // Empty = the customer's address (Project Setup), filled in until something else is typed.
  const destinationValue = resolveDestination(fl, project.data.customer);

  return (
    <div className="space-y-8">
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
                    <SelectContent>{(durations.includes(r.duration) ? durations : [r.duration, ...durations]).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
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

      <Section title="Freight & Logistics">
        <p className="text-xs text-muted-foreground mb-3">
          These details are inserted into the <strong>Commercial Terms</strong> page of the PDF. Pick a preset from
          each dropdown, or choose <strong>Custom</strong> to type your own wording.
        </p>
        <div className="grid grid-cols-12 gap-4">
          <Field className="col-span-6" label="Freight Charges">
            <Select value={fl.freightCharges} onValueChange={v => setFl({ freightCharges: v })}>
              <SelectTrigger className="neo-inset !shadow-none border-0 h-[42px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {freightChargesOptions.map(o => <SelectItem key={o} value={o}>{o === "Custom" ? "Custom (enter amount in Pricing)" : o}</SelectItem>)}
              </SelectContent>
            </Select>
            {fl.freightCharges === "Custom" && (
              <p className="mt-1 text-[11px] text-blue-700">Enter the freight amount in the Pricing step.</p>
            )}
          </Field>

          <Field className="col-span-6" label="Destination">
            <NeoInput
              value={destinationValue}
              onChange={e => setFl({ destination: e.target.value })}
              placeholder="Customer address (fill it in on Project Setup)"
            />
          </Field>

          <Field className="col-span-6" label="Source (Dispatch Location)">
            <Select value={fl.source} onValueChange={v => setFl({ source: v })}>
              <SelectTrigger className="neo-inset !shadow-none border-0 h-[42px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sourceOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            {fl.source === "Custom" && (
              <NeoInput
                className="mt-2"
                value={fl.sourceCustom ?? ""}
                onChange={e => setFl({ sourceCustom: e.target.value })}
                placeholder="Enter dispatch location"
              />
            )}
          </Field>

          <Field className="col-span-6" label="Mode of Transport">
            <Select value={fl.modeOfTransport} onValueChange={v => setFl({ modeOfTransport: v })}>
              <SelectTrigger className="neo-inset !shadow-none border-0 h-[42px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {modeOfTransportOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            {fl.modeOfTransport === "Custom" && (
              <NeoInput
                className="mt-2"
                value={fl.modeOfTransportCustom ?? ""}
                onChange={e => setFl({ modeOfTransportCustom: e.target.value })}
                placeholder="Enter mode of transport"
              />
            )}
          </Field>

          <Field className="col-span-6" label="Incoterms">
            <Select value={fl.incoterms} onValueChange={v => setFl({ incoterms: v })}>
              <SelectTrigger className="neo-inset !shadow-none border-0 h-[42px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {incotermsOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            {fl.incoterms === "Custom" && (
              <NeoInput
                className="mt-2"
                value={fl.incotermsCustom ?? ""}
                onChange={e => setFl({ incotermsCustom: e.target.value })}
                placeholder="Enter incoterms"
              />
            )}
          </Field>

          <Field className="col-span-6" label="Transit Insurance">
            <Select value={fl.transitInsurance} onValueChange={v => setFl({ transitInsurance: v })}>
              <SelectTrigger className="neo-inset !shadow-none border-0 h-[42px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {transitInsuranceOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            {fl.transitInsurance === "Custom" && (
              <NeoInput
                className="mt-2"
                value={fl.transitInsuranceCustom ?? ""}
                onChange={e => setFl({ transitInsuranceCustom: e.target.value })}
                placeholder="Enter transit insurance clause"
              />
            )}
          </Field>

          <Field className="col-span-12" label="Liability Note">
            <textarea
              rows={2}
              className="neo-inset w-full px-3 py-2 text-sm outline-none resize-y"
              value={fl.liabilityNote}
              onChange={e => setFl({ liabilityNote: e.target.value })}
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}

/** Dropdown value for "Custom entry…" in Makes of Supply. */
const CUSTOM_MAKE = "__custom__";

export function Step7ExclusionsMakes({ project, update }: { project: Project; update: Update }) {
  const { exclusions, makes, installationType } = project.data;
  const customExclusions = project.data.exclusionsCustom ?? [];
  const setCustomExclusions = (list: string[]) => update({ exclusionsCustom: list });
  const exclusionsData = useLibrary("exclusions");
  const makesOfSupplyData = useLibrary("makes");
  const toggleEx = (id: string) =>
    update({ exclusions: exclusions.includes(id) ? exclusions.filter(x => x !== id) : [...exclusions, id] });
  // A make item added in Settings after this quotation was made has no entry
  // yet; it shows unticked and gets one on the first change.
  const updMake = (id: string, patch: Partial<typeof makes[number]>) => {
    if (makes.some(m => m.id === id)) {
      update({ makes: makes.map(m => m.id === id ? { ...m, ...patch } : m) });
      return;
    }
    const row = makesOfSupplyData.find(r => r.id === id);
    update({ makes: [...makes, { id, enabled: false, make: row?.defaultMake ?? "", ...patch }] });
  };
  // Rows added with "Add custom item" (not in the Settings list).
  const customMakes = makes.filter(m => m.item !== undefined && !makesOfSupplyData.some(r => r.id === m.id));
  const updCustomMake = (id: string, patch: Partial<typeof makes[number]>) =>
    update({ makes: makes.map(m => (m.id === id ? { ...m, ...patch } : m)) });
  return (
    <div className="space-y-6">
      {installationType === "full" && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded px-4 py-3 text-sm text-amber-800">
          <span className="text-lg leading-none mt-0.5 shrink-0">⚠</span>
          <span>
            <strong>Full Installation is selected</strong> for this proposal. Installation is considered on top of
            the standard scope — please confirm exclusions and pricing account for this before sharing with the customer.
          </span>
        </div>
      )}
      <Section title="Exclusions">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {exclusionsData.map(e => (
            <label key={e.id} className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer">
              <Checkbox checked={exclusions.includes(e.id)} onCheckedChange={() => toggleEx(e.id)} />
              <span className="text-sm">{e.title}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold text-slate-600">Your own exclusions (this quotation only)</div>
          {customExclusions.map((text, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={text}
                placeholder="Type the exclusion"
                onChange={ev => setCustomExclusions(customExclusions.map((t, j) => (j === i ? ev.target.value : t)))}
              />
              <Button size="icon" variant="ghost" title="Remove"
                onClick={() => setCustomExclusions(customExclusions.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setCustomExclusions([...customExclusions, ""])}>
            <Plus className="h-3 w-3 mr-1" />Add custom exclusion
          </Button>
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
              const sel = makes.find(m => m.id === row.id) ?? { id: row.id, enabled: false, make: row.defaultMake };

              const makeOptions = sel.make && !row.options.includes(sel.make) ? [sel.make, ...row.options] : row.options;
              // "Custom entry" picked: the typed text (sel.custom) is printed instead of the list value.
              const isCustom = sel.custom !== undefined;
              return (
                <tr key={row.id}>
                  <td className="border p-1 text-center">
                    <Checkbox checked={sel.enabled} onCheckedChange={v => updMake(row.id, { enabled: !!v })} />
                  </td>
                  <td className="border p-1">
                    {row.item}
                    {!!row.subsystemIds?.length && (
                      <div className="text-[10px] text-muted-foreground">Ticked automatically with the Major Subsystem</div>
                    )}
                  </td>
                  <td className="border p-1 space-y-1">
                    <Select
                      value={isCustom ? CUSTOM_MAKE : sel.make}
                      onValueChange={v => updMake(row.id, v === CUSTOM_MAKE ? { custom: sel.custom ?? "" } : { make: v, custom: undefined })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {makeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        <SelectItem value={CUSTOM_MAKE}>Custom entry…</SelectItem>
                      </SelectContent>
                    </Select>
                    {isCustom && (
                      <Input
                        autoFocus
                        value={sel.custom ?? ""}
                        placeholder="Type the manufacturer"
                        onChange={e => updMake(row.id, { custom: e.target.value })}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
            {customMakes.map(m => (
              <tr key={m.id}>
                <td className="border p-1 text-center">
                  <Checkbox checked={m.enabled} onCheckedChange={v => updCustomMake(m.id, { enabled: !!v })} />
                </td>
                <td className="border p-1">
                  <Input value={m.item ?? ""} placeholder="Item" onChange={e => updCustomMake(m.id, { item: e.target.value })} />
                </td>
                <td className="border p-1">
                  <div className="flex items-center gap-1">
                    <Input value={m.make} placeholder="Manufacturer" onChange={e => updCustomMake(m.id, { make: e.target.value })} />
                    <Button size="icon" variant="ghost" title="Remove"
                      onClick={() => update({ makes: makes.filter(x => x.id !== m.id) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button size="sm" variant="outline" className="mt-2"
          onClick={() => update({ makes: [...makes, { id: `custom-${crypto.randomUUID()}`, enabled: true, item: "", make: "" }] })}>
          <Plus className="h-3 w-3 mr-1" />Add custom item
        </Button>
      </Section>
    </div>
  );
}

export function StepPricing({ project, update }: { project: Project; update: Update }) {
  const pricing: PricingData = {
    scopeOfSupply: project.data.pricing?.scopeOfSupply ?? {},
    instruments: project.data.pricing?.instruments ?? {},
    equipment: project.data.pricing?.equipment ?? {},
    scopeOfServices: project.data.pricing?.scopeOfServices ?? {},
    freight: project.data.pricing?.freight ?? "",
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

  // Scope of Supply rows: the ticked Major Subsystems (title through the active
  // variant) + proprietary items flagged for Scope of Supply. Instruments and
  // Equipment are priced in their own sections below.
  const cmsOverrides = useProposalStore(s => s.cmsOverrides);
  const proprietaryItemsData = useLibrary("proprietary");
  const supply = supplyRows(project, cmsOverrides, proprietaryItemsData);
  const totals = quotationTotals(project, cmsOverrides, proprietaryItemsData);
  const serviceRows = totals.serviceRows;
  const installationDefault = installationDefaultPrice(project);

  const specsOf = (row: { spec1?: string; spec2?: string; spec3?: string; spec4?: string; spec5?: string }) =>
    [row.spec1, row.spec2, row.spec3, row.spec4, row.spec5].filter((v): v is string => !!v && v.trim().length > 0);

  // Only rows still in the quotation count (a price typed for an item later unticked doesn't).
  const totalInr = totals.supply + totals.instruments + totals.equipment + totals.services;
  const freightOption = (project.data.freightLogistics ?? freightLogisticsDefaults).freightCharges;

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Enter the unit price for each Scope of Supply / Instrument / Equipment line — quantity defaults to 1
        and the total is calculated automatically. Scope of Services items below take a single direct price.
      </p>

      <CurrencyPanel project={project} update={update} totalInr={totalInr} />
      <PricingSection title="Scope of Supply">
        <PricingTable
          rows={supply.map(r => ({ key: r.key, label: r.title }))}
          entries={pricing.scopeOfSupply}
          onChangeEntry={(key, patch) => setEntry("scopeOfSupply", key, patch)}
        />
      </PricingSection>

      <PricingSection title="Testing Instruments">
        <PricingTable
          rows={namedInstruments(project).map(i => ({
            key: i.id,
            label: `${i.instrument}${i.make ? ` — ${i.make} ${i.model}` : ""}`,
            specs: specsOf(i),
          }))}
          entries={pricing.instruments}
          onChangeEntry={(key, patch) => setEntry("instruments", key, patch)}
        />
      </PricingSection>

      <PricingSection title="Other Equipment">
        <PricingTable
          rows={namedEquipment(project).map(e => ({
            key: e.id,
            label: e.equipment,
            specs: specsOf(e),
          }))}
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
                      value={
                        pricing.scopeOfServices[r.key] ??
                        (r.key === "installation" && installationDefault != null ? String(installationDefault) : "")
                      }
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

      <PricingSection title="Freight Charges">
        {freightOption === "Custom" ? (
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min="0"
              className="h-8 text-sm text-right w-40"
              value={pricing.freight ?? ""}
              onChange={e => update({ pricing: { ...pricing, freight: e.target.value } })}
              placeholder="0"
            />
            <span className="text-xs text-muted-foreground">
              Freight Charges is set to <strong>Custom</strong> in the Delivery step: this amount is printed under the
              total in Commercial Terms.
            </span>
          </div>
        ) : (
          <p className="text-sm text-slate-700">
            <strong>{freightOption}</strong>
            <span className="text-xs text-muted-foreground ml-2">
              (chosen in the Delivery step and printed as is). Choose <strong>Custom</strong> there to enter an amount.
            </span>
          </p>
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
  rows: { key: string; label: string; specs?: string[] }[];
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
              <td className="border p-2">
                <div>{r.label}</div>
                {r.specs && r.specs.length > 0 && (
                  <div className="text-[11px] text-slate-500 mt-0.5">{r.specs.join(" · ")}</div>
                )}
              </td>
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
  const localTemplates = useProposalStore(s => s.paymentTemplates);
  const cmsOverrides = useProposalStore(s => s.cmsOverrides);
  const templates = mergedPaymentTemplates(localTemplates, cmsOverrides);
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
          <div><strong>Instruments (ticked):</strong> {d.instruments.filter(i => i.included !== false).length}</div>
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