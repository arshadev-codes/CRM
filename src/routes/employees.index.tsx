import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Briefcase, Coffee, Plus, Search, Star, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/Can";
import { EmployeeFormDialog } from "@/components/employees/EmployeeFormDialog";
import { Avatar } from "@/components/stages/AssigneePicker";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/StatTile";
import { Stars } from "@/components/employees/Stars";
import { useEmployeeDirectory, type EmployeeSummary } from "@/components/employees/useEmployeeDirectory";

export const Route = createFileRoute("/employees/")({
  head: () => ({
    meta: [
      { title: "Employees — Electrosoft Proposal Engine" },
      { name: "description", content: "Who is working on what, who is free, and how everyone is scoring." },
    ],
  }),
  component: EmployeesPage,
});

type Filter = "all" | "busy" | "available";
type Sort = "points" | "rating" | "name" | "workload";

function EmployeesPage() {
  const { summaries, loading, error, reload, orderLabel } = useEmployeeDirectory();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("points");
  const [showInactive, setShowInactive] = useState(false);
  const [adding, setAdding] = useState(false);

  const active = summaries.filter((s) => s.employee.active !== false);
  const rated = active.filter((s) => s.score.ratings.count);
  const avgRating = rated.length
    ? rated.reduce((sum, s) => sum + s.score.avgStars, 0) / rated.length
    : 0;

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return summaries
      .filter((s) => showInactive || s.employee.active !== false)
      .filter((s) => (filter === "busy" ? s.busy : filter === "available" ? !s.busy : true))
      .filter(
        (s) =>
          !needle ||
          s.employee.name.toLowerCase().includes(needle) ||
          s.employee.designation.toLowerCase().includes(needle) ||
          (s.employee.department ?? "").toLowerCase().includes(needle),
      )
      .sort((a, b) => {
        if (sort === "name") return a.employee.name.localeCompare(b.employee.name);
        if (sort === "rating") return b.score.avgStars - a.score.avgStars || b.score.total - a.score.total;
        if (sort === "workload") return b.current.length - a.current.length;
        return b.score.total - a.score.total;
      });
  }, [summaries, query, filter, sort, showInactive]);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Employees</h1>
          <p className="mt-1 text-sm text-slate-500">
            Who is working on what, who is free, and how everyone is scoring.
          </p>
        </div>
        <Can perm="employees">
          <Button className="rounded-xl" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add employee
          </Button>
        </Can>
      </div>
      {adding && <EmployeeFormDialog onClose={() => setAdding(false)} />}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Users} label="Employees" value={active.length} tone="text-indigo-600 bg-indigo-50" onClick={() => setFilter("all")} />
        <StatTile
          icon={Briefcase}
          label="Busy"
          value={loading ? "…" : active.filter((s) => s.busy).length}
          tone="text-sky-600 bg-sky-50"
          onClick={() => setFilter("busy")}
        />
        <StatTile
          icon={Coffee}
          label="Available (no work)"
          value={loading ? "…" : active.filter((s) => !s.busy).length}
          tone="text-emerald-600 bg-emerald-50"
          onClick={() => setFilter("available")}
        />
        <StatTile
          icon={Star}
          label="Average rating"
          value={rated.length ? avgRating.toFixed(1) : "—"}
          tone="text-amber-600 bg-amber-50"
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="neo-inset flex min-w-0 flex-1 basis-56 items-center gap-2 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Search name, designation, department"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="neo-inset flex rounded-xl p-1 text-xs font-medium">
          {(["all", "busy", "available"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 capitalize transition-colors ${filter === f ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <select
          className="neo-inset px-3 py-2 text-xs outline-none"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Sort by"
        >
          <option value="points">Sort: Points</option>
          <option value="rating">Sort: Rating</option>
          <option value="workload">Sort: Workload</option>
          <option value="name">Sort: Name</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Show inactive
        </label>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Couldn't load work assignments ({error}). Ratings are still shown.
          <button type="button" className="ml-auto font-semibold underline" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="neo-surface rounded-2xl py-16 text-center text-slate-500">No employees match.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((s) => (
            <EmployeeCard key={s.employee.id} s={s} loading={loading} orderLabel={orderLabel} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmployeeCard({
  s,
  loading,
  orderLabel,
}: {
  s: EmployeeSummary;
  loading: boolean;
  orderLabel: (id: string) => string;
}) {
  const { employee, current, score } = s;
  const next = current[0];
  const overdue = current.filter((w) => w.late).length;
  const inactive = employee.active === false;
  return (
    <Link
      to="/employees/$id"
      params={{ id: employee.id }}
      className={`neo-surface block rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${inactive ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <Avatar name={employee.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-slate-800">{employee.name}</div>
          <div className="truncate text-xs text-slate-500">
            {[employee.designation, employee.department].filter(Boolean).join(" · ") || "No designation"}
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-6 w-16 rounded-full" />
        ) : inactive ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Inactive
          </span>
        ) : (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${s.busy ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-700"}`}
          >
            {s.busy ? "Busy" : "Available"}
          </span>
        )}
      </div>

      <div className="mt-4 min-h-[2.75rem] rounded-xl bg-slate-50/70 px-3 py-2 text-xs">
        {loading ? (
          <Skeleton className="h-4 w-3/4" />
        ) : next ? (
          <>
            <div className="flex items-center gap-2 text-slate-500">
              {current.length} open item{current.length === 1 ? "" : "s"}
              {overdue > 0 && (
                <span className="rounded-full bg-rose-50 px-1.5 font-semibold text-rose-600">{overdue} overdue</span>
              )}
            </div>
            <div className="mt-0.5 truncate text-slate-700">
              {next.title} · {next.context} · {orderLabel(next.orderId)}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center text-emerald-700">No work assigned. Ready for a new task.</div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-slate-500">
          <Stars value={score.avgStars} size={13} />
          {score.ratings.count ? `${score.avgStars.toFixed(1)} (${score.ratings.count})` : "Not rated"}
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-slate-700">
          {score.total > 0 && s.rank > 0 && s.rank <= 3 && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
          {score.total} pts
        </span>
      </div>
    </Link>
  );
}
