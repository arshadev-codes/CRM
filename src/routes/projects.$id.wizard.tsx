import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useProposalStore } from "@/store/proposalStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Save, Eye, Printer, RefreshCw } from "lucide-react";
import {
  Step1ProjectSetup, Step2Tests, Step3Subsystems, Step3bSystemLayout, Step4InstrumentsEquipment,
  Step5Proprietary, Step6Delivery, Step7ExclusionsMakes, StepPricing, Step8Payment, Step9Review,
} from "@/components/wizard/Steps";
import { toast } from "sonner";

export const Route = createFileRoute("/projects/$id/wizard")({
  component: Wizard,
});

const STEPS = [
  { key: "setup", label: "Project Setup", Comp: Step1ProjectSetup },
  { key: "tests", label: "Tests", Comp: Step2Tests },
  { key: "subsystems", label: "Major Sub Systems", Comp: Step3Subsystems },
  { key: "layout", label: "System Layout", Comp: Step3bSystemLayout },
  { key: "inst-eq", label: "Instruments & Equipment", Comp: Step4InstrumentsEquipment },
  { key: "proprietary", label: "Proprietary Items", Comp: Step5Proprietary },
  { key: "delivery", label: "Delivery", Comp: Step6Delivery },
  { key: "excl-makes", label: "Exclusions & Makes", Comp: Step7ExclusionsMakes },
  { key: "pricing", label: "Pricing", Comp: StepPricing },
  { key: "payment", label: "Payment", Comp: Step8Payment },
  { key: "review", label: "Review", Comp: Step9Review },
] as const;

function Wizard() {
  const { id } = Route.useParams();
  const project = useProposalStore(s => s.projects.find(p => p.id === id));
  const updateProjectData = useProposalStore(s => s.updateProjectData);
  const updateProject = useProposalStore(s => s.updateProject);
  const reviseProject = useProposalStore(s => s.reviseProject);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  if (!project) return (
    <div className="p-8 text-center">
      <p>Project not found.</p>
      <Link to="/" className="text-blue-700 underline">Back to dashboard</Link>
    </div>
  );

  const Current = STEPS[step].Comp;
  const update = (patch: Parameters<typeof updateProjectData>[1]) => updateProjectData(project.id, patch);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4 gap-3 pl-4">
        <div className="flex-1">
          <Input value={project.name} onChange={e => updateProject(project.id, { name: e.target.value })}
            className="text-xl font-bold border-0 px-0 h-auto focus-visible:ring-0 shadow-none" />
          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
            {project.data.meta.offerNumber && (
              <span className="font-mono text-indigo-600">{project.data.meta.offerNumber}</span>
            )}
            <span>· Autosaved · {new Date(project.updatedAt).toLocaleTimeString()}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {project.status === "Completed" && (
            <Button size="sm" variant="outline" onClick={() => {
              const p = reviseProject(project.id);
              if (p) { toast.success(`Created R${p.revision}`); navigate({ to: "/projects/$id/wizard", params: { id: p.id } }); }
            }}><RefreshCw className="h-3 w-3 mr-1" />Revise Offer</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => { updateProject(project.id, { status: "Completed" }); toast.success("Marked completed"); }}><Save className="h-3 w-3 mr-1" />Save Draft</Button>
          <Button size="sm" variant="outline" onClick={() => navigate({ to: "/projects/$id/preview", params: { id: project.id } })}><Eye className="h-3 w-3 mr-1" />Preview</Button>
          <Button size="sm" onClick={() => window.open(`/print/${project.id}`, "_blank")}><Printer className="h-3 w-3 mr-1" />Generate</Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <Progress value={((step + 1) / STEPS.length) * 100} className="mb-3" />
      </motion.div>

      <div className="flex flex-wrap gap-2 mb-6">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => setStep(i)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-150
              ${i === step
                ? "neo-inset text-blue-700 ring-2 ring-blue-400/50"
                : i < step
                ? "neo-inset text-blue-500 opacity-70"
                : "neo-pop text-slate-500 hover:text-blue-600"
              }`}
          >
            {i + 1}. {s.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border p-6 min-h-[400px] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={STEPS[step].key}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <Current project={project} update={update} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-between mt-4">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
        ) : (
          <Button onClick={() => window.open(`/print/${project.id}`, "_blank")}><Printer className="h-4 w-4 mr-1" />Generate PDF</Button>
        )}
      </div>
    </div>
  );
}