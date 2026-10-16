import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CalendarClock, CalendarCheck, CheckCircle2, Factory, PackageCheck, Search, User,
} from "lucide-react";
import { useProposalStore, type InwardOrder } from "@/store/proposalStore";
import { supabase } from "@/lib/db";
import { STAGE_NAMES, STAGE_PAGES, STAGE_SLUGS, type StageStatus } from "@/lib/stages";
import { STAGE_THEME } from "@/lib/stageTheme";
import { StatTile } from "@/components/StatTile";
import { todayIso } from "@/lib/procurement";

export const Route = createFileRoute("/inward-orders/")({
  head: () => ({
    meta: [
      { title: "Inward Orders — Electrosoft Proposal Engine" },
      { name: "description", content: "Works orders created from won transformer testing system quotations." },
      { property: "og:title", content: "Inward Orders — Electrosoft Proposal Engine" },
      { property: "og:description", content: "Works orders created from won transformer testing system quotations." },
    ],
  }),
  component: InwardOrders,
});

type Filter = "all" | InwardOrder["status"] | "due" | "active";

const STATUS_META: Record<InwardOrder["status"], { chip: string; accent: string }> = {
  Open: { chip: "bg-indigo-50 text-indigo-700", accent: "from-indigo-400 to-violet-500" },
  "In Progress": { chip: "bg-amber-50 text-amber-700", accent: "from-amber-400 to-orange-500" },
  Completed: { chip: "bg-emerald-50 text-emerald-700", accent: "from-emerald-400 to-teal-500" },
};


function daysUntil(date: string) {
  const ms = new Date(`${date}T00:00:00`).getTime() - new Date(`${todayIso()}T00:00:00`).getTime();
  return Math.round(ms / 86_400_000);
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function isDueSoon(o: InwardOrder) {
  return o.status !== "Completed" && Boolean(o.dueDate) && daysUntil(o.dueDate) <= 7;
}

function percentDone(statuses: Record<string, StageStatus>) {
  const score = Object.values(statuses).reduce(
    (sum, s) => sum + (s === "done" ? 1 : s === "in progress" ? 0.5 : 0),
    0,
  );
  return Math.round((score / STAGE_NAMES.length) * 100);
}

function InwardOrders() {
  const orders = useProposalStore((s) => s.inwardOrders);
  const hydrate = useProposalStore((s) => s.hydrateInwardOrders);
  const [stageMap, setStageMap] = useState<Record<string, Record<string, StageStatus>>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => { void hydrate(); }, [hydrate]);
  useEffect(() => {
    void supabase.from("project_stages").select("inward_order_id, stage_name, status").then(({ data }) => {
      const map: Record<string, Record<string, StageStatus>> = {};
      for (const row of data ?? []) (map[row.inward_order_id] ??= {})[row.stage_name] = row.status as StageStatus;
      setStageMap(map);
    });
  }, []);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders
      .filter((o) =>
        filter === "all" ? true
          : filter === "due" ? isDueSoon(o)
            : filter === "active" ? o.status !== "Completed"
              : o.status === filter,
      )
      .filter(
        (o) =>
          !needle ||
          [o.projectNumber, o.projectName, o.customerName, o.supervisor, o.poNumber]
            .some((v) => (v ?? "").toLowerCase().includes(needle)),
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [orders, query, filter]);

  const count = (status: InwardOrder["status"]) => orders.filter((o) => o.status === status).length;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Inward Orders</h1>
        <p className="mt-1 text-sm text-slate-500">Won quotations moving through design, production and dispatch.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={PackageCheck} label="All orders" value={orders.length} tone="text-indigo-600 bg-indigo-50" active={filter === "all"} onClick={() => setFilter("all")} />
        <StatTile icon={Factory} label="Active (open + in progress)" value={orders.length - count("Completed")} tone="text-amber-600 bg-amber-50" active={filter === "active"} onClick={() => setFilter("active")} />
        <StatTile icon={CalendarClock} label="Due in 7 days or late" value={orders.filter(isDueSoon).length} tone="text-rose-600 bg-rose-50" active={filter === "due"} onClick={() => setFilter("due")} />
        <StatTile icon={CheckCircle2} label="Completed" value={count("Completed")} tone="text-emerald-600 bg-emerald-50" active={filter === "Completed"} onClick={() => setFilter("Completed")} />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="neo-inset flex min-w-0 flex-1 basis-56 items-center gap-2 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            data-no-neo
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Search project, customer, PO or supervisor"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="neo-inset flex flex-wrap rounded-xl p-1 text-xs font-medium">
          {(["all", "Open", "In Progress", "Completed"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 transition-colors ${filter === f ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="neo-surface rounded-3xl py-20 text-center">
          <PackageCheck className="mx-auto mb-3 h-12 w-12 text-indigo-300" />
          <p className="font-semibold text-slate-700">No inward orders yet</p>
          <p className="mt-1 text-sm text-slate-500">Move a completed quotation here to start tracking it.</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="neo-surface rounded-3xl py-16 text-center text-sm text-slate-500">No orders match this view.</div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((o) => (
            <OrderCard key={o.id} order={o} statuses={stageMap[o.id] ?? {}} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order: o, statuses }: { order: InwardOrder; statuses: Record<string, StageStatus> }) {
  const meta = STATUS_META[o.status] ?? STATUS_META.Open;
  const percent = percentDone(statuses);
  const days = o.dueDate && o.status !== "Completed" ? daysUntil(o.dueDate) : undefined;
  return (
    <Link
      to="/inward-orders/$id"
      params={{ id: o.id }}
      className="group neo-surface relative block overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${meta.accent}`} />
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-xs font-semibold text-slate-500" title={o.projectNumber}>
              {o.projectNumber}
            </span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.chip}`}>
              {o.status}
            </span>
          </div>
          <p className="mt-1 truncate text-base font-semibold text-slate-800 group-hover:text-indigo-700">
            {o.projectName || "Untitled project"}
          </p>
          <p className="truncate text-xs text-slate-500">{o.customerName || "No customer"}</p>
        </div>
        <MiniRing value={percent} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50/80 px-3 py-2">
          <div className="flex items-center gap-1 text-slate-400"><User className="h-3 w-3" /> Supervisor</div>
          <div className="mt-0.5 truncate font-medium text-slate-700">{o.supervisor || "—"}</div>
        </div>
        <div className={`rounded-xl px-3 py-2 ${days !== undefined && days < 0 ? "bg-rose-50" : days !== undefined && days <= 7 ? "bg-amber-50" : "bg-slate-50/80"}`}>
          <div className="flex items-center gap-1 text-slate-400">
            {days !== undefined && days < 0 ? <AlertTriangle className="h-3 w-3 text-rose-500" /> : <CalendarCheck className="h-3 w-3" />} Due
          </div>
          <div className="mt-0.5 truncate font-medium text-slate-700">
            {formatDate(o.dueDate)}
            {days !== undefined && (
              <span className={`ml-1 font-semibold ${days < 0 ? "text-rose-600" : days <= 7 ? "text-amber-700" : "text-slate-400"}`}>
                {days < 0 ? `${-days}d late` : days === 0 ? "today" : `${days}d`}
              </span>
            )}
          </div>
        </div>
      </div>

      <StageStrip statuses={statuses} />
    </Link>
  );
}

function MiniRing({ value }: { value: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-12 w-12 shrink-0 place-items-center" title={`${value}% complete`}>
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="5" className="stroke-slate-200" />
        <circle
          cx="22" cy="22" r={r} fill="none" strokeWidth="5" strokeLinecap="round"
          stroke="url(#mini-ring)" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
        <defs>
          <linearGradient id="mini-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-[11px] font-bold text-slate-700">{value}%</span>
    </div>
  );
}

// Seven segments in the stage colours: full when done, half when in progress.
function StageStrip({ statuses }: { statuses: Record<string, StageStatus> }) {
  const current = STAGE_SLUGS.find((slug) => statuses[STAGE_PAGES[slug].name] === "in progress");
  const Icon = current ? STAGE_THEME[current].icon : null;
  return (
    <div className="mt-4">
      <div className="flex gap-1">
        {STAGE_SLUGS.map((slug) => {
          const status = statuses[STAGE_PAGES[slug].name] ?? "not started";
          return (
            <span key={slug} title={`${STAGE_PAGES[slug].name}: ${status}`} className="neo-inset h-1.5 flex-1 overflow-hidden rounded-full">
              <span
                className={`block h-full rounded-full bg-gradient-to-r ${STAGE_THEME[slug].bar} transition-[width] duration-700`}
                style={{ width: status === "done" ? "100%" : status === "in progress" ? "50%" : "0%" }}
              />
            </span>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
        {current && Icon ? (
          <>
            <Icon className={`h-3.5 w-3.5 ${STAGE_THEME[current].text}`} />
            Now: <span className={`font-semibold ${STAGE_THEME[current].text}`}>{STAGE_PAGES[current].name}</span>
          </>
        ) : Object.values(statuses).length && Object.values(statuses).every((s) => s === "done") ? (
          <span className="font-semibold text-emerald-600">All stages done</span>
        ) : (
          "Not started"
        )}
      </div>
    </div>
  );
}
