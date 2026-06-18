import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useProposalStore } from "@/store/proposalStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Trash2, Archive, FileText, Plus, Eye, Printer } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Electrosoft Proposal Engine" }] }),
  component: Dashboard,
});

function Dashboard() {
  const projects = useProposalStore(s => s.projects);
  const duplicate = useProposalStore(s => s.duplicateProject);
  const remove = useProposalStore(s => s.deleteProject);
  const archive = useProposalStore(s => s.archiveProject);
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const filtered = projects.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
  const counts = {
    draft: projects.filter(p => p.status === "Draft").length,
    completed: projects.filter(p => p.status === "Completed").length,
    archived: projects.filter(p => p.status === "Archived").length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-muted-foreground">Create, manage and export techno-commercial proposals.</p>
        </div>
        <Link to="/projects/new"><Button><Plus className="h-4 w-4 mr-1" />New Project</Button></Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Drafts" value={counts.draft} color="bg-amber-100 text-amber-800" />
        <StatCard label="Completed" value={counts.completed} color="bg-emerald-100 text-emerald-800" />
        <StatCard label="Archived" value={counts.archived} color="bg-slate-200 text-slate-700" />
      </div>

      <div className="mb-4">
        <Input placeholder="Search projects…" value={q} onChange={e => setQ(e.target.value)} className="max-w-sm" />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No projects yet. Create your first proposal.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base truncate">{p.name}</CardTitle>
                  <Badge variant={p.status === "Draft" ? "secondary" : p.status === "Completed" ? "default" : "outline"}>{p.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{p.data.systemType} · {p.data.transformer.rating} {p.data.transformer.ratingUnit}, {p.data.transformer.voltage} {p.data.transformer.voltageUnit}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-3">
                  {p.data.customer.companyShortName || p.data.customer.companyFullName || "No customer set"}
                  <br />Updated {new Date(p.updatedAt).toLocaleDateString()}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="default" onClick={() => navigate({ to: "/projects/$id/wizard", params: { id: p.id } })}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => navigate({ to: "/projects/$id/preview", params: { id: p.id } })}><Eye className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(`/print/${p.id}`, "_blank")}><Printer className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicate(p.id)}><Copy className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => archive(p.id)}><Archive className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm(`Delete "${p.name}"?`) && remove(p.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="text-3xl font-bold">{value}</div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}>{label}</div>
      </CardContent>
    </Card>
  );
}
