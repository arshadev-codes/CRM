import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight, ChevronDown, History, Loader2, Lock, LogIn, Pencil, Plus, Search, Trash2,
} from "lucide-react";
import { supabase as cloud } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/initials";
import { useAuthMode, useAuthStore, useCurrentUser } from "@/store/authStore";

export const Route = createFileRoute("/admin/activity")({
  head: () => ({ meta: [{ title: "Activity log — Electrosoft Proposal Engine" }] }),
  component: ActivityPage,
});

type LogRow = Database["public"]["Tables"]["audit_log"]["Row"];
type Change = { from?: unknown; to?: unknown };

const PAGE = 50;

const SECTIONS: Record<string, string> = {
  projects: "Quotation",
  inward_orders: "Inward order",
  project_stages: "Order stage",
  inward_order_attachments: "Order attachment",
  stage_updates: "Stage update / file",
  procurement_items: "Procurement item",
  inventory_items: "Inventory item",
  fabrication_jobs: "Fabrication",
  production_panels: "Production panel",
  production_tasks: "Production task",
  test_items: "Testing",
  qa_sessions: "QA session",
  mom_points: "MOM point",
  inspection_outcomes: "Inspection",
  dispatch_details: "Dispatch",
  pdi_reports: "PDI report",
  dcc_registry: "DCC",
  profiles: "User account",
  event: "Sign in / out",
};

const ACTIONS: Record<string, { label: string; icon: typeof Plus; tone: string }> = {
  insert: { label: "Added", icon: Plus, tone: "bg-emerald-50 text-emerald-700" },
  update: { label: "Changed", icon: Pencil, tone: "bg-sky-50 text-sky-700" },
  delete: { label: "Deleted", icon: Trash2, tone: "bg-rose-50 text-rose-700" },
  event: { label: "Event", icon: LogIn, tone: "bg-violet-50 text-violet-700" },
};

const RANGES = [
  { key: "1", label: "Today" },
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "all", label: "All time" },
] as const;

const humanize = (key: string) => {
  const text = key.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}

// Flattens {field: {from, to}} and one nested level {field: {sub: {from, to}}} into lines.
function changeLines(changes: Record<string, unknown>): { field: string; from: unknown; to: unknown }[] {
  const lines: { field: string; from: unknown; to: unknown }[] = [];
  for (const [field, value] of Object.entries(changes)) {
    const change = value as Change & Record<string, unknown>;
    if (change && typeof change === "object" && ("from" in change || "to" in change)) {
      lines.push({ field: humanize(field), from: change.from, to: change.to });
    } else if (change && typeof change === "object") {
      for (const [sub, inner] of Object.entries(change)) {
        const c = inner as Change;
        lines.push({ field: `${humanize(field)} › ${humanize(sub)}`, from: c?.from, to: c?.to });
      }
    }
  }
  return lines;
}

const HIDDEN_ROW_KEYS = new Set(["id", "created_at", "updated_at", "inward_order_id"]);

function rowLines(row: Record<string, unknown>) {
  return Object.entries(row)
    .filter(([key, value]) => !HIDDEN_ROW_KEYS.has(key) && value !== null && value !== "")
    .map(([key, value]) => ({ field: humanize(key), value }));
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

function ActivityPage() {
  const me = useCurrentUser();
  const mode = useAuthMode();
  const users = useAuthStore((s) => s.users);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [person, setPerson] = useState("");
  const [section, setSection] = useState("");
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("7");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  // Search waits for a pause in typing.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(
    async (offset: number) => {
      setLoading(true);
      let request = cloud
        .from("audit_log")
        .select("*")
        .order("at", { ascending: false })
        .range(offset, offset + PAGE - 1);
      if (person) request = request.eq("actor_id", person);
      if (section) request = request.eq("table_name", section);
      if (range !== "all") {
        const since = new Date();
        since.setHours(0, 0, 0, 0);
        since.setDate(since.getDate() - (Number(range) - 1));
        request = request.gte("at", since.toISOString());
      }
      if (search) request = request.or(`label.ilike.%${search.replace(/[%,()]/g, "")}%,actor_name.ilike.%${search.replace(/[%,()]/g, "")}%`);
      const { data, error: failure } = await request;
      setLoading(false);
      if (failure) {
        setError("Could not load the activity log.");
        return;
      }
      setError(null);
      setRows((current) => (offset === 0 ? (data ?? []) : [...current, ...(data ?? [])]));
      setMore((data?.length ?? 0) === PAGE);
    },
    [person, section, range, search],
  );

  useEffect(() => {
    if (me?.isAdmin && mode === "cloud") void load(0);
  }, [load, me?.isAdmin, mode]);

  const groups = useMemo(() => {
    const byDay: { day: string; items: LogRow[] }[] = [];
    for (const row of rows) {
      const day = dayLabel(row.at);
      const last = byDay[byDay.length - 1];
      if (last?.day === day) last.items.push(row);
      else byDay.push({ day, items: [row] });
    }
    return byDay;
  }, [rows]);

  if (!me?.isAdmin) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-6">
        <div className="neo-surface max-w-sm rounded-3xl p-10 text-center">
          <Lock className="mx-auto h-10 w-10 text-slate-400" />
          <h1 className="mt-4 text-lg font-bold text-slate-800">Admins only</h1>
          <p className="mt-1 text-sm text-slate-500">Only an admin can see the activity log.</p>
          <Link to="/" className="mt-6 inline-block text-sm font-semibold text-indigo-600">Go home</Link>
        </div>
      </div>
    );
  }

  const selectClass = "neo-inset h-10 rounded-xl px-3 text-sm text-slate-700 outline-none";

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Activity log</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every change anyone makes is recorded here: who, what and when. Only admins can see it,
          and nobody can edit or delete it.
        </p>
      </div>

      {mode !== "cloud" && (
        <div className="mb-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          The activity log needs the cloud sign-in. It is not available in browser-only mode.
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="neo-inset flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-xl px-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            data-no-neo
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Search project no., item, name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className={selectClass} value={person} onChange={(e) => setPerson(e.target.value)} aria-label="Person">
          <option value="">Everyone</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className={selectClass} value={section} onChange={(e) => setSection(e.target.value)} aria-label="Section">
          <option value="">All sections</option>
          {Object.entries(SECTIONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <div className="neo-inset flex h-10 items-center gap-1 rounded-xl p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`h-8 rounded-lg px-3 text-xs font-semibold transition-colors ${range === r.key ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

      {!loading && rows.length === 0 && !error ? (
        <div className="neo-surface flex flex-col items-center rounded-3xl px-6 py-16 text-center">
          <History className="h-10 w-10 text-slate-300" />
          <div className="mt-3 font-semibold text-slate-700">Nothing recorded for these filters</div>
          <div className="text-sm text-slate-500">Changes will show up here as people work.</div>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.day}>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{group.day}</div>
              <ul className="neo-surface divide-y divide-slate-200/60 overflow-hidden rounded-2xl">
                {group.items.map((row) => <Entry key={row.id} row={row} />)}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-center">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        ) : (
          more && <Button variant="outline" onClick={() => void load(rows.length)}>Load older</Button>
        )}
      </div>
    </div>
  );
}

function Entry({ row }: { row: LogRow }) {
  const [open, setOpen] = useState(false);
  const action = ACTIONS[row.action] ?? ACTIONS.event;
  const Icon = action.icon;
  const changes = (row.changes ?? {}) as Record<string, unknown>;
  const fullRow = (changes.row ?? null) as Record<string, unknown> | null;
  const lines = row.action === "update" ? changeLines(changes) : [];
  const details = fullRow ? rowLines(fullRow) : [];
  const shown = open ? lines : lines.slice(0, 3);
  const expandable = lines.length > 3 || details.length > 0;
  const section = row.action === "event" ? row.label : SECTIONS[row.table_name] ?? humanize(row.table_name);

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[11px] font-bold text-white">
          {row.actor_name ? initials(row.actor_name) : "?"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold text-slate-800">{row.actor_name || "Unknown (not signed in)"}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${action.tone}`}>
              <Icon className="h-3 w-3" /> {action.label}
            </span>
            <span className="text-slate-600">{section}</span>
            {row.action !== "event" && row.label && (
              <span className="truncate font-medium text-slate-800">{row.label}</span>
            )}
            {row.order_id && (
              <Link
                to="/inward-orders/$id"
                params={{ id: row.order_id }}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Open order
              </Link>
            )}
            <span className="ml-auto shrink-0 text-xs text-slate-400">
              {new Date(row.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          {shown.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-xs">
              {shown.map((line) => (
                <li key={line.field} className="flex flex-wrap items-center gap-1.5 text-slate-500">
                  <span className="font-medium text-slate-600">{line.field}:</span>
                  <span className="rounded bg-rose-50 px-1 text-rose-700 line-through decoration-rose-300">{show(line.from)}</span>
                  <ArrowRight className="h-3 w-3 text-slate-300" />
                  <span className="rounded bg-emerald-50 px-1 text-emerald-700">{show(line.to)}</span>
                </li>
              ))}
            </ul>
          )}

          {open && details.length > 0 && (
            <dl className="mt-2 grid gap-x-4 gap-y-0.5 rounded-xl bg-slate-50 px-3 py-2 text-xs sm:grid-cols-2">
              {details.map((d) => (
                <div key={d.field} className="flex min-w-0 gap-1.5">
                  <dt className="shrink-0 text-slate-500">{d.field}:</dt>
                  <dd className="truncate text-slate-700">{show(d.value)}</dd>
                </div>
              ))}
            </dl>
          )}

          {expandable && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
              {open ? "Less" : lines.length > 3 ? `${lines.length - 3} more change${lines.length - 3 === 1 ? "" : "s"}` : "Details"}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
