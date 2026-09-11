import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SystemType } from "@/data/systemTypesData";
import { systemConfiguration } from "@/data/systemConfiguration";
import { instrumentsData, type InstrumentRow } from "@/data/instrumentsData";
import { equipmentData, type EquipmentRow } from "@/data/equipmentData";
import { deliveryDefaults, type DeliveryRow } from "@/data/deliveryData";
import { paymentTemplatesData, type PaymentMilestone } from "@/data/paymentTermsData";
import { makesOfSupplyData } from "@/data/makesOfSupplyData";
import { exclusionsData } from "@/data/exclusionsData";
import { getMajorSubsystems } from "@/data/proposalContent";
import { employeesData, type Employee } from "@/data/employeesData";
import { companiesData, type Company } from "@/data/companiesData";
import { supabase } from "@/lib/supabaseClient";
import { buildOfferBase, buildOfferNumber, getFY, slugCompany } from "@/lib/offerNumber";
import { freightLogisticsDefaults, type FreightLogisticsData } from "@/data/freightLogisticsData";
import { defaultLayout, type ProposalLayout, type SavedProposalTemplate } from "@/data/proposalLayout";

export type { FreightLogisticsData };


export interface Customer {
  title: string; contactPerson: string; designation: string;
  mobile: string; altMobile: string; email: string;
  companyFullName: string; companyShortName: string;
  address: string; city: string; state: string; country: string; gst: string;
}
export interface Meta {
  preparedBy: string; checkedBy: string;
  offerNumber: string; revision: string; date: string;
}
export interface Transformer { rating: string; ratingUnit: "MVA"|"KVA"; voltage: string; voltageUnit: string; }
export interface MakeSelection { id: string; enabled: boolean; make: string; custom?: string; }

export interface CustomizationItem { id: string; title: string; description: string; }
export interface SystemLayoutAssets { imageUrl?: string; designPdfUrl?: string; }

/** A user-added proprietary item (free-text, not from the library) */
export interface ProprietaryCustomItem { id: string; title: string; }

/**
 * A single editable pricing entry: user enters the unit price and quantity,
 * the line total (price) is always DERIVED — never stored/edited directly.
 * Used for Scope of Supply, Instruments, and Equipment.
 */
export interface PriceEntry {
  unitPrice: string;
  qty: string;
}

/**
 * All pricing lives in one place, keyed by the row's stable id, so Step 9
 * (Pricing) and every PDF page that needs a price reads from the same
 * source of truth instead of each table owning its own qty/price fields.
 *
 *   scopeOfSupply   -> keyed by subsystem id, plus the 2 in-scope
 *                      proprietary item ids ("power-panel", "lv-trolley")
 *   instruments     -> keyed by instrument row id
 *   equipment       -> keyed by equipment row id
 *   scopeOfServices -> keyed by proprietary item id (everything except the
 *                      2 in-scope ones), "installation", and
 *                      "additional-warranty". DIRECT price, no qty — these
 *                      rows print with Sr.No / Description / Price only.
 */
export interface PricingData {
  scopeOfSupply: Record<string, PriceEntry>;
  instruments: Record<string, PriceEntry>;
  equipment: Record<string, PriceEntry>;
  scopeOfServices: Record<string, string>;
}

export interface InstallationPricing {
  pricingType: "calculate" | "inclusive";
  days: string;
  perDayCost: string;
  lumpSum?: string;
}

export interface ProposalData {
  systemType: SystemType;
  customer: Customer;
  meta: Meta;
  transformer: Transformer;
  selectedTests: string[];
  /** Optional free-text notes shown under the tests section in the PDF when non-empty */
  testsNotes?: string;
  selectedSubsystems: string[];
  proposalCustomizations: CustomizationItem[];
  subsystemVariants: Record<string, string>;
  systemLayout: SystemLayoutAssets;
  instruments: InstrumentRow[];
  equipment: EquipmentRow[];
  proprietary: string[];
  /** User-added free-text proprietary items (not from the library) */
  proprietaryCustom: ProprietaryCustomItem[];
  /**
   * Installation type selection:
   *   null          = Installation not selected
   *   "full"        = Full Installation
   *   "supervision" = Supervision Installation
   */
  installationType: "full" | "supervision" | null;
  installationPricing?: InstallationPricing;
  /** Months of additional warranty, set when "additional-warranty" proprietary item is selected */
  additionalWarrantyMonths?: number | null;
  /** Editable unit-price/qty entries used to derive every price shown in Step 9 + PDFs */
  pricing: PricingData;
  delivery: DeliveryRow[];
  exclusions: string[];
  makes: MakeSelection[];
  payment: PaymentMilestone[];
  /** Freight/logistics details for the Commercial Terms PDF page */
  freightLogistics?: FreightLogisticsData;
  /** Which wizard steps / proposal sections this project uses, plus edited section HTML */
  layout?: ProposalLayout;
}

/** A works order created from a won ("Completed") quotation. */
export interface InwardOrder {
  id: string;
  projectId: string;
  /** Copied from the source quotation */
  projectNumber: string;
  customerName: string;
  projectName: string;
  poNumber: string;
  poDate: string;
  dueDate: string;
  /** Entered when moving the quotation across */
  supervisor: string;
  qaOfficer: string;
  readinessDate: string;
  inspectionDate?: string;
  dispatchDate?: string;
  status: "Open" | "In Progress" | "Closed";
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  status: "Draft" | "Completed" | "Archived" | "Converted";
  createdAt: number;
  updatedAt: number;
  /** Sequential offer number within the FY (used for auto-increment) */
  offerSeq?: number;
  /** Indian fiscal year, e.g. "2025-26" */
  fy?: string;
  /** Company short slug used inside the offer number, e.g. "Neo" */
  companyShort?: string;
  /** Revision index: 0 = R0 (original), 1 = R1, ... */
  revision: number;
  /** For revisions: id of the offer this was revised from */
  parentId?: string | null;
  data: ProposalData;
}

const emptyCustomer = (): Customer => ({
  title: "Mr.", contactPerson: "", designation: "",
  mobile: "", altMobile: "", email: "",
  companyFullName: "", companyShortName: "",
  address: "", city: "", state: "", country: "India", gst: "",
});
const emptyMeta = (): Meta => ({
  preparedBy: "jmk", checkedBy: "sb",
  offerNumber: "",
  revision: "R0", date: new Date().toISOString().slice(0,10),
});
const emptyTransformer = (): Transformer => ({ rating: "500", ratingUnit: "MVA", voltage: "765", voltageUnit: "kV" });
const emptyPricing = (): PricingData => ({ scopeOfSupply: {}, instruments: {}, equipment: {}, scopeOfServices: {} });

function defaultsForSystem(systemType: SystemType): ProposalData {
  const cfg = systemConfiguration[systemType];
  return {
    systemType,
    customer: emptyCustomer(),
    meta: emptyMeta(),
    transformer: emptyTransformer(),
    selectedTests: [...cfg.defaultTests],
    selectedSubsystems: getMajorSubsystems(systemType).map(s => s.id),
    proposalCustomizations: [],
    subsystemVariants: {},
    systemLayout: {},
    instruments: instrumentsData.filter(i => cfg.defaultInstruments.includes(i.id)).map(i => ({ ...i })),
    equipment: equipmentData.map(e => ({ ...e, included: cfg.defaultEquipment.includes(e.id) })),
    proprietary: [...cfg.defaultProprietary],
    proprietaryCustom: [],
    installationType: null,
    additionalWarrantyMonths: null,
    pricing: emptyPricing(),
    delivery: deliveryDefaults.map(d => ({ ...d })),
    exclusions: exclusionsData.filter(e => e.defaultIncluded).map(e => e.id),
    makes: makesOfSupplyData.map(m => ({ id: m.id, enabled: !!m.defaultEnabled, make: m.defaultMake })),
    payment: paymentTemplatesData[0].milestones.map(m => ({ ...m })),
    freightLogistics: { ...freightLogisticsDefaults },
    layout: defaultLayout(),
  };
}

export function newProject(name = "Untitled Project", systemType: SystemType = "Advanced"): Project {
  const id = crypto.randomUUID();
  const now = Date.now();
  return { id, name, status: "Draft", createdAt: now, updatedAt: now, revision: 0, data: defaultsForSystem(systemType) };
}

interface ProposalStore {
  projects: Project[];
  cmsOverrides: Record<string, unknown>;
  paymentTemplates: typeof paymentTemplatesData;
  employees: Employee[];
  companies: Company[];
  inwardOrders: InwardOrder[];
  createInwardOrder: (o: Omit<InwardOrder, "id" | "createdAt" | "status">) => InwardOrder;
  deleteInwardOrder: (id: string) => void;
  hydrateInwardOrders: () => Promise<void>;
  createProject: (name?: string, layout?: ProposalLayout) => Project;
  setProjectLayout: (id: string, layout: ProposalLayout) => void;
  projectTemplates: SavedProposalTemplate[];
  saveProjectTemplate: (name: string, layout: ProposalLayout) => SavedProposalTemplate;
  deleteProjectTemplate: (id: string) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  updateProjectData: (id: string, patch: Partial<ProposalData>) => void;
  setSystemType: (id: string, systemType: SystemType) => void;
  duplicateProject: (id: string) => Project | null;
  reviseProject: (id: string) => Project | null;
  deleteProject: (id: string) => void;
  archiveProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
  setCms: (key: string, value: unknown) => void;
  savePaymentTemplate: (name: string, milestones: PaymentMilestone[]) => void;
  addEmployee: (emp: Omit<Employee, "id"> & { id?: string }) => Employee;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  addCompany: (c: Omit<Company, "id"> & { id?: string }) => Company;
  updateCompany: (id: string, patch: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  hydrateFromCloud: () => Promise<void>;
  syncProject: (id: string) => Promise<void>;
  serialize: (id: string) => unknown;
}

// ---------- Supabase sync helpers ----------
function projectToRow(p: Project) {
  return {
    id: p.id,
    name: p.name,
    status: p.status,
    offer_base: p.offerSeq != null && p.fy && p.companyShort
      ? buildOfferBase({ seq: p.offerSeq, fy: p.fy, companyShort: p.companyShort })
      : null,
    offer_seq: p.offerSeq ?? null,
    fy: p.fy ?? null,
    company_short: p.companyShort ?? null,
    revision: p.revision ?? 0,
    parent_id: p.parentId ?? null,
    data: p.data,
    updated_at: new Date(p.updatedAt).toISOString(),
    created_at: new Date(p.createdAt).toISOString(),
  };
}
async function pushProject(p: Project) {
  try {
    const { error } = await supabase.from("projects").upsert(projectToRow(p), { onConflict: "id" });
    if (error) console.warn("[supabase] upsert failed:", error.message);
  } catch (e) { console.warn("[supabase] push error:", e); }
}
async function removeProject(id: string) {
  try { await supabase.from("projects").delete().eq("id", id); }
  catch (e) { console.warn("[supabase] delete error:", e); }
}

/** Recompute meta.offerNumber from project's offerSeq/fy/companyShort/revision. */
function recomputeOfferNumber(p: Project): Project {
  if (p.offerSeq == null || !p.fy) return p;
  const offerNumber = buildOfferNumber({
    seq: p.offerSeq,
    fy: p.fy,
    companyShort: p.companyShort ?? p.data.customer.companyShortName ?? "",
    revision: p.revision ?? 0,
  });
  return {
    ...p,
    data: { ...p.data, meta: { ...p.data.meta, offerNumber, revision: `R${p.revision ?? 0}` } },
  };
}

export const useProposalStore = create<ProposalStore>()(
  persist(
    (set, get) => ({
      projects: [],
      cmsOverrides: {},
      paymentTemplates: paymentTemplatesData,
      employees: employeesData,
      companies: companiesData,
      inwardOrders: [],
      createInwardOrder: (o) => {
        const order: InwardOrder = { ...o, id: crypto.randomUUID(), status: "Open", createdAt: Date.now() };
        set(s => ({ inwardOrders: [order, ...s.inwardOrders] }));
        void pushInwardOrder(order);
        return order;
      },
      deleteInwardOrder: (id) => {
        set(s => ({ inwardOrders: s.inwardOrders.filter(o => o.id !== id) }));
        void (async () => {
          try { await supabase.from("inward_orders").delete().eq("id", id); }
          catch (e) { console.warn("[supabase] inward delete error:", e); }
        })();
      },
      hydrateInwardOrders: async () => {
        try {
          const { data, error } = await supabase
            .from("inward_orders").select("*").order("created_at", { ascending: false });
          if (error || !data) return;
          const cloud: InwardOrder[] = data.map((r: any) => ({
            id: r.id,
            projectId: r.project_id,
            projectNumber: r.project_number ?? "",
            customerName: r.customer_name ?? "",
            projectName: r.project_name ?? "",
            poNumber: r.po_number ?? "",
            poDate: r.po_date ?? "",
            dueDate: r.due_date ?? "",
            supervisor: r.supervisor ?? "",
            qaOfficer: r.qa_officer ?? "",
            readinessDate: r.readiness_date ?? "",
            inspectionDate: r.inspection_date ?? undefined,
            dispatchDate: r.dispatch_date ?? undefined,
            status: (r.status ?? "Open") as InwardOrder["status"],
            createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
          }));
          const map = new Map<string, InwardOrder>();
          for (const o of get().inwardOrders) map.set(o.id, o);
          for (const o of cloud) map.set(o.id, o);
          set({ inwardOrders: Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt) });
        } catch (e) { console.warn("[supabase] inward hydrate error:", e); }
      },
      projectTemplates: [],
      saveProjectTemplate: (name, layout) => {
        const t: SavedProposalTemplate = {
          id: crypto.randomUUID(), name, createdAt: Date.now(),
          layout: JSON.parse(JSON.stringify(layout)),
        };
        set(s => ({ projectTemplates: [t, ...s.projectTemplates] }));
        return t;
      },
      deleteProjectTemplate: (id) =>
        set(s => ({ projectTemplates: s.projectTemplates.filter(t => t.id !== id) })),
      setProjectLayout: (id, layout) =>
        set(s => ({ projects: s.projects.map(p => {
          if (p.id !== id) return p;
          const merged: Project = { ...p, updatedAt: Date.now(), data: { ...p.data, layout } };
          void pushProject(merged);
          return merged;
        }) })),
      createProject: (name, layout) => {
        // Next global sequence per FY, computed across local projects (cloud hydration keeps this in sync).
        const p0 = newProject(name);
        if (layout) p0.data.layout = JSON.parse(JSON.stringify(layout));
        const fy = getFY(p0.data.meta.date);
        const nextSeq =
          (get().projects.filter(x => x.fy === fy).reduce((m, x) => Math.max(m, x.offerSeq ?? 0), 0) || 0) + 1;
        let p: Project = {
          ...p0,
          fy,
          offerSeq: nextSeq,
          companyShort: slugCompany(p0.data.customer.companyShortName || ""),
          revision: 0,
          parentId: null,
        };
        p = recomputeOfferNumber(p);
        set(s => ({ projects: [p, ...s.projects] }));
        void pushProject(p);
        return p;
      },
      updateProject: (id, patch) =>
        set(s => ({ projects: s.projects.map(p => {
          if (p.id !== id) return p;
          const merged = { ...p, ...patch, updatedAt: Date.now() };
          void pushProject(merged);
          return merged;
        }) })),
      updateProjectData: (id, patch) =>
        set(s => ({ projects: s.projects.map(p => {
          if (p.id !== id) return p;
          let merged: Project = { ...p, data: { ...p.data, ...patch }, updatedAt: Date.now() };
          // If company short name changed, refresh the offer number slug.
          const newShort = slugCompany(merged.data.customer.companyShortName || "");
          if (newShort !== (merged.companyShort ?? "")) {
            merged = recomputeOfferNumber({ ...merged, companyShort: newShort });
          }
          void pushProject(merged);
          return merged;
        }) })),
      setSystemType: (id, systemType) =>
        set(s => ({ projects: s.projects.map(p => {
          if (p.id !== id) return p;
          const fresh = defaultsForSystem(systemType);
          const merged: Project = { ...p, updatedAt: Date.now(), data: {
            ...fresh,
            customer: p.data.customer,
            meta: p.data.meta,
            transformer: p.data.transformer,
            layout: p.data.layout ?? fresh.layout,
          }};
          void pushProject(merged);
          return merged;
        })})),
      duplicateProject: (id) => {
        const src = get().projects.find(p => p.id === id);
        if (!src) return null;
        const fy = getFY(src.data.meta.date);
        const nextSeq =
          (get().projects.filter(x => x.fy === fy).reduce((m, x) => Math.max(m, x.offerSeq ?? 0), 0) || 0) + 1;
        let copy: Project = {
          ...src, id: crypto.randomUUID(), name: src.name + " (Copy)",
          status: "Draft", createdAt: Date.now(), updatedAt: Date.now(),
          fy, offerSeq: nextSeq, revision: 0, parentId: null,
          data: JSON.parse(JSON.stringify(src.data)),
        };
        copy = recomputeOfferNumber(copy);
        set(s => ({ projects: [copy, ...s.projects] }));
        void pushProject(copy);
        return copy;
      },
      reviseProject: (id) => {
        const src = get().projects.find(p => p.id === id);
        if (!src) return null;
        // Walk back to the original to keep the base offer number stable across R1, R2, ...
        const root = (() => {
          let cur = src;
          while (cur.parentId) {
            const parent = get().projects.find(x => x.id === cur.parentId);
            if (!parent) break;
            cur = parent;
          }
          return cur;
        })();
        // Next revision index = 1 + max revision of any offer sharing this root
        const family = get().projects.filter(x => x.id === root.id || x.parentId === root.id);
        const nextRev = family.reduce((m, x) => Math.max(m, x.revision ?? 0), 0) + 1;
        let copy: Project = {
          ...src,
          id: crypto.randomUUID(),
          name: `${root.name} (R${nextRev})`,
          status: "Draft",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          fy: root.fy,
          offerSeq: root.offerSeq,
          companyShort: root.companyShort,
          revision: nextRev,
          parentId: root.id,
          data: JSON.parse(JSON.stringify(src.data)),
        };
        copy = recomputeOfferNumber(copy);
        set(s => ({ projects: [copy, ...s.projects] }));
        void pushProject(copy);
        return copy;
      },
      deleteProject: (id) => {
        set(s => ({ projects: s.projects.filter(p => p.id !== id) }));
        void removeProject(id);
      },
      archiveProject: (id) => set(s => ({ projects: s.projects.map(p => {
        if (p.id !== id) return p;
        const merged = { ...p, status: "Archived" as const, updatedAt: Date.now() };
        void pushProject(merged);
        return merged;
      }) })),
      getProject: (id) => get().projects.find(p => p.id === id),
      setCms: (key, value) => set(s => ({ cmsOverrides: { ...s.cmsOverrides, [key]: value } })),
      savePaymentTemplate: (name, milestones) =>
        set(s => ({ paymentTemplates: [...s.paymentTemplates, { id: crypto.randomUUID(), name, milestones }] })),
      addEmployee: (emp) => {
        const e: Employee = { id: emp.id ?? crypto.randomUUID(), name: emp.name, designation: emp.designation };
        set(s => ({ employees: [...s.employees, e] }));
        return e;
      },
      updateEmployee: (id, patch) =>
        set(s => ({ employees: s.employees.map(e => e.id === id ? { ...e, ...patch } : e) })),
      deleteEmployee: (id) =>
        set(s => ({ employees: s.employees.filter(e => e.id !== id) })),
      addCompany: (c) => {
        const co: Company = { ...c, id: c.id ?? crypto.randomUUID() } as Company;
        set(s => ({ companies: [...s.companies, co] }));
        return co;
      },
      updateCompany: (id, patch) =>
        set(s => ({ companies: s.companies.map(c => c.id === id ? { ...c, ...patch } : c) })),
      deleteCompany: (id) =>
        set(s => ({ companies: s.companies.filter(c => c.id !== id) })),
      syncProject: async (id) => {
        const p = get().projects.find(x => x.id === id);
        if (p) await pushProject(p);
      },
      hydrateFromCloud: async () => {
        try {
          const { data, error } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
          if (error) { console.warn("[supabase] hydrate failed:", error.message); return; }
          if (!data) return;
          const cloud: Project[] = data.map((r: any) => ({
            id: r.id,
            name: r.name,
            status: (r.status ?? "Draft") as Project["status"],
            createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
            updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : Date.now(),
            offerSeq: r.offer_seq ?? undefined,
            fy: r.fy ?? undefined,
            companyShort: r.company_short ?? undefined,
            revision: r.revision ?? 0,
            parentId: r.parent_id ?? null,
            data: r.data as ProposalData,
          }));
          // Merge: cloud wins by id; keep local-only projects that haven't synced yet.
          const local = get().projects;
          const map = new Map<string, Project>();
          for (const p of local) map.set(p.id, p);
          for (const p of cloud) {
            const existing = map.get(p.id);
            if (!existing || p.updatedAt >= existing.updatedAt) map.set(p.id, p);
          }
          set({ projects: Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt) });
        } catch (e) { console.warn("[supabase] hydrate error:", e); }
      },
      serialize: (id) => {
        const p = get().getProject(id);
        if (!p) return null;
        return { project: p, data: p.data, generatedAt: new Date().toISOString() };
      },
    }),
    { name: "electrosoft-proposal-store-v1" }
  )
);

export function useCms<T>(key: string, fallback: T): T {
  const ov = useProposalStore(s => s.cmsOverrides[key]);
  return (ov as T) ?? fallback;
}