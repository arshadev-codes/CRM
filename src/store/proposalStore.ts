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
export interface SubsystemCustomization { include: boolean; items: CustomizationItem[]; }
export interface SystemLayoutAssets { imageUrl?: string; designPdfUrl?: string; }

export interface ProposalData {
  systemType: SystemType;
  customer: Customer;
  meta: Meta;
  transformer: Transformer;
  selectedTests: string[];
  selectedSubsystems: string[];
  subsystemCustomizations: Record<string, SubsystemCustomization>;
  systemLayout: SystemLayoutAssets;
  instruments: InstrumentRow[];
  equipment: EquipmentRow[];
  proprietary: string[];
  delivery: DeliveryRow[];
  exclusions: string[];
  makes: MakeSelection[];
  payment: PaymentMilestone[];
}

export interface Project {
  id: string;
  name: string;
  status: "Draft" | "Completed" | "Archived";
  createdAt: number;
  updatedAt: number;
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
  offerNumber: `Q${String(Math.floor(Math.random()*900)+100)}/2025-26`,
  revision: "R0", date: new Date().toISOString().slice(0,10),
});
const emptyTransformer = (): Transformer => ({ rating: "500", ratingUnit: "MVA", voltage: "765", voltageUnit: "kV" });

function defaultsForSystem(systemType: SystemType): ProposalData {
  const cfg = systemConfiguration[systemType];
  return {
    systemType,
    customer: emptyCustomer(),
    meta: emptyMeta(),
    transformer: emptyTransformer(),
    selectedTests: [...cfg.defaultTests],
    selectedSubsystems: [...cfg.defaultSubsystems],
    subsystemCustomizations: {},
    systemLayout: {},
    instruments: instrumentsData.filter(i => cfg.defaultInstruments.includes(i.id)).map(i => ({ ...i })),
    equipment: equipmentData.map(e => ({ ...e, included: cfg.defaultEquipment.includes(e.id) })),
    proprietary: [...cfg.defaultProprietary],
    delivery: deliveryDefaults.map(d => ({ ...d })),
    exclusions: exclusionsData.filter(e => e.defaultIncluded).map(e => e.id),
    makes: makesOfSupplyData.map(m => ({ id: m.id, enabled: !!m.defaultEnabled, make: m.defaultMake })),
    payment: paymentTemplatesData[0].milestones.map(m => ({ ...m })),
  };
}

export function newProject(name = "Untitled Project", systemType: SystemType = "Advanced"): Project {
  const id = crypto.randomUUID();
  const now = Date.now();
  return { id, name, status: "Draft", createdAt: now, updatedAt: now, data: defaultsForSystem(systemType) };
}

interface ProposalStore {
  projects: Project[];
  cmsOverrides: Record<string, unknown>;
  paymentTemplates: typeof paymentTemplatesData;
  createProject: (name?: string) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  updateProjectData: (id: string, patch: Partial<ProposalData>) => void;
  setSystemType: (id: string, systemType: SystemType) => void;
  duplicateProject: (id: string) => Project | null;
  deleteProject: (id: string) => void;
  archiveProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
  setCms: (key: string, value: unknown) => void;
  savePaymentTemplate: (name: string, milestones: PaymentMilestone[]) => void;
  serialize: (id: string) => unknown;
}

export const useProposalStore = create<ProposalStore>()(
  persist(
    (set, get) => ({
      projects: [],
      cmsOverrides: {},
      paymentTemplates: paymentTemplatesData,
      createProject: (name) => {
        const p = newProject(name);
        set(s => ({ projects: [p, ...s.projects] }));
        return p;
      },
      updateProject: (id, patch) =>
        set(s => ({ projects: s.projects.map(p => p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p) })),
      updateProjectData: (id, patch) =>
        set(s => ({ projects: s.projects.map(p => p.id === id ? { ...p, data: { ...p.data, ...patch }, updatedAt: Date.now() } : p) })),
      setSystemType: (id, systemType) =>
        set(s => ({ projects: s.projects.map(p => {
          if (p.id !== id) return p;
          // Preserve customer/meta/transformer; reset system-dependent fields to new defaults
          const fresh = defaultsForSystem(systemType);
          return { ...p, updatedAt: Date.now(), data: {
            ...fresh,
            customer: p.data.customer,
            meta: p.data.meta,
            transformer: p.data.transformer,
          }};
        })})),
      duplicateProject: (id) => {
        const src = get().projects.find(p => p.id === id);
        if (!src) return null;
        const copy: Project = { ...src, id: crypto.randomUUID(), name: src.name + " (Copy)",
          status: "Draft", createdAt: Date.now(), updatedAt: Date.now(),
          data: JSON.parse(JSON.stringify(src.data)) };
        set(s => ({ projects: [copy, ...s.projects] }));
        return copy;
      },
      deleteProject: (id) => set(s => ({ projects: s.projects.filter(p => p.id !== id) })),
      archiveProject: (id) => set(s => ({ projects: s.projects.map(p => p.id === id ? { ...p, status: "Archived", updatedAt: Date.now() } : p) })),
      getProject: (id) => get().projects.find(p => p.id === id),
      setCms: (key, value) => set(s => ({ cmsOverrides: { ...s.cmsOverrides, [key]: value } })),
      savePaymentTemplate: (name, milestones) =>
        set(s => ({ paymentTemplates: [...s.paymentTemplates, { id: crypto.randomUUID(), name, milestones }] })),
      serialize: (id) => {
        const p = get().getProject(id);
        if (!p) return null;
        return { project: p, data: p.data, generatedAt: new Date().toISOString() };
      },
    }),
    { name: "electrosoft-proposal-store-v1" }
  )
);

// CMS helper: read library with optional overrides
export function useCms<T>(key: string, fallback: T): T {
  const ov = useProposalStore(s => s.cmsOverrides[key]);
  return (ov as T) ?? fallback;
}
