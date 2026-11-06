import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useProposalStore } from "@/store/proposalStore";
import { AllPages } from "@/components/pdf/AllPages";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, ArrowUp, ArrowDown, Eye, EyeOff, Pencil, RotateCcw, Check, Save } from "lucide-react";
import { resolveLayout, SECTION_BY_ID, type ProposalLayout } from "@/data/proposalLayout";
import { toast } from "sonner";

export const Route = createFileRoute("/projects/$id/preview")({
  component: Preview,
});

function Preview() {
  const { id } = Route.useParams();
  const project = useProposalStore(s => s.projects.find(p => p.id === id));
  const setProjectLayout = useProposalStore(s => s.setProjectLayout);
  const saveProjectTemplate = useProposalStore(s => s.saveProjectTemplate);
  const [arranging, setArranging] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const layout = useMemo(() => resolveLayout(project?.data.layout), [project?.data.layout]);

  if (!project) return <div className="p-8">Project not found. <Link to="/" className="text-blue-700 underline">Dashboard</Link></div>;

  const commit = (next: ProposalLayout) => setProjectLayout(project.id, next);

  const move = (index: number, dir: -1 | 1) => {
    const sections = [...layout.sections];
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    commit({ ...layout, sections });
  };

  const toggle = (index: number) => {
    const sections = layout.sections.map((s, i) => i === index ? { ...s, enabled: !s.enabled } : s);
    commit({ ...layout, sections });
  };

  const resetSection = (sectionId: string) => {
    const htmlOverrides = { ...layout.htmlOverrides };
    delete htmlOverrides[sectionId];
    commit({ ...layout, htmlOverrides });
    toast.success("Section restored to its original content");
  };

  const onSectionCommit = (sectionId: string, html: string) => {
    commit({ ...layout, htmlOverrides: { ...layout.htmlOverrides, [sectionId]: html } });
  };

  const activeCount = layout.sections.filter(s => s.enabled).length;

  return (
    <div className="bg-slate-100 min-h-screen">
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-2 flex items-center gap-2">
        <Link to="/projects/$id/wizard" params={{ id }}><Button size="sm" variant="ghost"><ArrowLeft className="h-3 w-3 mr-1" />Back to wizard</Button></Link>
        <div className="flex-1 text-sm font-medium truncate">
          {project.data.meta.offerNumber || project.name} — Preview ({activeCount} sections)
        </div>
        <Button size="sm" variant={arranging ? "default" : "outline"} onClick={() => { setArranging(a => !a); setEditing(null); }}>
          {arranging ? <><Check className="h-3 w-3 mr-1" />Done arranging</> : <><Pencil className="h-3 w-3 mr-1" />Arrange & Edit</>}
        </Button>
        <Button size="sm" onClick={() => window.open(`/print/${id}`, "_blank")}><Printer className="h-3 w-3 mr-1" />Print View</Button>
      </div>

      <div className="flex gap-4 py-6 px-4">
        {arranging && (
          <aside className="w-72 shrink-0">
            <div className="sticky top-16 neo-surface rounded-2xl p-4 bg-white">
              <div className="text-sm font-semibold text-slate-700 mb-1">Sections</div>
              <p className="text-[11px] text-slate-500 mb-3">
                Reorder, hide, or click a section in the page to type directly into it.
              </p>
              <div className="space-y-1.5">
                {layout.sections.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-1 text-xs">
                    <span className={`flex-1 truncate ${s.enabled ? "text-slate-700" : "text-slate-400 line-through"}`}>
                      {SECTION_BY_ID[s.id]?.label ?? s.id}
                    </span>
                    <button className="p-1 hover:text-blue-600" onClick={() => move(i, -1)} title="Move up"><ArrowUp className="h-3 w-3" /></button>
                    <button className="p-1 hover:text-blue-600" onClick={() => move(i, 1)} title="Move down"><ArrowDown className="h-3 w-3" /></button>
                    <button className="p-1 hover:text-blue-600" onClick={() => toggle(i)} title={s.enabled ? "Hide" : "Show"}>
                      {s.enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </button>
                    <button
                      className={`p-1 ${editing === s.id ? "text-blue-600" : "hover:text-blue-600"}`}
                      onClick={() => setEditing(editing === s.id ? null : s.id)}
                      title="Edit text in this section"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    {layout.htmlOverrides[s.id] != null && (
                      <button className="p-1 text-amber-600 hover:text-amber-700" onClick={() => resetSection(s.id)} title="Restore original">
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-4"
                onClick={() => {
                  const name = window.prompt("Save this arrangement as a reusable template. Name:");
                  if (!name) return;
                  saveProjectTemplate(name, { ...layout, htmlOverrides: {} });
                  toast.success(`Template "${name}" saved`);
                }}
              >
                <Save className="h-3 w-3 mr-1" />Save as template
              </Button>
            </div>
          </aside>
        )}

        <div className="flex-1 min-w-0">
          <AllPages
            project={project}
            layout={layout}
            editableSectionId={arranging ? editing : null}
            onSectionCommit={onSectionCommit}
          />
        </div>
      </div>
    </div>
  );
}
