import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useProposalStore } from "@/store/proposalStore";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Trash2,
  Archive,
  FileText,
  FileEdit,
  CheckCircle2,
  Layers,
  Plus,
  Eye,
  Printer,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Electrosoft Proposal Engine" }] }),
  component: Dashboard,
});

type StatusFilter = "All" | "Draft" | "Completed" | "Archived";

const STATUS = {
  Draft: {
    icon: FileEdit,
    chip: "bg-amber-50 text-amber-700",
    tileActive: "bg-amber-100 text-amber-600",
    tileIdle: "bg-white text-amber-500 shadow-[3px_3px_6px_#c9ccd1,-3px_-3px_6px_#ffffff]",
    ring: "ring-amber-300/50",
    glow: "hover:shadow-[0_0_0_1px_rgba(245,158,11,0.15),8px_8px_20px_#c9ccd1,-8px_-8px_20px_#ffffff]",
  },
  Completed: {
    icon: CheckCircle2,
    chip: "bg-emerald-50 text-emerald-700",
    tileActive: "bg-emerald-100 text-emerald-600",
    tileIdle: "bg-white text-emerald-500 shadow-[3px_3px_6px_#c9ccd1,-3px_-3px_6px_#ffffff]",
    ring: "ring-emerald-300/50",
    glow: "hover:shadow-[0_0_0_1px_rgba(16,185,129,0.15),8px_8px_20px_#c9ccd1,-8px_-8px_20px_#ffffff]",
  },
  Archived: {
    icon: Archive,
    chip: "bg-slate-100 text-slate-600",
    tileActive: "bg-slate-200 text-slate-600",
    tileIdle: "bg-white text-slate-400 shadow-[3px_3px_6px_#c9ccd1,-3px_-3px_6px_#ffffff]",
    ring: "ring-slate-300/50",
    glow: "hover:shadow-[0_0_0_1px_rgba(100,116,139,0.15),8px_8px_20px_#c9ccd1,-8px_-8px_20px_#ffffff]",
  },
} as const;

function Dashboard() {
  const projects = useProposalStore((s) => s.projects);
  const createProject = useProposalStore((s) => s.createProject);
  const duplicate = useProposalStore((s) => s.duplicateProject);
  const revise = useProposalStore((s) => s.reviseProject);
  const remove = useProposalStore((s) => s.deleteProject);
  const archive = useProposalStore((s) => s.archiveProject);
  const hydrateFromCloud = useProposalStore((s) => s.hydrateFromCloud);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("All");

  useEffect(() => { void hydrateFromCloud(); }, [hydrateFromCloud]);

  const handleCreate = () => {
    const p = createProject(`Proposal ${new Date().toLocaleDateString()}`);
    navigate({ to: "/projects/$id/wizard", params: { id: p.id } });
  };

  const handleRevise = (id: string) => {
    const p = revise(id);
    if (p) navigate({ to: "/projects/$id/wizard", params: { id: p.id } });
  };

  const counts = {
    Draft: projects.filter((p) => p.status === "Draft").length,
    Completed: projects.filter((p) => p.status === "Completed").length,
    Archived: projects.filter((p) => p.status === "Archived").length,
  };

  const filtered = useMemo(() => {
    return projects
      .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
      .filter((p) => filter === "All" || p.status === filter);
  }, [projects, q, filter]);

  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll<HTMLElement>("[data-neo-card]");
    gsap.fromTo(
      cards,
      { y: 20, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: "power3.out", stagger: 0.04 }
    );
  }, [filtered.length]);

  const toggleFilter = (key: StatusFilter) => {
    setFilter((current) => (current === key ? "All" : key));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create, manage and export techno-commercial proposals.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="neo-pop h-11 px-5 font-semibold !bg-transparent !text-black
                     transition-all duration-200 hover:-translate-y-0.5
                     active:translate-y-0 active:scale-[0.97] active:shadow-inner"
        >
          <Plus className="h-4 w-4 mr-1.5 text-black" />
          New Project
        </Button>
      </div>

      {/* Segmented filter control — replaces the old 3 static stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => setFilter("All")}
          className={`p-4 rounded-2xl flex items-center gap-3 text-left transition-all duration-200
                      ${filter === "All" ? "neo-inset" : "neo-surface hover:-translate-y-0.5"}`}
        >
          <div
            className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-colors
                        ${filter === "All"
                          ? "bg-indigo-100 text-indigo-600"
                          : "bg-white text-indigo-500 shadow-[3px_3px_6px_#c9ccd1,-3px_-3px_6px_#ffffff]"}`}
          >
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-slate-400">All</div>
            <div className="text-2xl font-bold text-slate-700 tabular-nums">
              {projects.length}
            </div>
          </div>
        </button>

        {(Object.keys(STATUS) as Array<keyof typeof STATUS>).map((key) => {
          const s = STATUS[key];
          const Icon = s.icon;
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              className={`p-4 rounded-2xl flex items-center gap-3 text-left transition-all duration-200
                          ${active ? "neo-inset" : "neo-surface hover:-translate-y-0.5"}`}
            >
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-colors
                            ${active ? s.tileActive : s.tileIdle}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-slate-400">{key}</div>
                <div className="text-2xl font-bold text-slate-700 tabular-nums">
                  {counts[key]}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-6 relative max-w-sm">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          placeholder="Search projects…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="neo-inset w-full pl-10 pr-4 py-2.5 text-sm bg-transparent outline-none
                     text-slate-700 placeholder:text-slate-400 transition-shadow duration-200"
        />
      </div>

      {/* Active filter indicator */}
      {filter !== "All" && (
        <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
          Showing
          <span className={`px-2.5 py-1 rounded-full font-semibold ${STATUS[filter].chip}`}>
            {filter}
          </span>
          <button
            onClick={() => setFilter("All")}
            className="text-indigo-600 hover:text-indigo-800 font-medium ml-1"
          >
            clear
          </button>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="neo-inset py-16 text-center text-slate-400 rounded-2xl">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>
            {filter === "All"
              ? "No projects yet. Create your first proposal."
              : `No ${filter.toLowerCase()} projects.`}
          </p>
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => {
            const status = STATUS[p.status as keyof typeof STATUS];
            return (
              <div
                key={p.id}
                data-neo-card
                className={`neo-surface p-5 rounded-2xl transition-all duration-300
                            hover:-translate-y-1 ${status?.glow ?? ""}`}
                onMouseMove={(e) => {
                  const el = e.currentTarget;
                  const r = el.getBoundingClientRect();
                  const rx = ((e.clientY - r.top) / r.height - 0.5) * -3;
                  const ry = ((e.clientX - r.left) / r.width - 0.5) * 3;
                  gsap.to(el, {
                    rotateX: rx,
                    rotateY: ry,
                    transformPerspective: 800,
                    duration: 0.4,
                    ease: "power2.out",
                  });
                }}
                onMouseLeave={(e) => {
                  gsap.to(e.currentTarget, { rotateX: 0, rotateY: 0, duration: 0.5, ease: "power2.out" });
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-semibold text-base truncate text-slate-800">
                    {p.name}
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide
                                px-2.5 py-1 rounded-full ${status?.chip ?? "bg-slate-100 text-slate-600"}`}
                  >
                    {p.status}
                  </span>
                </div>

                <p className="text-xs text-slate-500">
                  {p.data.systemType} · {p.data.transformer.rating}{" "}
                  {p.data.transformer.ratingUnit}, {p.data.transformer.voltage}{" "}
                  {p.data.transformer.voltageUnit}
                </p>

                <p className="text-xs text-slate-500 mt-3 mb-4">
                  {p.data.customer.companyShortName ||
                    p.data.customer.companyFullName ||
                    "No customer set"}
                  <br />
                  Updated {new Date(p.updatedAt).toLocaleDateString()}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    className="neo-pop !bg-transparent !text-black font-medium
                               transition-transform active:scale-[0.94] active:shadow-inner"
                    onClick={() => navigate({ to: "/projects/$id/wizard", params: { id: p.id } })}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="neo-pop !bg-transparent h-9 w-9 p-0
                               transition-transform active:scale-90 active:shadow-inner"
                    onClick={() => navigate({ to: "/projects/$id/preview", params: { id: p.id } })}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="neo-pop !bg-transparent h-9 w-9 p-0
                               transition-transform active:scale-90 active:shadow-inner"
                    onClick={() => window.open(`/print/${p.id}`, "_blank")}
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="neo-pop !bg-transparent h-9 w-9 p-0
                               transition-transform active:scale-90 active:shadow-inner"
                    onClick={() => duplicate(p.id)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="neo-pop !bg-transparent h-9 w-9 p-0
                               transition-transform active:scale-90 active:shadow-inner"
                    onClick={() => archive(p.id)}
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="neo-pop !bg-transparent !text-red-500 h-9 w-9 p-0 ml-auto
                               transition-transform active:scale-90 active:shadow-inner"
                    onClick={() => confirm(`Delete "${p.name}"?`) && remove(p.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
 
export default Dashboard;