import { createFileRoute, Link } from "@tanstack/react-router";
import { useProposalStore } from "@/store/proposalStore";
import { AllPages } from "@/components/pdf/AllPages";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/projects/$id/preview")({
  component: Preview,
});

function Preview() {
  const { id } = Route.useParams();
  const project = useProposalStore(s => s.projects.find(p => p.id === id));
  if (!project) return <div className="p-8">Project not found. <Link to="/" className="text-blue-700 underline">Dashboard</Link></div>;
  return (
    <div className="bg-slate-100 min-h-screen">
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-2 flex items-center gap-2">
        <Link to="/projects/$id/wizard" params={{ id }}><Button size="sm" variant="ghost"><ArrowLeft className="h-3 w-3 mr-1" />Back to wizard</Button></Link>
        <div className="flex-1 text-sm font-medium">{project.name} — Preview (24 pages)</div>
        <Button size="sm" onClick={() => window.open(`/print/${id}`, "_blank")}><Printer className="h-3 w-3 mr-1" />Print View</Button>
      </div>
      <div className="py-6">
        <AllPages project={project} />
      </div>
    </div>
  );
}
