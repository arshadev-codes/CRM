import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CircleDashed,
  ExternalLink,
  FileText,
  HardHat,
  LoaderCircle,
  Package,
  Play,
  Ruler,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app/AppHeader";
import { supabase } from "@/lib/db";
import type { Database } from "@/integrations/supabase/types";
import { loadMyWork, type MyOrder } from "@/lib/myWork";
import { isLate, type Task, type TaskStatus } from "@/lib/production";
import {
  formatQty,
  itemState,
  mapProcurement,
  todayIso,
  type ProcurementItem,
} from "@/lib/procurement";
import { remarkTime, useTaskRemarks, type TaskRemark } from "@/lib/taskRemarks";
import { isSiteLate, SITE_META, type SiteStatus, type SiteTask } from "@/lib/commissioning";
import { canSee, useCurrentUser } from "@/store/authStore";

export const Route = createFileRoute("/my/$orderId")({
  head: () => ({ meta: [{ title: "Order — Electrosoft" }] }),
  component: MyOrderPage,
});

type Tab = "tasks" | "drawings" | "material";
type UpdateRow = Database["public"]["Tables"]["stage_updates"]["Row"];
const BUCKET = "inward-order-attachments";

function day(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function MyOrderPage() {
  const { orderId } = Route.useParams();
  const user = useCurrentUser();
  const [work, setWork] = useState<MyOrder | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("tasks");
  const showDrawings = canSee(user, "view_design");
  const showMaterial = canSee(user, "view_equipment");

  useEffect(() => {
    if (!user) return;
    loadMyWork(user)
      .then((all) => setWork(all.find((o) => o.order.id === orderId) ?? null))
      .catch(() => setWork(null));
  }, [user, orderId]);

  const tabs: { key: Tab; label: string; icon: typeof Wrench }[] = [
    { key: "tasks", label: "Tasks", icon: Wrench },
    ...(showDrawings ? [{ key: "drawings" as Tab, label: "Drawings", icon: Ruler }] : []),
    ...(showMaterial ? [{ key: "material" as Tab, label: "Material", icon: Package }] : []),
  ];

  return (
    <div className="min-h-svh bg-slate-50 pb-[env(safe-area-inset-bottom)]">
      <AppHeader
        back
        title={work?.order.customer_name || work?.order.project_name || "Order"}
        subtitle={
          work
            ? [
                work.order.project_number,
                work.panels.map((p) => p.panelType).join(", "),
                work.siteTasks.length ? "Site work" : "",
              ]
                .filter(Boolean)
                .join(" · ")
            : ""
        }
      />

      {tabs.length > 1 && (
        <nav className="sticky top-[calc(env(safe-area-inset-top)+4.5rem)] z-10 mx-auto flex max-w-xl gap-1 bg-slate-50 px-4 pt-3">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors ${tab === key ? "bg-indigo-600 text-white shadow" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
      )}

      <main className="mx-auto max-w-xl px-4 py-4">
        {work === undefined ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        ) : work === null ? (
          <Empty icon={AlertTriangle} title="Not found" text="This order is not assigned to you." />
        ) : tab === "tasks" ? (
          <div className="space-y-6">
            {work.siteTasks.length > 0 && (
              <SiteTaskList
                tasks={work.siteTasks}
                onSaved={(next) =>
                  setWork({
                    ...work,
                    siteTasks: work.siteTasks.map((t) => (t.id === next.id ? next : t)),
                  })
                }
              />
            )}
            {(work.tasks.length > 0 || work.siteTasks.length === 0) && (
              <TaskList work={work} onChange={(tasks) => setWork({ ...work, tasks })} />
            )}
          </div>
        ) : tab === "drawings" ? (
          <Drawings orderId={orderId} />
        ) : (
          <Material orderId={orderId} work={work} />
        )}
      </main>
    </div>
  );
}

function Empty({ icon: Icon, title, text }: { icon: typeof Wrench; title: string; text: string }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-sm">
      <Icon className="mx-auto h-9 w-9 text-slate-300" />
      <div className="mt-3 font-semibold text-slate-700">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{text}</div>
    </div>
  );
}

/* ---------- Tasks ---------- */

const STATUS_STEPS: { value: TaskStatus; label: string; icon: typeof Check }[] = [
  { value: "pending", label: "Not started", icon: CircleDashed },
  { value: "in progress", label: "Started", icon: Play },
  { value: "done", label: "Done", icon: Check },
];

function TaskList({ work, onChange }: { work: MyOrder; onChange: (tasks: Task[]) => void }) {
  const user = useCurrentUser();
  const remarks = useTaskRemarks(work.order.id);
  if (!work.tasks.length)
    return (
      <Empty icon={Wrench} title="No tasks yet" text="Your tasks on this order will show here." />
    );
  return (
    <div className="space-y-5">
      {work.panels.map((panel) => {
        const tasks = work.tasks.filter((t) => t.panelId === panel.id);
        if (!tasks.length) return null;
        return (
          <section key={panel.id}>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
              {panel.panelType}
              {panel.quantity > 1 ? ` × ${panel.quantity}` : ""}
            </div>
            <div className="space-y-3">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  remarks={remarks.byTask.get(task.id) ?? []}
                  myId={user?.id}
                  onAddRemark={(body) => remarks.add(task.id, body)}
                  onRemoveRemark={remarks.remove}
                  onSaved={(next) => onChange(work.tasks.map((t) => (t.id === next.id ? next : t)))}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TaskCard({
  task,
  remarks,
  myId,
  onAddRemark,
  onRemoveRemark,
  onSaved,
}: {
  task: Task;
  remarks: TaskRemark[];
  myId?: string;
  onAddRemark: (body: string) => Promise<boolean>;
  onRemoveRemark: (id: string) => Promise<boolean>;
  onSaved: (task: Task) => void;
}) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState<"status" | "remarks" | null>(null);
  const late = isLate(task, todayIso());

  async function save(patch: Partial<Task>, kind: "status" | "remarks") {
    setSaving(kind);
    const row: Database["public"]["Tables"]["production_tasks"]["Update"] = {};
    if (patch.status) {
      row.status = patch.status;
      row.completed_on = patch.status === "done" ? todayIso() : null;
    }
    const { error } = await supabase.from("production_tasks").update(row).eq("id", task.id);
    setSaving(null);
    if (error) {
      toast.error("Could not save. Check the internet and try again.");
      return;
    }
    onSaved({
      ...task,
      ...patch,
      completedOn: patch.status
        ? patch.status === "done"
          ? todayIso()
          : undefined
        : task.completedOn,
    });
    toast.success(kind === "status" ? "Status updated" : "Remark saved");
  }

  async function addRemark() {
    setSaving("remarks");
    const ok = await onAddRemark(draft);
    setSaving(null);
    if (!ok) return toast.error("Could not save. Check the internet and try again.");
    setDraft("");
    toast.success("Remark saved");
  }

  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${late ? "ring-rose-200" : "ring-slate-200/70"}`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold text-slate-800">{task.work}</div>
          <div className="text-xs text-slate-500">
            {task.startDate || task.endDate
              ? `${day(task.startDate) || "?"} → ${day(task.endDate) || "?"}`
              : "No dates set"}
            {task.status === "done" && task.completedOn
              ? ` · finished ${day(task.completedOn)}`
              : ""}
          </div>
        </div>
        {late && (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
            Late
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {STATUS_STEPS.map(({ value, label, icon: Icon }) => {
          const active = task.status === value;
          return (
            <button
              key={value}
              type="button"
              disabled={saving !== null || active}
              onClick={() => void save({ status: value }, "status")}
              className={`flex items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-semibold transition-colors ${
                active
                  ? value === "done"
                    ? "bg-emerald-500 text-white"
                    : value === "in progress"
                      ? "bg-sky-500 text-white"
                      : "bg-slate-200 text-slate-700"
                  : "bg-slate-50 text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {saving === "status" && !active ? null : <Icon className="h-3.5 w-3.5" />} {label}
            </button>
          );
        })}
      </div>

      {remarks.length > 0 && (
        <ul className="mt-3 space-y-2">
          {remarks.map((r) => (
            <li key={r.id} className="rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
              <div className="flex items-center gap-2 text-[11px] text-amber-800">
                <span className="font-semibold">{r.authorId === myId ? "You" : r.authorName}</span>
                <span className="text-amber-700/70">{remarkTime(r.createdAt)}</span>
                {r.authorId === myId && (
                  <button
                    type="button"
                    onClick={() =>
                      void onRemoveRemark(r.id).then(
                        (ok) => !ok && toast.error("Could not remove the remark"),
                      )
                    }
                    className="ml-auto text-amber-700/70"
                    aria-label="Remove remark"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="whitespace-pre-wrap break-words text-sm text-slate-700">{r.body}</div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Remark or issue (e.g. material short, drawing unclear)"
          className="w-full rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-indigo-400"
        />
        {draft.trim() && (
          <button
            type="button"
            disabled={saving !== null}
            onClick={() => void addRemark()}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white"
          >
            {saving === "remarks" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Add remark
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Site work (Commissioning & Installation) ---------- */

const SITE_STEPS: { value: SiteStatus; label: string; icon: typeof Check; on: string }[] = [
  { value: "pending", label: "Not started", icon: CircleDashed, on: "bg-slate-200 text-slate-700" },
  { value: "in progress", label: "Started", icon: Play, on: "bg-sky-500 text-white" },
  { value: "done", label: "Done", icon: Check, on: "bg-emerald-500 text-white" },
  { value: "not done", label: "Not done", icon: X, on: "bg-rose-500 text-white" },
];

function SiteTaskList({
  tasks,
  onSaved,
}: {
  tasks: SiteTask[];
  onSaved: (task: SiteTask) => void;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-lime-700">
        <HardHat className="h-3.5 w-3.5" /> Site work · Commissioning & Installation
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <SiteTaskCard key={task.id} task={task} onSaved={onSaved} />
        ))}
      </div>
    </section>
  );
}

function SiteTaskCard({ task, onSaved }: { task: SiteTask; onSaved: (task: SiteTask) => void }) {
  const [draft, setDraft] = useState(task.remarks);
  const [saving, setSaving] = useState<"status" | "remarks" | null>(null);
  const late = isSiteLate(task, todayIso());
  const changed = draft.trim() !== task.remarks.trim();

  async function save(kind: "status" | "remarks", status?: SiteStatus) {
    // "Not done" needs a reason so the person responsible knows what is pending.
    if (status === "not done" && !draft.trim()) {
      toast.error("Write the reason in the remark box first, then tap Not done");
      return;
    }
    setSaving(kind);
    const row: Database["public"]["Tables"]["commissioning_tasks"]["Update"] = {
      remarks: draft.trim(),
    };
    if (status) {
      row.status = status;
      row.completed_on = status === "done" ? todayIso() : null;
    }
    const { error } = await supabase.from("commissioning_tasks").update(row).eq("id", task.id);
    setSaving(null);
    if (error) {
      toast.error("Could not save. Check the internet and try again.");
      return;
    }
    onSaved({
      ...task,
      remarks: draft.trim(),
      ...(status
        ? { status, completedOn: status === "done" ? todayIso() : undefined }
        : {}),
    });
    toast.success(
      status === "done"
        ? "Marked done"
        : status === "not done"
          ? "Marked not done"
          : status
            ? "Status updated"
            : "Remark saved",
    );
  }

  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${late ? "ring-rose-200" : "ring-slate-200/70"}`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold text-slate-800">{task.title}</div>
          {task.details && (
            <div className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">{task.details}</div>
          )}
          <div className="mt-0.5 text-xs text-slate-500">
            {task.startDate || task.endDate
              ? `${day(task.startDate) || "?"} → ${day(task.endDate) || "?"}`
              : "No dates set"}
            {task.status === "done" && task.completedOn
              ? ` · finished ${day(task.completedOn)}`
              : ""}
          </div>
        </div>
        {late ? (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
            Late
          </span>
        ) : (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SITE_META[task.status].chip}`}
          >
            {SITE_META[task.status].label}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {SITE_STEPS.map(({ value, label, icon: Icon, on }) => {
          const active = task.status === value;
          return (
            <button
              key={value}
              type="button"
              disabled={saving !== null || active}
              onClick={() => void save("status", value)}
              className={`flex items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-semibold transition-colors ${
                active ? on : "bg-slate-50 text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Remark (e.g. client power not ready, cable short) — needed for Not done"
          className="w-full rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-lime-500"
        />
        {changed && (
          <button
            type="button"
            disabled={saving !== null}
            onClick={() => void save("remarks")}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-lime-600 py-2.5 text-sm font-semibold text-white"
          >
            {saving === "remarks" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save remark
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Drawings ---------- */

function Drawings({ orderId }: { orderId: string }) {
  const [rows, setRows] = useState<UpdateRow[] | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    void supabase
      .from("stage_updates")
      .select("*")
      .eq("inward_order_id", orderId)
      .eq("stage_name", "Design")
      .not("storage_path", "is", null)
      .neq("kind", "bom")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data ?? []) as UpdateRow[]));
  }, [orderId]);

  // Newest revision of each document first; older revisions under it.
  const documents = useMemo(() => {
    const groups = new Map<string, UpdateRow[]>();
    for (const row of rows ?? []) {
      const key = row.document_id ?? row.title ?? row.id;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return [...groups.values()];
  }, [rows]);

  async function open(row: UpdateRow) {
    if (!row.storage_path) return;
    setOpening(row.id);
    // Open the tab first so the phone does not block it as a pop-up.
    const tab = window.open("", "_blank");
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, 600);
    setOpening(null);
    if (error || !data?.signedUrl) {
      tab?.close();
      toast.error("Could not open the drawing");
      return;
    }
    if (tab) tab.location.href = data.signedUrl;
    else window.location.href = data.signedUrl;
  }

  if (!rows)
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
    );
  if (!documents.length)
    return (
      <Empty
        icon={Ruler}
        title="No drawings yet"
        text="Drawings uploaded in Design will show here."
      />
    );

  return (
    <div className="space-y-3">
      {documents.map((revisions) => {
        const [latest, ...older] = revisions;
        return (
          <div
            key={latest.id}
            className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70"
          >
            <button
              type="button"
              onClick={() => void open(latest)}
              className="flex w-full items-center gap-3 text-left"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                {opening === latest.id ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-800">
                  {latest.title || latest.file_name || "Drawing"}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {revisions.length > 1 ? `R${revisions.length - 1} · ` : ""}
                  {day(latest.created_at)}
                  {latest.remarks ? ` · ${latest.remarks}` : ""}
                </span>
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
            {older.length > 0 && (
              <details className="mt-2 text-xs text-slate-500">
                <summary className="cursor-pointer">Older revisions ({older.length})</summary>
                <ul className="mt-1 space-y-1">
                  {older.map((row, index) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => void open(row)}
                        className="text-indigo-600 underline"
                      >
                        R{older.length - index - 1} · {day(row.created_at)}
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Material ---------- */

function availability(item: ProcurementItem, today: string) {
  const state = itemState(item, today);
  if (state === "complete") return { label: "Available", tone: "bg-emerald-100 text-emerald-700" };
  if (state === "today") return { label: "Arriving today", tone: "bg-sky-100 text-sky-700" };
  if (state === "incoming")
    return { label: `Expected ${day(item.expectedDate)}`, tone: "bg-sky-100 text-sky-700" };
  if (state === "overdue")
    return { label: `Late (was due ${day(item.expectedDate)})`, tone: "bg-rose-100 text-rose-700" };
  if (state === "enquired")
    return { label: "Ordered, date not known", tone: "bg-amber-100 text-amber-800" };
  if (state === "unchecked")
    return { label: "Stock not checked yet", tone: "bg-slate-100 text-slate-600" };
  return { label: "Not available yet", tone: "bg-rose-100 text-rose-700" };
}

function Material({ orderId, work }: { orderId: string; work: MyOrder }) {
  const [items, setItems] = useState<ProcurementItem[] | null>(null);
  const today = todayIso();

  useEffect(() => {
    void supabase
      .from("procurement_items")
      .select("*")
      .eq("inward_order_id", orderId)
      .order("display_order")
      .then(({ data }) => {
        const mine = new Set(work.panels.map((p) => p.id));
        setItems(
          (data ?? [])
            .map(mapProcurement)
            .filter((item) => !item.panelId || mine.has(item.panelId)),
        );
      });
  }, [orderId, work.panels]);

  if (!items)
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-white" />
        ))}
      </div>
    );
  if (!items.length)
    return (
      <Empty
        icon={Package}
        title="No material listed"
        text="Material for your panels will show here."
      />
    );

  const groups = new Map<string, ProcurementItem[]>();
  for (const item of items) {
    const key = item.panel || "General";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const ready = items.filter((i) => itemState(i, today) === "complete").length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-slate-700">Material ready</span>
          <span className="text-sm font-bold text-indigo-600">
            {ready}/{items.length}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-indigo-500"
            style={{ width: `${Math.round((ready / items.length) * 100)}%` }}
          />
        </div>
      </div>
      {[...groups.entries()].map(([panel, list]) => (
        <section key={panel}>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
            {panel}
          </div>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
            {list.map((item) => {
              const status = availability(item, today);
              return (
                <li key={item.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800">{item.itemName}</div>
                      <div className="truncate text-xs text-slate-500">
                        {[item.make, item.model].filter(Boolean).join(" · ") || "—"}
                        {item.category ? ` · ${item.category}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-sm font-bold text-slate-700">
                      {formatQty(item.qtyRequired)} {item.unit}
                    </div>
                  </div>
                  <span
                    className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.tone}`}
                  >
                    {status.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
