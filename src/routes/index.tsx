import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useProposalStore } from "@/store/proposalStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Trash2, Archive, FileText, Plus, Eye, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import gsap from "gsap";


export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Electrosoft Proposal Engine" }] }),
  component: Dashboard,
});

function Dashboard() {
  const projects = useProposalStore(s => s.projects);
  const createProject = useProposalStore(s => s.createProject);
  const duplicate = useProposalStore(s => s.duplicateProject);
  const remove = useProposalStore(s => s.deleteProject);
  const archive = useProposalStore(s => s.archiveProject);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const handleCreate = () => {
    const p = createProject(`Proposal ${new Date().toLocaleDateString()}`);
    navigate({ to: "/projects/$id/wizard", params: { id: p.id } });
  };



  const filtered = projects.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
  const counts = {
    draft: projects.filter(p => p.status === "Draft").length,
    completed: projects.filter(p => p.status === "Completed").length,
    archived: projects.filter(p => p.status === "Archived").length,
  };

  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll<HTMLElement>("[data-neo-card]");
    gsap.fromTo(
      cards,
      { y: 24, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: "power3.out", stagger: 0.06 },
    );
  }, [filtered.length]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-br from-slate-800 to-indigo-600 bg-clip-text text-transparent">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, manage and export techno-commercial proposals.</p>
        </div>
        <Button onClick={handleCreate} className="neo-pop !bg-transparent !text-indigo-700 hover:!text-indigo-900 h-11 px-5 font-semibold">
          <Plus className="h-4 w-4 mr-1" />New Project
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Drafts" value={counts.draft} accent="from-amber-400 to-orange-500" />
        <StatCard label="Completed" value={counts.completed} accent="from-emerald-400 to-teal-500" />
        <StatCard label="Archived" value={counts.archived} accent="from-slate-400 to-slate-600" />
      </div>

      <div className="mb-5">
        <input
          placeholder="Search projects…"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="neo-inset max-w-sm w-full px-4 py-2.5 text-sm bg-transparent outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="neo-surface py-16 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No projects yet. Create your first proposal.</p>
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(p => (
            <div
              key={p.id}
              data-neo-card
              className="neo-surface p-5 transition-transform hover:-translate-y-1 duration-300"
              onMouseMove={e => {
                const el = e.currentTarget;
                const r = el.getBoundingClientRect();
                const rx = ((e.clientY - r.top) / r.height - 0.5) * -4;
                const ry = ((e.clientX - r.left) / r.width - 0.5) * 4;
                gsap.to(el, { rotateX: rx, rotateY: ry, transformPerspective: 800, duration: 0.4, ease: "power2.out" });
              }}
              onMouseLeave={e => { gsap.to(e.currentTarget, { rotateX: 0, rotateY: 0, duration: 0.5, ease: "power2.out" }); }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-semibold text-base truncate text-slate-800">{p.name}</div>
                <Badge variant={p.status === "Draft" ? "secondary" : p.status === "Completed" ? "default" : "outline"}>{p.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{p.data.systemType} · {p.data.transformer.rating} {p.data.transformer.ratingUnit}, {p.data.transformer.voltage} {p.data.transformer.voltageUnit}</p>
              <p className="text-xs text-muted-foreground mt-3 mb-4">
                {p.data.customer.companyShortName || p.data.customer.companyFullName || "No customer set"}
                <br />Updated {new Date(p.updatedAt).toLocaleDateString()}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" className="neo-pop !bg-transparent !text-indigo-700" onClick={() => navigate({ to: "/projects/$id/wizard", params: { id: p.id } })}>Edit</Button>
                <Button size="sm" variant="ghost" className="neo-pop !bg-transparent" onClick={() => navigate({ to: "/projects/$id/preview", params: { id: p.id } })}><Eye className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" className="neo-pop !bg-transparent" onClick={() => window.open(`/print/${p.id}`, "_blank")}><Printer className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" className="neo-pop !bg-transparent" onClick={() => duplicate(p.id)}><Copy className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" className="neo-pop !bg-transparent" onClick={() => archive(p.id)}><Archive className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" className="neo-pop !bg-transparent !text-destructive" onClick={() => confirm(`Delete "${p.name}"?`) && remove(p.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="neo-surface p-5 flex items-center justify-between">
      <div>
        <div className="text-[11px] text-muted-foreground uppercase tracking-widest">{label}</div>
        <div className={`text-4xl font-bold bg-gradient-to-br ${accent} bg-clip-text text-transparent`}>{value}</div>
      </div>
      <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${accent} opacity-80 shadow-inner`} />
    </div>
  );
}

