import { createFileRoute } from "@tanstack/react-router";
import { useProposalStore } from "@/store/proposalStore";
import { AllPages } from "@/components/pdf/AllPages";
import { useEffect } from "react";

export const Route = createFileRoute("/print/$id")({
  component: Print,
});

function Print() {
  const { id } = Route.useParams();
  const project = useProposalStore(s => s.projects.find(p => p.id === id));
  useEffect(() => {
    document.body.classList.add("print-mode");
    return () => document.body.classList.remove("print-mode");
  }, []);
  if (!project) return <div style={{ padding: 40 }}>Project not found.</div>;
  return (
    <div className="bg-white">
      <AllPages project={project} />
    </div>
  );
}
