import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { SystemType } from "@/data/systemTypesData";
import { systemConfiguration } from "@/data/systemConfiguration";
import type { InstrumentRow } from "@/data/instrumentsData";
import type { EquipmentRow } from "@/data/equipmentData";
import type { DeliveryRow } from "@/data/deliveryData";
import { paymentTemplatesData, type PaymentMilestone, type PaymentTemplate } from "@/data/paymentTermsData";
import { applyLibraryOverride, getLibrary, type LibraryOverride } from "@/data/libraries";
import type { QuoteCurrency } from "@/data/currency";
import {
  getMajorSubsystems, fixSubsystemIdsInData, isOffByDefault, offersRedundantBench, type SubsystemContent,
} from "@/data/proposalContent";
import { fetchSharedSettings, SHARED_CMS_PREFIX, sharedKey } from "@/lib/sharedSettings";
import { employeesData, type Employee, type EmployeeRating, type RatingRule } from "@/data/employeesData";
import { companiesData, type Company } from "@/data/companiesData";
import { supabase } from "@/lib/supabaseClient";
// Inward orders, stages and attachments live in the app's own cloud backend.
import { supabase as cloud } from "@/integrations/supabase/client";
import {
  loadEmployeesFromCloud,
  loadRatingRules,
  removeEmployee,
  removeRating,
  removeRatingRule,
  saveEmployee,
  saveRating,
  saveRatingRule,
  uploadLocalEmployees,
} from "@/lib/employeesCloud";
import { buildOfferBase, buildOfferNumber, getFY, slugCompany } from "@/lib/offerNumber";
import { freightLogisticsDefaults, type FreightLogisticsData } from "@/data/freightLogisticsData";
import { createSaveQueue } from "@/lib/projectSave";
import { toast } from "sonner";
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
  /** Subject on the first page. Empty = made from the transformer details. */
  subject?: string;
}
export interface Transformer { rating: string; ratingUnit: "MVA"|"KVA"; voltage: string; voltageUnit: string; }
export interface MakeSelection {
  id: string; enabled: boolean; make: string; custom?: string;
  /** Item name of a row added in the wizard (not from the Settings list). */
  item?: string;
}

export interface CustomizationItem { id: string; title: string; description: string; }
export interface SystemLayoutAssets {
  imageUrl?: string; designPdfUrl?: string; designPdfName?: string;
  /**
   * Uploaded files left out of this computer's copy (they stay in the cloud
   * copy). Set only in the saved local copy; filled back in from the cloud.
   */
  strippedLocally?: SystemLayoutFile[];
}
export type SystemLayoutFile = "imageUrl" | "designPdfUrl";
const SYSTEM_LAYOUT_FILES: SystemLayoutFile[] = ["imageUrl", "designPdfUrl"];

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
 *   scopeOfSupply   -> keyed by subsystem id (Power Panel and LV Trolley
 *                      are Major Subsystems), plus any proprietary item
 *                      flagged inScopeOfSupply in Settings
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
  /** Freight charges, printed under the total in Commercial Terms (not added to it). */
  freight?: string;
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
  /** "Integration of Customer Scope Hardware": which customer instruments / equipment, as printed. */
  customerScopeHardware?: string;
  /** Ratings typed in the wizard, by subsystem id (LT Capacitor Bank), printed after the title. */
  subsystemRatings?: Record<string, string>;
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
  /** Currency the PDF shows prices in. Absent = INR. Prices are always typed in INR. */
  currency?: QuoteCurrency;
  delivery: DeliveryRow[];
  exclusions: string[];
  /** Exclusions typed in the wizard, on top of the ticked ones from the list. */
  exclusionsCustom?: string[];
  makes: MakeSelection[];
  payment: PaymentMilestone[];
  /** Freight/logistics details for the Commercial Terms PDF page */
  freightLogistics?: FreightLogisticsData;
  /** Which wizard steps / proposal sections this project uses, plus edited section HTML */
  layout?: ProposalLayout;
  /** Major Subsystems added in the wizard for this quotation only (ids start with "custom-sub-"). */
  customSubsystems?: SubsystemContent[];
  /**
   * Redundant / Conventional Test Bench with RIO Panel, asked in a dialog when the
   * automatic test bench is selected. null = not asked yet; undefined = older quotation.
   */
  redundantBench?: boolean | null;
  /** When the quotation was marked as sent to the customer (ISO). Sent implies Completed. */
  sentAt?: string;
  /** Status it had before it was archived, given back by Unarchive. */
  statusBeforeArchive?: "Draft" | "Completed" | "Converted";
}

/**
 * A works order, created from a won ("Completed") quotation or directly (a regular customer
 * ordering without a quotation). A direct order has no quotation: its projectId is its own id.
 */
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
  status: "Open" | "In Progress" | "Completed";
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

/** The Settings a new quotation's defaults are taken from. */
type DefaultsSource = { cmsOverrides?: Record<string, unknown>; paymentTemplates?: PaymentTemplate[] };

function defaultsForSystem(systemType: SystemType, src: DefaultsSource = {}): ProposalData {
  const cfg = systemConfiguration[systemType];
  const { cmsOverrides } = src;
  const firstTemplate = mergedPaymentTemplates(src.paymentTemplates, cmsOverrides)[0] ?? paymentTemplatesData[0];
  const library = getMajorSubsystems(systemType, cmsOverrides);
  const selectedSubsystems = library.filter(s => !isOffByDefault(s.id) && !s.offByDefault).map(s => s.id);
  return {
    systemType,
    customer: emptyCustomer(),
    meta: emptyMeta(),
    transformer: emptyTransformer(),
    selectedTests: [...cfg.defaultTests],
    selectedSubsystems,
    redundantBench: offersRedundantBench(library) ? null : undefined,
    proposalCustomizations: [],
    customSubsystems: [],
    subsystemVariants: {},
    systemLayout: {},
    ...suggestedInstrumentsAndEquipment(systemType, cmsOverrides),
    proprietary: [...cfg.defaultProprietary],
    proprietaryCustom: [],
    installationType: null,
    additionalWarrantyMonths: null,
    pricing: emptyPricing(),
    delivery: getLibrary("delivery", cmsOverrides).map(d => ({ ...d })),
    exclusions: getLibrary("exclusions", cmsOverrides).filter(e => e.defaultIncluded).map(e => e.id),
    // Rows that follow a subsystem (HT / LT Capacitor Bank, Power Panel) start ticked only with it.
    makes: getLibrary("makes", cmsOverrides).map(m => ({
      id: m.id,
      enabled: !!m.defaultEnabled && (!m.subsystemIds?.length || m.subsystemIds.some(id => selectedSubsystems.includes(id))),
      make: m.defaultMake,
    })),
    payment: firstTemplate.milestones.map(m => ({ ...m })),
    freightLogistics: { ...freightLogisticsDefaults },
    layout: defaultLayout(),
  };
}

/**
 * The main instruments and equipment of a system type, listed in a new quotation
 * UNTICKED: the user ticks the ones offered and adds others from the list.
 */
function suggestedInstrumentsAndEquipment(systemType: SystemType, cmsOverrides?: Record<string, unknown>) {
  const cfg = systemConfiguration[systemType];
  const row = <T extends { id: string }>(item: T) => ({ ...item, id: crypto.randomUUID(), sourceId: item.id, included: false, suggested: true });
  return {
    instruments: getLibrary("instruments", cmsOverrides).filter(i => cfg.defaultInstruments.includes(i.id)).map(row),
    equipment: getLibrary("equipment", cmsOverrides).filter(e => cfg.defaultEquipment.includes(e.id)).map(row),
  };
}

/** Global key for payment templates saved for every user (see src/lib/sharedSettings.ts). */
export const PAYMENT_TEMPLATES_KEY = "paymentTemplates";

/** This browser's payment templates with the global ones (every user) applied. */
/** Templates hidden in this browser only (cmsOverrides key, list of ids). */
export const PAYMENT_HIDDEN_KEY = "paymentTemplates:hidden";
export function mergedPaymentTemplates(local: PaymentTemplate[] | undefined, cmsOverrides?: Record<string, unknown>): PaymentTemplate[] {
  const shared = cmsOverrides?.[sharedKey(PAYMENT_TEMPLATES_KEY)] as LibraryOverride<PaymentTemplate> | undefined;
  const hidden = new Set((cmsOverrides?.[PAYMENT_HIDDEN_KEY] as string[] | undefined) ?? []);
  return applyLibraryOverride(local ?? paymentTemplatesData, shared).filter(t => !hidden.has(t.id));
}

/**
 * Brings a saved quotation up to date with changes to the app:
 *  - Power Panel, LV Test Trolley and Report Software moved from Proprietary Items to Major Subsystems
 *  - Makes of Supply "Capacitor Panel" split into HT and LT Capacitor Bank
 * Returns the same object when nothing needed changing.
 */
export function normalizeProjectData(data: ProposalData): ProposalData {
  if (!data) return data;
  let out = data;
  if ((data.proprietary ?? []).includes("report-sw")) {
    // Report Software is priced as the Report Generation Module subsystem
    // (Advanced / Fully Automatic; quotationSubsystems ignores ids a library doesn't have).
    const selected = data.selectedSubsystems ?? [];
    out = {
      ...out,
      proprietary: out.proprietary.filter(id => id !== "report-sw"),
      selectedSubsystems: selected.includes("xmer-edge-report") ? selected : [...selected, "xmer-edge-report"],
    };
  }
  const proprietary = out.proprietary ?? [];
  if (proprietary.includes("power-panel") || proprietary.includes("lv-trolley")) {
    const selected = new Set(out.selectedSubsystems ?? []);
    const supply = { ...(out.pricing?.scopeOfSupply ?? {}) };
    if (proprietary.includes("lv-trolley")) selected.add("lv-trolley"); // same price key as before
    if (proprietary.includes("power-panel")) {
      // "power-panel" is also the Generator Panels subsystem in Semi-automatic / Conventional:
      // move its price only when that subsystem isn't the one priced under the key.
      if (!selected.has("power-panel") && supply["power-panel"] && !supply["main-power-panel"]) {
        supply["main-power-panel"] = supply["power-panel"];
        delete supply["power-panel"];
      }
      selected.add("main-power-panel");
    }
    out = {
      ...out,
      proprietary: proprietary.filter(id => id !== "power-panel" && id !== "lv-trolley"),
      selectedSubsystems: Array.from(selected),
      pricing: { ...(out.pricing ?? { scopeOfSupply: {}, instruments: {}, equipment: {}, scopeOfServices: {} }), scopeOfSupply: supply },
    };
  }
  const oldCap = (out.makes ?? []).find(m => m.id === "cap-panel");
  if (oldCap && !out.makes.some(m => m.id === "ht-cap-bank" || m.id === "lt-cap-bank")) {
    const sel = new Set(out.selectedSubsystems ?? []);
    const neither = !sel.has("ht-cap") && !sel.has("lt-cap");
    const copy = (id: string, sub: string): MakeSelection => ({
      id, make: oldCap.make, custom: oldCap.custom, enabled: oldCap.enabled && (neither || sel.has(sub)),
    });
    out = {
      ...out,
      makes: out.makes.flatMap(m => (m.id === "cap-panel" ? [copy("ht-cap-bank", "ht-cap"), copy("lt-cap-bank", "lt-cap")] : [m])),
    };
  }
  return out;
}

/**
 * Draft quotations made before the tick column: the instruments / equipment that
 * were added automatically (library id as row id, never re-added by hand) and
 * have no price typed become unticked suggestions, like on a new quotation.
 * The `suggested` flag marks them, so a row the user ticks later stays ticked.
 * Completed / sent quotations are left exactly as they are.
 */
export function untickOldDefaults(p: Project): Project {
  if (p.status !== "Draft") return p;
  const cfg = systemConfiguration[p.data.systemType];
  if (!cfg) return p;
  const convert = <T extends { id: string; included?: boolean; suggested?: boolean; sourceId?: string }>(
    rows: T[] | undefined, defaults: string[], prices: Record<string, PriceEntry> | undefined,
  ): T[] | undefined => {
    if (!rows) return rows;
    let changed = false;
    const next = rows.map(r => {
      const auto = defaults.includes(r.id) && r.sourceId === undefined && r.suggested === undefined;
      if (!auto || r.included === false || prices?.[r.id]?.unitPrice) return r;
      changed = true;
      return { ...r, included: false, suggested: true };
    });
    return changed ? next : rows;
  };
  const instruments = convert(p.data.instruments, cfg.defaultInstruments, p.data.pricing?.instruments);
  const equipment = convert(p.data.equipment, cfg.defaultEquipment, p.data.pricing?.equipment);
  if (instruments === p.data.instruments && equipment === p.data.equipment) return p;
  return { ...p, data: { ...p.data, instruments: instruments ?? [], equipment: equipment ?? [] } };
}

/** True for an order made without a quotation. */
export const isDirectOrder = (o: Pick<InwardOrder, "id" | "projectId">) => o.projectId === o.id;

export function newProject(name = "Untitled Project", systemType: SystemType = "Advanced", src?: DefaultsSource): Project {
  const id = crypto.randomUUID();
  const now = Date.now();
  return { id, name, status: "Draft", createdAt: now, updatedAt: now, revision: 0, data: defaultsForSystem(systemType, src) };
}

interface ProposalStore {
  projects: Project[];
  cmsOverrides: Record<string, unknown>;
  paymentTemplates: typeof paymentTemplatesData;
  employees: Employee[];
  companies: Company[];
  inwardOrders: InwardOrder[];
  createInwardOrder: (o: Omit<InwardOrder, "id" | "createdAt" | "status"> & { id?: string; status?: InwardOrder["status"] }) => InwardOrder;
  updateInwardOrder: (id: string, patch: Partial<InwardOrder>) => void;
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
  /** Deletes from the database first, then from this computer. False when the database delete failed. */
  deleteProject: (id: string) => Promise<boolean>;
  archiveProject: (id: string) => void;
  /** Brings an archived quotation back with the status it had before. */
  unarchiveProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
  setCms: (key: string, value: unknown) => void;
  /** True once the global settings (saved for every user) were loaded, or failed to load. */
  sharedSettingsLoaded: boolean;
  /** Loads the global settings (every user) into cmsOverrides under "shared:" keys. */
  loadSharedSettings: () => Promise<void>;
  savePaymentTemplate: (name: string, milestones: PaymentMilestone[]) => void;
  updatePaymentTemplate: (id: string, patch: Partial<Omit<PaymentTemplate, "id">>) => void;
  deletePaymentTemplate: (id: string) => void;
  resetPaymentTemplates: () => void;
  addEmployee: (emp: Omit<Employee, "id"> & { id?: string }) => Employee;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  ratings: EmployeeRating[];
  addRating: (r: Omit<EmployeeRating, "id" | "createdAt">) => EmployeeRating;
  deleteRating: (id: string) => void;
  /** Who may rate whom (set by the admin, kept in the database). */
  ratingRules: RatingRule[];
  addRatingRule: (r: Omit<RatingRule, "id">) => Promise<boolean>;
  deleteRatingRule: (id: string) => void;
  /** Set once this browser's old local employees and ratings were uploaded. */
  employeesSynced: boolean;
  /** Loads employees and ratings from the database (the shared list). */
  hydrateEmployees: () => Promise<void>;
  addCompany: (c: Omit<Company, "id"> & { id?: string }) => Company;
  updateCompany: (id: string, patch: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  hydrateFromCloud: () => Promise<void>;
  syncProject: (id: string) => Promise<void>;
  serialize: (id: string) => unknown;
}

// ---------- Supabase sync helpers ----------
// When the test data was cleared and the app went live (see src/lib/freshStart.ts).
const GO_LIVE_AT = Date.parse("2026-11-19T00:00:00Z");

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
/** Uploads one quotation. Throws when it fails, so the save queue retries it. */
async function pushProject(p: Project) {
  let row = projectToRow(p);
  // This copy came from the computer's own storage, which leaves out uploaded
  // files: take them from the cloud copy so the upload doesn't erase them.
  const stripped = p.data.systemLayout?.strippedLocally;
  if (stripped?.length) {
    const { data, error } = await supabase.from("projects").select("data").eq("id", p.id).maybeSingle();
    if (error) throw new Error(error.message);
    const cloudLayout = (data?.data as ProposalData | undefined)?.systemLayout ?? {};
    const layout: SystemLayoutAssets = { ...p.data.systemLayout };
    for (const k of stripped) if (layout[k] === undefined) layout[k] = cloudLayout[k];
    if (stripped.includes("designPdfUrl") && !layout.designPdfName) layout.designPdfName = cloudLayout.designPdfName;
    delete layout.strippedLocally;
    row = projectToRow({ ...p, data: { ...p.data, systemLayout: layout } });
  }
  const { error } = await supabase.from("projects").upsert(row, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

/** One save queue for all quotations: newest copy only, one upload at a time, retried. */
export const projectSaves = createSaveQueue<Project>(pushProject);

/**
 * The copy kept in this browser leaves out uploaded files (layout image, design
 * PDF). They can be several MB each, and the browser keeps only about 5 MB for
 * the whole app: once that is full, nothing more is saved on this computer.
 * The files stay in the cloud copy and are filled back in when the app loads.
 */
function withoutFiles(p: Project): Project {
  const layout = p.data.systemLayout;
  if (!layout) return p;
  const files = SYSTEM_LAYOUT_FILES.filter(k => layout[k]?.startsWith("data:"));
  if (!files.length) return p;
  const kept: SystemLayoutAssets = { ...layout };
  for (const k of files) delete kept[k];
  kept.strippedLocally = Array.from(new Set([...(layout.strippedLocally ?? []), ...files]));
  return { ...p, data: { ...p.data, systemLayout: kept } };
}

/** Fills files left out of the local copy back in from the cloud copy. */
function withFilesFrom(local: Project, cloudCopy: Project | undefined): Project {
  const layout = local.data.systemLayout;
  if (!layout?.strippedLocally?.length || !cloudCopy) return local;
  const cloudLayout = cloudCopy.data.systemLayout ?? {};
  const filled: SystemLayoutAssets = { ...layout };
  for (const k of layout.strippedLocally) if (filled[k] === undefined) filled[k] = cloudLayout[k];
  if (!filled.designPdfName) filled.designPdfName = cloudLayout.designPdfName;
  delete filled.strippedLocally;
  return { ...local, data: { ...local.data, systemLayout: filled } };
}

/** localStorage that never throws: a full storage must not break typing in the app. */
let warnedStorageFull = false;
const safeLocalStorage = {
  getItem: (name: string) => localStorage.getItem(name),
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      console.warn("[store] could not save on this computer:", e);
      if (!warnedStorageFull) {
        warnedStorageFull = true;
        toast.warning("This computer's storage is full. Quotations are still saved to the cloud.");
      }
    }
  },
  removeItem: (name: string) => localStorage.removeItem(name),
};
async function pushInwardOrder(o: InwardOrder) {
  try {
    const { error } = await cloud.from("inward_orders").upsert({
      id: o.id,
      project_id: o.projectId,
      project_number: o.projectNumber,
      customer_name: o.customerName,
      project_name: o.projectName,
      po_number: o.poNumber || null,
      po_date: o.poDate || null,
      due_date: o.dueDate || null,
      supervisor: o.supervisor,
      qa_officer: o.qaOfficer,
      readiness_date: o.readinessDate,
      inspection_date: o.inspectionDate || null,
      dispatch_date: o.dispatchDate || null,
      status: o.status,
      created_at: new Date(o.createdAt).toISOString(),
    }, { onConflict: "id" });
    if (error) console.warn("[supabase] inward upsert failed:", error.message);
  } catch (e) { console.warn("[supabase] inward push error:", e); }
}
async function removeProject(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { console.warn("[supabase] delete error:", error.message); return false; }
    return true;
  } catch (e) {
    console.warn("[supabase] delete error:", e);
    return false;
  }
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
      sharedSettingsLoaded: false,
      paymentTemplates: paymentTemplatesData,
      employees: employeesData,
      ratings: [],
      ratingRules: [],
      employeesSynced: false,
      companies: companiesData,
      inwardOrders: [],
      createInwardOrder: (o) => {
        const order: InwardOrder = { ...o, id: o.id ?? crypto.randomUUID(), status: o.status ?? "Open", createdAt: Date.now() };
        set(s => ({ inwardOrders: [order, ...s.inwardOrders] }));
        void pushInwardOrder(order);
        return order;
      },
      updateInwardOrder: (id, patch) =>
        set(s => ({ inwardOrders: s.inwardOrders.map(o => {
          if (o.id !== id) return o;
          const merged = { ...o, ...patch };
          void pushInwardOrder(merged);
          return merged;
        }) })),
      deleteInwardOrder: (id) => {
        set(s => ({ inwardOrders: s.inwardOrders.filter(o => o.id !== id) }));
        void (async () => {
          try { await cloud.from("inward_orders").delete().eq("id", id); }
          catch (e) { console.warn("[supabase] inward delete error:", e); }
        })();
      },
      hydrateInwardOrders: async () => {
        try {
          const { data, error } = await cloud
            .from("inward_orders").select("*").order("created_at", { ascending: false });
          if (error || !data) return;
          const cloudOrders: InwardOrder[] = data.map((r: any) => ({
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
            status: (r.status === "Closed" ? "Completed" : (r.status ?? "Open")) as InwardOrder["status"],
            createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
          }));
          const map = new Map<string, InwardOrder>();
          for (const o of get().inwardOrders) map.set(o.id, o);
          for (const o of cloudOrders) map.set(o.id, o);
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
          projectSaves.queue(merged);
          return merged;
        }) })),
      createProject: (name, layout) => {
        // Next global sequence per FY, computed across local projects (cloud hydration keeps this in sync).
        const p0 = newProject(name, undefined, get());
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
        projectSaves.queue(p, 0);
        return p;
      },
      updateProject: (id, patch) =>
        set(s => ({ projects: s.projects.map(p => {
          if (p.id !== id) return p;
          const merged = { ...p, ...patch, updatedAt: Date.now() };
          projectSaves.queue(merged);
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
          projectSaves.queue(merged);
          return merged;
        }) })),
      setSystemType: (id, systemType) =>
        set(s => ({ projects: s.projects.map(p => {
          // Same type again (e.g. a click on the already selected card): change nothing.
          if (p.id !== id || p.data.systemType === systemType) return p;
          const fresh = defaultsForSystem(systemType, s);
          // Only what depends on the system type goes back to that type's defaults
          // (tests, subsystems, proprietary items). Everything else typed in so far
          // is kept, ticked instruments / equipment and prices included: prices are
          // stored per item id, and most items exist in every system type.
          // Subsystems added for this quotation only stay, still ticked.
          // Unticked suggestions are replaced by the new type's; ticked rows stay.
          const keepTicked = <T extends { included?: boolean }>(rows: T[]) => rows.filter(r => r.included !== false);
          // A suggestion already in the list (ticked) isn't listed a second time.
          const withSuggestions = <T extends { id: string; sourceId?: string }>(kept: T[], suggested: T[]) => {
            const have = new Set(kept.map(r => r.sourceId ?? r.id));
            return [...kept, ...suggested.filter(r => !have.has(r.sourceId ?? r.id))];
          };
          const custom = (p.data.customSubsystems ?? []).map(c => c.id);
          const keptCustom = (p.data.selectedSubsystems ?? []).filter(id => custom.includes(id));
          const merged: Project = { ...p, updatedAt: Date.now(), data: {
            ...p.data,
            systemType,
            selectedTests: fresh.selectedTests,
            selectedSubsystems: [...fresh.selectedSubsystems, ...keptCustom],
            redundantBench: fresh.redundantBench,
            instruments: withSuggestions(keepTicked(p.data.instruments ?? []), fresh.instruments),
            equipment: withSuggestions(keepTicked(p.data.equipment ?? []), fresh.equipment),
            subsystemVariants: fresh.subsystemVariants,
            proprietary: fresh.proprietary,
            layout: p.data.layout ?? fresh.layout,
          }};
          projectSaves.queue(merged);
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
          data: { ...JSON.parse(JSON.stringify(src.data)), sentAt: undefined, statusBeforeArchive: undefined },
        };
        copy = recomputeOfferNumber(copy);
        set(s => ({ projects: [copy, ...s.projects] }));
        projectSaves.queue(copy);
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
          data: { ...JSON.parse(JSON.stringify(src.data)), sentAt: undefined, statusBeforeArchive: undefined },
        };
        copy = recomputeOfferNumber(copy);
        set(s => ({ projects: [copy, ...s.projects] }));
        projectSaves.queue(copy);
        return copy;
      },
      deleteProject: async (id) => {
        // Stop pending saves first, so a late save can't bring it back.
        projectSaves.cancel(id);
        const ok = await removeProject(id);
        if (!ok) return false;
        set(s => ({ projects: s.projects.filter(p => p.id !== id) }));
        return true;
      },
      archiveProject: (id) => set(s => ({ projects: s.projects.map(p => {
        if (p.id !== id || p.status === "Archived") return p;
        const merged: Project = {
          ...p, status: "Archived", updatedAt: Date.now(),
          data: { ...p.data, statusBeforeArchive: p.status },
        };
        projectSaves.queue(merged);
        return merged;
      }) })),
      unarchiveProject: (id) => set(s => ({ projects: s.projects.map(p => {
        if (p.id !== id || p.status !== "Archived") return p;
        const status = p.data.statusBeforeArchive ?? (p.data.sentAt ? "Completed" : "Draft");
        const merged: Project = { ...p, status, updatedAt: Date.now(), data: { ...p.data, statusBeforeArchive: undefined } };
        projectSaves.queue(merged);
        return merged;
      }) })),
      getProject: (id) => get().projects.find(p => p.id === id),
      setCms: (key, value) => set(s => ({ cmsOverrides: { ...s.cmsOverrides, [key]: value } })),
      savePaymentTemplate: (name, milestones) =>
        set(s => ({ paymentTemplates: [...s.paymentTemplates, { id: crypto.randomUUID(), name, milestones }] })),
      updatePaymentTemplate: (id, patch) =>
        set(s => ({ paymentTemplates: s.paymentTemplates.map(t => t.id === id ? { ...t, ...patch } : t) })),
      deletePaymentTemplate: (id) =>
        set(s => ({ paymentTemplates: s.paymentTemplates.filter(t => t.id !== id) })),
      resetPaymentTemplates: () => set({ paymentTemplates: paymentTemplatesData }),
      addEmployee: (emp) => {
        const e: Employee = { ...emp, id: emp.id ?? crypto.randomUUID() };
        set(s => ({ employees: [...s.employees, e] }));
        void saveEmployee(e);
        return e;
      },
      updateEmployee: (id, patch) => {
        set(s => ({ employees: s.employees.map(e => e.id === id ? { ...e, ...patch } : e) }));
        const updated = get().employees.find(e => e.id === id);
        if (updated) void saveEmployee(updated);
      },
      deleteEmployee: (id) => {
        set(s => ({
          employees: s.employees.filter(e => e.id !== id),
          ratings: s.ratings.filter(r => r.employeeId !== id),
        }));
        void removeEmployee(id);
      },
      addRating: (r) => {
        const rating: EmployeeRating = { ...r, id: crypto.randomUUID(), createdAt: Date.now() };
        set(s => ({ ratings: [rating, ...s.ratings] }));
        void saveRating(rating);
        return rating;
      },
      deleteRating: (id) => {
        set(s => ({ ratings: s.ratings.filter(r => r.id !== id) }));
        void removeRating(id);
      },
      addRatingRule: async (r) => {
        const rule: RatingRule = { ...r, id: crypto.randomUUID() };
        const ok = await saveRatingRule(rule);
        if (ok) set(s => ({ ratingRules: [...s.ratingRules, rule] }));
        return ok;
      },
      deleteRatingRule: (id) => {
        set(s => ({ ratingRules: s.ratingRules.filter(r => r.id !== id) }));
        void removeRatingRule(id);
      },
      loadSharedSettings: async () => {
        const shared = await fetchSharedSettings();
        if (!shared) { set({ sharedSettingsLoaded: true }); return; } // offline: built-in lists only
        set(s => {
          const cms = Object.fromEntries(Object.entries(s.cmsOverrides).filter(([k]) => !k.startsWith(SHARED_CMS_PREFIX)));
          for (const [key, value] of Object.entries(shared)) cms[sharedKey(key)] = value;
          return { cmsOverrides: cms, sharedSettingsLoaded: true };
        });
      },
      hydrateEmployees: async () => {
        void loadRatingRules().then(rules => rules && set({ ratingRules: rules }));
        let cloudList = await loadEmployeesFromCloud();
        if (!cloudList) return; // offline or not allowed: keep the copy we have
        // First time on this browser: send up anyone and any rating only it knows about.
        if (!get().employeesSynced) {
          const knownPeople = new Set(cloudList.employees.map(e => e.id));
          const knownRatings = new Set(cloudList.ratings.map(r => r.id));
          const people = get().employees.filter(e => !knownPeople.has(e.id));
          const ratings = get().ratings.filter(r => !knownRatings.has(r.id));
          const kept = new Set([...knownPeople, ...people.map(e => e.id)]);
          const uploaded = await uploadLocalEmployees(
            people,
            ratings.filter(r => kept.has(r.employeeId)),
          );
          if (!uploaded) return; // try again next time; nothing local is lost
          if (people.length || ratings.length) cloudList = (await loadEmployeesFromCloud()) ?? cloudList;
          set({ employeesSynced: true });
        }
        set({ employees: cloudList.employees, ratings: cloudList.ratings });
      },
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
        if (!p) return;
        projectSaves.queue(p, 0);
        await projectSaves.flush(id);
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
          // Local-only copies made before going live are old test data: drop them,
          // so they don't show up or get saved back to the database.
          const local = get().projects.filter(p => p.createdAt >= GO_LIVE_AT || cloud.some(c => c.id === p.id));
          const cloudById = new Map(cloud.map(p => [p.id, p]));
          const map = new Map<string, Project>();
          for (const p of local) map.set(p.id, withFilesFrom(p, cloudById.get(p.id)));
          for (const p of cloud) {
            const existing = map.get(p.id);
            if (!existing || p.updatedAt >= existing.updatedAt) map.set(p.id, p);
          }
          // Work that never reached the cloud (no internet, a failed save, the tab
          // closed too soon) is sent up now instead of staying on this computer only.
          for (const p of map.values()) {
            const c = cloudById.get(p.id);
            if (!c || p.updatedAt > c.updatedAt) projectSaves.queue(p, 0);
          }
          // Saved quotations may still hold renamed subsystem ids; map them to the current ones.
          // Offer numbers made before the switch to "SQ" (Q001/…) get the new prefix.
          const fixed = Array.from(map.values()).map(p => {
            let data = normalizeProjectData(fixSubsystemIdsInData(p.data));
            const offer = data.meta?.offerNumber ?? "";
            if (/^Q\d{3}\//.test(offer)) data = { ...data, meta: { ...data.meta, offerNumber: `S${offer}` } };
            return untickOldDefaults(data === p.data ? p : { ...p, data });
          });
          set({ projects: fixed.sort((a, b) => b.updatedAt - a.updatedAt) });
        } catch (e) { console.warn("[supabase] hydrate error:", e); }
      },
      serialize: (id) => {
        const p = get().getProject(id);
        if (!p) return null;
        return { project: p, data: p.data, generatedAt: new Date().toISOString() };
      },
    }),
    {
      name: "electrosoft-proposal-store-v1",
      version: 4,
      storage: createJSONStorage(() => safeLocalStorage),
      // Global settings come from the database on every start, so they aren't kept here.
      partialize: (s) => ({
        ...s,
        projects: s.projects.map(withoutFiles),
        cmsOverrides: Object.fromEntries(Object.entries(s.cmsOverrides).filter(([k]) => !k.startsWith(SHARED_CMS_PREFIX))),
        sharedSettingsLoaded: false,
      }) as ProposalStore,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<ProposalStore>;
        // v0 -> v1: bring in the seed employees added since this browser first saved.
        if (version < 1) {
          const current = state.employees ?? [];
          const known = new Set(current.map(e => e.name.trim().toLowerCase()));
          state.employees = [...current, ...employeesData.filter(e => !known.has(e.name.trim().toLowerCase()))];
          state.ratings ??= [];
        }
        // v1 -> v2: split quotation people from the workshop team. Seed workshop
        // people keep their slug ids; everyone else was made for quotations.
        if (version < 2) {
          const workshopIds = new Set(employeesData.filter(e => e.scope === "workshop").map(e => e.id));
          state.employees = (state.employees ?? []).map(e => ({
            ...e,
            scope: e.scope ?? (workshopIds.has(e.id) ? "workshop" : "quotation"),
          }));
        }
        // v2 -> v3: Power Panel / LV Trolley became subsystems, capacitor makes were split.
        if (version < 3) state.projects = (state.projects ?? []).map(p => ({ ...p, data: normalizeProjectData(p.data) }));
        // v3 -> v4: Draft quotations list their automatic instruments / equipment unticked.
        if (version < 4) state.projects = (state.projects ?? []).map(untickOldDefaults);
        return state as ProposalStore;
      },
    }
  )
);

export function useCms<T>(key: string, fallback: T): T {
  const ov = useProposalStore(s => s.cmsOverrides[key]);
  return (ov as T) ?? fallback;
}