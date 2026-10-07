import { createFileRoute } from "@tanstack/react-router";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { useProposalStore } from "@/store/proposalStore";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { SECTION_BY_ID, WIZARD_STEP_DEFS } from "@/data/proposalLayout";
import { requireAdminPassword } from "@/lib/passwordGate";
import { toast } from "sonner";

export const Route = createFileRoute("/settings/templates")({ component: TemplatesSettings });

function TemplatesSettings() {
  const templates = useProposalStore(s => s.projectTemplates);
  const remove = useProposalStore(s => s.deleteProjectTemplate);

  return (
    <SettingsShell title="Proposal Templates">
      <p className="text-sm text-slate-500 mb-4">
        Saved combinations of wizard steps and proposal sections. Pick one when creating a
        customized project. Save new ones from the preview screen.
      </p>
      {templates.length === 0 ? (
        <div className="text-sm text-slate-400 border rounded-xl p-8 text-center">
          No templates yet.
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="border rounded-xl p-4 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm text-slate-800">{t.name}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Steps: {t.layout.steps.map(k => WIZARD_STEP_DEFS.find(s => s.key === k)?.label ?? k).join(", ")}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Sections: {t.layout.sections.filter(s => s.enabled).map(s => SECTION_BY_ID[s.id]?.label ?? s.id).join(", ")}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500"
                  onClick={() => {
                    if (!requireAdminPassword("settings")) return;
                    remove(t.id);
                    toast.success("Template deleted");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SettingsShell>
  );
}
