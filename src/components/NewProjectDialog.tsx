import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, LayoutTemplate, SlidersHorizontal, ArrowUp, ArrowDown } from "lucide-react";
import {
  PROPOSAL_SECTIONS, WIZARD_STEP_DEFS, defaultLayout, resolveLayout,
  type ProposalLayout,
} from "@/data/proposalLayout";
import { useProposalStore } from "@/store/proposalStore";

/**
 * "Template or Customized?" chooser shown when the user starts a new project.
 * Template  -> every wizard step + every proposal section (the approved default).
 * Customized-> pick the wizard steps to fill in, pick/reorder the proposal
 *              sections, or start from a previously saved template.
 */
export function NewProjectDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (layout: ProposalLayout) => void;
}) {
  const templates = useProposalStore((s) => s.projectTemplates);
  const [mode, setMode] = useState<"choose" | "custom">("choose");
  const [draft, setDraft] = useState<ProposalLayout>(defaultLayout());

  const reset = () => { setMode("choose"); setDraft(defaultLayout()); };

  const close = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const toggleStep = (key: string) =>
    setDraft((d) => ({
      ...d,
      steps: d.steps.includes(key)
        ? d.steps.filter((k) => k !== key)
        : WIZARD_STEP_DEFS.map((s) => s.key).filter((k) => k === key || d.steps.includes(k)),
    }));

  const toggleSection = (id: string) =>
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    }));

  const moveSection = (index: number, dir: -1 | 1) =>
    setDraft((d) => {
      const sections = [...d.sections];
      const target = index + dir;
      if (target < 0 || target >= sections.length) return d;
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...d, sections };
    });

  const stepCount = draft.steps.length;
  const sectionCount = draft.sections.filter((s) => s.enabled).length;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "choose" ? "Start a new proposal" : "Customize this proposal"}</DialogTitle>
          <DialogDescription>
            {mode === "choose"
              ? "Use the standard proposal, or pick exactly which steps and sections this one needs."
              : "Tick the steps you want to fill in, then choose and order the sections that get printed."}
          </DialogDescription>
        </DialogHeader>

        {mode === "choose" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              className="neo-surface rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5"
              onClick={() => { onCreate(defaultLayout()); reset(); }}
            >
              <LayoutTemplate className="h-6 w-6 text-indigo-500 mb-3" />
              <div className="font-semibold text-slate-800">Standard proposal</div>
              <p className="text-xs text-slate-500 mt-1">
                All {WIZARD_STEP_DEFS.length} steps and all {PROPOSAL_SECTIONS.length} sections, in the approved order.
              </p>
            </button>
            <button
              className="neo-surface rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5"
              onClick={() => setMode("custom")}
            >
              <SlidersHorizontal className="h-6 w-6 text-emerald-500 mb-3" />
              <div className="font-semibold text-slate-800">Customized proposal</div>
              <p className="text-xs text-slate-500 mt-1">
                Choose the steps, choose and reorder the printed sections, or start from a saved template.
              </p>
            </button>

            {templates.length > 0 && (
              <div className="sm:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                  Saved templates
                </div>
                <div className="space-y-2">
                  {templates.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 border rounded-xl px-4 py-2.5 bg-white">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{t.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {t.layout.steps.length} steps · {t.layout.sections.filter((s) => s.enabled).length} sections
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => { onCreate(resolveLayout(t.layout)); reset(); }}>
                        Use
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setDraft(resolveLayout(t.layout)); setMode("custom"); }}
                      >
                        Customize
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                Wizard steps ({stepCount})
              </div>
              <div className="space-y-1.5">
                {WIZARD_STEP_DEFS.map((s) => (
                  <label key={s.key} className="flex items-center gap-2 text-sm text-slate-700">
                    <Checkbox
                      checked={draft.steps.includes(s.key)}
                      onCheckedChange={() => toggleStep(s.key)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                Printed sections ({sectionCount})
              </div>
              <div className="space-y-1">
                {draft.sections.map((s, i) => {
                  const def = PROPOSAL_SECTIONS.find((d) => d.id === s.id);
                  return (
                    <div key={s.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={s.enabled} onCheckedChange={() => toggleSection(s.id)} />
                      <span className={`flex-1 truncate ${s.enabled ? "text-slate-700" : "text-slate-400 line-through"}`}>
                        {def?.label ?? s.id}
                      </span>
                      <button className="p-1 text-slate-400 hover:text-blue-600" onClick={() => moveSection(i, -1)}>
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button className="p-1 text-slate-400 hover:text-blue-600" onClick={() => moveSection(i, 1)}>
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="sm:col-span-2 flex items-center justify-between gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setMode("choose")}>
                <ArrowLeft className="h-3 w-3 mr-1" />Back
              </Button>
              <div className="flex items-center gap-2">
                {stepCount === 0 && <span className="text-xs text-amber-600">Pick at least one step.</span>}
                {sectionCount === 0 && <span className="text-xs text-amber-600">Pick at least one section.</span>}
                <Button
                  disabled={stepCount === 0 || sectionCount === 0}
                  onClick={() => { onCreate(draft); reset(); }}
                >
                  Create proposal
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
