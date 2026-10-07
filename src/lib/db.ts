import { supabase as cloud } from "@/integrations/supabase/client";
import { useProposalStore } from "@/store/proposalStore";

/*
 * Database access for the inward-order stage pages, with a browser fallback.
 *
 * Every query first goes to the cloud database. If a table (or the file storage)
 * is missing or unreachable, that table switches to "demo mode": rows are kept in
 * this browser's localStorage and files in IndexedDB, so every page still works
 * for a demo. Once the cloud tables exist, the same code uses them automatically.
 */

type Row = Record<string, unknown>;
type Op = { m: string; a: unknown[] };
type Result = { data: unknown; error: { message: string; code?: string } | null; count?: null };

const LOCAL_PREFIX = "electrosoft-demo:";
const localTables = new Set<string>();
const listeners = new Set<() => void>();

export function isDemoMode() {
  return localTables.size > 0;
}
export function onDemoModeChange(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
function switchToLocal(table: string) {
  if (localTables.has(table)) return;
  localTables.add(table);
  console.info(`[demo mode] "${table}" is not available in the cloud; saving in this browser.`);
  listeners.forEach((l) => l());
}

function isUnavailable(error: { message?: string; code?: string } | null, status?: number) {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    status === 404 ||
    status === 0 ||
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    msg.includes("could not find the table") ||
    msg.includes("does not exist") ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("load failed")
  );
}

/* ---------- Local table storage ---------- */

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

// Column defaults, matching the database migrations.
const DEFAULTS: Record<string, () => Row> = {
  project_stages: () => ({
    status: "not started",
    assigned_to: "",
    remarks: "",
    expected_date: null,
  }),
  inward_order_attachments: () => ({ content_type: null, file_size: 0 }),
  stage_updates: () => ({
    kind: "update",
    author: "",
    remarks: "",
    status: null,
    file_name: null,
    storage_path: null,
    content_type: null,
    file_size: 0,
    title: "",
    document_id: null,
  }),
  procurement_items: () => ({
    category: "",
    make: "",
    model: "",
    specification: "",
    unit: "Nos",
    qty_required: 1,
    qty_in_stock: null,
    stock_checked_by: "",
    stock_checked_at: null,
    supplier: "",
    enquiry_date: null,
    expected_date: null,
    qty_received: 0,
    received_at: null,
    notes: "",
    display_order: 0,
  }),
  inventory_items: () => ({
    category: "",
    make: "",
    model: "",
    unit: "Nos",
    qty_in_stock: 0,
    location: "",
  }),
  qa_sessions: () => ({
    kind: "testing",
    title: "",
    session_date: null,
    start_time: "",
    location: "",
    team: [],
    client_attendees: [],
    status: "planned",
    summary: "",
    created_by: "",
  }),
  test_items: () => ({
    test_key: null,
    test_group: "",
    status: "pending",
    result_notes: "",
    tested_by: "",
    session_id: null,
    witness_status: "",
    witness_remarks: "",
    display_order: 0,
  }),
  mom_points: () => ({
    point_type: "note",
    description: "",
    cause: "",
    action: "",
    owner: "",
    due_date: null,
    status: "open",
    closed_at: null,
    display_order: 0,
  }),
  inspection_outcomes: () => ({
    outcome: "",
    remarks: "",
    decided_by: "",
    decided_at: null,
    report_name: null,
    report_path: null,
  }),
  dispatch_details: () => ({
    planned_date: null,
    incharge: "",
    milestone: "planned",
    packing_date: null,
    packing_type: "",
    packages_count: null,
    gross_weight_kg: null,
    dimensions: "",
    transport_mode: "",
    transporter: "",
    vehicle_no: "",
    driver_name: "",
    driver_phone: "",
    lr_number: "",
    eway_bill_no: "",
    invoice_no: "",
    insurance: "",
    loading_method: "",
    dispatched_on: null,
    destination: "",
    site_contact: "",
    site_phone: "",
    expected_delivery: null,
    delivered_on: null,
    received_by: "",
    delivery_remarks: "",
    checklist: {},
    notes: "",
  }),
  fabrication_jobs: () => ({
    phase: "fabrication",
    description: "",
    vendor: "",
    contact: "",
    given_by: "",
    given_on: null,
    expected_on: null,
    received_on: null,
    received_by: "",
    remarks: "",
    display_order: 0,
  }),
  production_panels: () => ({ panel_type: "", tag: "", quantity: 1, notes: "", display_order: 0 }),
  production_tasks: () => ({
    work: "",
    assignees: [],
    start_date: null,
    end_date: null,
    status: "pending",
    completed_on: null,
    remarks: "",
    display_order: 0,
  }),
  pdi_reports: () => ({
    status: "draft",
    inspector_name: "",
    inspector_email: "",
    email_verified_at: null,
    customer_name: "",
    project_number: "",
    panel_serial: "",
    panel_name: "",
    panel_category: "electrical",
    responses: {},
    remarks: "",
    declared: false,
    submitted_at: null,
    dcc: null,
    dcc_emailed_at: null,
  }),
};
// Tables keyed by the order instead of an id.
const KEYED_BY_ORDER = new Set(["inspection_outcomes", "dispatch_details"]);

function readTable(table: string): Row[] {
  if (table === "inward_orders") {
    return useProposalStore.getState().inwardOrders.map((o) => ({
      id: o.id,
      project_id: o.projectId,
      project_number: o.projectNumber,
      customer_name: o.customerName,
      project_name: o.projectName,
      po_number: o.poNumber,
      status: o.status,
    }));
  }
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PREFIX + table) ?? "[]") as Row[];
  } catch {
    return [];
  }
}
function writeTable(table: string, rows: Row[]) {
  try {
    localStorage.setItem(LOCAL_PREFIX + table, JSON.stringify(rows));
  } catch {
    /* storage full or unavailable: keep going in memory for this action */
  }
}
function newRow(table: string, values: Row): Row {
  const stamp = now();
  return {
    ...(KEYED_BY_ORDER.has(table) ? {} : { id: uuid(), created_at: stamp }),
    ...(DEFAULTS[table]?.() ?? {}),
    updated_at: stamp,
    ...values,
  };
}
function cascadeDelete(table: string, removed: Row[]) {
  if (!removed.length) return;
  const ids = new Set(removed.map((r) => r.id));
  if (table === "production_panels") {
    writeTable(
      "production_tasks",
      readTable("production_tasks").filter((t) => !ids.has(t.panel_id)),
    );
    return;
  }
  if (table !== "qa_sessions") return;
  writeTable(
    "mom_points",
    readTable("mom_points").filter((p) => !ids.has(p.session_id)),
  );
  writeTable(
    "test_items",
    readTable("test_items").map((t) => (ids.has(t.session_id) ? { ...t, session_id: null } : t)),
  );
}

// Runs a recorded query chain against localStorage, mimicking the cloud API.
function runLocal(table: string, ops: Op[]): Result {
  let action: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  let payload: Row | Row[] | undefined;
  let upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  const filters: ((r: Row) => boolean)[] = [];
  let order: { col: string; asc: boolean }[] = [];
  let limit: number | undefined;
  let returning = false;
  let single: "single" | "maybe" | undefined;

  for (const { m, a } of ops) {
    switch (m) {
      case "select":
        if (action === "select") action = "select";
        else returning = true;
        break;
      case "insert":
        action = "insert";
        payload = a[0] as Row | Row[];
        break;
      case "upsert":
        action = "upsert";
        payload = a[0] as Row | Row[];
        upsertOpts = (a[1] as typeof upsertOpts) ?? {};
        break;
      case "update":
        action = "update";
        payload = a[0] as Row;
        break;
      case "delete":
        action = "delete";
        break;
      case "eq":
        filters.push((r) => String(r[a[0] as string]) === String(a[1]));
        break;
      case "neq":
        filters.push((r) => String(r[a[0] as string]) !== String(a[1]));
        break;
      case "in":
        filters.push((r) => (a[1] as unknown[]).map(String).includes(String(r[a[0] as string])));
        break;
      case "not":
        if (a[1] === "is" && a[2] === null) filters.push((r) => r[a[0] as string] != null);
        break;
      case "is":
        if (a[1] === null) filters.push((r) => r[a[0] as string] == null);
        break;
      case "order":
        order.push({
          col: a[0] as string,
          asc: (a[1] as { ascending?: boolean })?.ascending !== false,
        });
        break;
      case "limit":
        limit = a[0] as number;
        break;
      case "single":
        single = "single";
        break;
      case "maybeSingle":
        single = "maybe";
        break;
    }
  }

  const rows = readTable(table);
  const match = (r: Row) => filters.every((f) => f(r));
  let out: Row[] = [];

  if (action === "select") {
    out = rows.filter(match);
  } else if (action === "insert") {
    const created = (Array.isArray(payload) ? payload : [payload!]).map((v) => newRow(table, v));
    writeTable(table, [...rows, ...created]);
    out = created;
  } else if (action === "upsert") {
    const keys = (upsertOpts.onConflict ?? (KEYED_BY_ORDER.has(table) ? "inward_order_id" : "id"))
      .split(",")
      .map((k) => k.trim());
    const next = [...rows];
    for (const value of Array.isArray(payload) ? payload : [payload!]) {
      const index = next.findIndex((r) =>
        keys.every((k) => r[k] != null && String(r[k]) === String(value[k])),
      );
      if (index === -1) {
        const created = newRow(table, value);
        next.push(created);
        out.push(created);
      } else if (!upsertOpts.ignoreDuplicates) {
        next[index] = { ...next[index], ...value, updated_at: now() };
        out.push(next[index]);
      }
    }
    writeTable(table, next);
  } else if (action === "update") {
    const next = rows.map((r) => {
      if (!match(r)) return r;
      const updated = { ...r, ...(payload as Row), updated_at: now() };
      out.push(updated);
      return updated;
    });
    writeTable(table, next);
  } else if (action === "delete") {
    out = rows.filter(match);
    writeTable(
      table,
      rows.filter((r) => !match(r)),
    );
    cascadeDelete(table, out);
  }

  if (order.length) {
    out = [...out].sort((x, y) => {
      for (const { col, asc } of order) {
        const a = x[col] ?? "";
        const b = y[col] ?? "";
        const c =
          typeof a === "number" && typeof b === "number"
            ? a - b
            : String(a).localeCompare(String(b));
        if (c) return asc ? c : -c;
      }
      return 0;
    });
    order = [];
  }
  if (limit !== undefined) out = out.slice(0, limit);

  const wantsData = action === "select" || returning;
  if (single) {
    if (!out.length)
      return single === "maybe"
        ? { data: null, error: null }
        : { data: null, error: { message: "No rows found", code: "PGRST116" } };
    return { data: wantsData ? out[0] : null, error: null };
  }
  return { data: wantsData ? out : null, error: null };
}

/* ---------- Query builder that falls back to the browser ---------- */

function builder(table: string, ops: Op[] = []): unknown {
  const run = async (): Promise<Result> => {
    if (!localTables.has(table)) {
      try {
        let query = (
          cloud as unknown as { from: (t: string) => Record<string, (...a: unknown[]) => unknown> }
        ).from(table);
        for (const { m, a } of ops) query = (query[m] as (...x: unknown[]) => typeof query)(...a);
        const result = (await (query as unknown as PromiseLike<
          Result & { status?: number }
        >)) as Result & { status?: number };
        if (!isUnavailable(result.error, result.status)) return result;
      } catch (error) {
        if (!isUnavailable({ message: String(error) })) throw error;
      }
      switchToLocal(table);
    }
    return runLocal(table, ops);
  };
  return new Proxy(
    {},
    {
      get(_, prop: string) {
        if (prop === "then")
          return (resolve: (v: Result) => unknown, reject: (e: unknown) => unknown) =>
            run().then(resolve, reject);
        return (...args: unknown[]) => builder(table, [...ops, { m: prop, a: args }]);
      },
    },
  );
}

/* ---------- File storage fallback (IndexedDB) ---------- */

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("electrosoft-demo-files", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function fileOp<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await idb();
  return new Promise((resolve, reject) => {
    const request = fn(database.transaction("files", mode).objectStore("files"));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
const localUrls = new Map<string, string>();
async function localUrl(path: string) {
  if (localUrls.has(path)) return localUrls.get(path)!;
  const blob = await fileOp<Blob | undefined>(
    "readonly",
    (s) => s.get(path) as IDBRequest<Blob | undefined>,
  );
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  localUrls.set(path, url);
  return url;
}

type Bucket = ReturnType<typeof cloud.storage.from>;
function bucket(name: string) {
  const real = () => cloud.storage.from(name);
  return {
    async upload(path: string, file: Blob, options?: Parameters<Bucket["upload"]>[2]) {
      try {
        const result = await real().upload(path, file, options);
        if (!result.error) return result;
      } catch {
        /* fall through to the browser */
      }
      switchToLocal(`storage:${name}`);
      await fileOp("readwrite", (s) => s.put(file, path));
      return { data: { path, id: path, fullPath: `${name}/${path}` }, error: null };
    },
    async createSignedUrl(
      path: string,
      expiresIn: number,
      options?: Parameters<Bucket["createSignedUrl"]>[2],
    ) {
      const url = await localUrl(path).catch(() => null);
      if (url) return { data: { signedUrl: url }, error: null };
      return real().createSignedUrl(path, expiresIn, options);
    },
    async createSignedUrls(paths: string[], expiresIn: number) {
      const local = await Promise.all(paths.map((p) => localUrl(p).catch(() => null)));
      const missing = paths.filter((_, i) => !local[i]);
      const remote = missing.length
        ? ((await real().createSignedUrls(missing, expiresIn)).data ?? [])
        : [];
      const data = paths.map((path, i) =>
        local[i]
          ? { path, signedUrl: local[i]!, error: null }
          : (remote.find((r) => r.path === path) ?? { path, signedUrl: "", error: "Not found" }),
      );
      return { data, error: null };
    },
    async remove(paths: string[]) {
      await Promise.all(
        paths.map((p) => fileOp("readwrite", (s) => s.delete(p)).catch(() => undefined)),
      );
      paths.forEach((p) => localUrls.delete(p));
      return real()
        .remove(paths)
        .catch(() => ({ data: [], error: null }));
    },
  };
}

// Drop-in replacement for the cloud client in the stage pages.
export const supabase = {
  from: (table: string) => builder(table),
  storage: { from: (name: string) => bucket(name) },
  channel: (...args: Parameters<typeof cloud.channel>) => cloud.channel(...args),
  removeChannel: (...args: Parameters<typeof cloud.removeChannel>) => cloud.removeChannel(...args),
} as unknown as typeof cloud;
