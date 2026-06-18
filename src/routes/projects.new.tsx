import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useProposalStore } from "@/store/proposalStore";

export const Route = createFileRoute("/projects/new")({
  component: NewProject,
});

function NewProject() {
  const create = useProposalStore(s => s.createProject);
  const navigate = useNavigate();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const p = create(`Proposal ${new Date().toLocaleDateString()}`);
    navigate({ to: "/projects/$id/wizard", params: { id: p.id }, replace: true });
  }, [create, navigate]);
  return <div className="p-8">Creating new project…</div>;
}
