import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useProposalStore, type Project } from "@/store/proposalStore";

/** Read-only, "pressed into the surface" display of a copied quotation field. */
function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-[11px] uppercase tracking-widest text-slate-400">{label}</Label>
      <div className="neo-inset mt-1 px-3 py-2.5 text-sm text-slate-500 truncate" title={value}>
        {value || "—"}
      </div>
    </div>
  );
}

export function MoveToInwardOrderDialog({
  project, open, onOpenChange,
}: {
  project: Project | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createInwardOrder = useProposalStore((s) => s.createInwardOrder);
  const updateProject = useProposalStore((s) => s.updateProject);
  const employees = useProposalStore((s) => s.employees);

  const [supervisor, setSupervisor] = useState("");
  const [qaOfficer, setQaOfficer] = useState("");
  const [readinessDate, setReadinessDate] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  if (!project) return null;

  const projectNumber = project.data.meta.offerNumber || project.name;
  const customerName =
    project.data.customer.companyFullName || project.data.customer.companyShortName || "";

  const reset = () => {
    setSupervisor(""); setQaOfficer(""); setReadinessDate("");
    setInspectionDate(""); setDispatchDate("");
    setPoNumber(""); setPoDate(""); setDueDate("");
  };

  const submit = () => {
    if (!supervisor.trim() || !qaOfficer.trim() || !readinessDate) {
      toast.error("Supervisor, QA Officer and Date of Readiness are required.");
      return;
    }
    createInwardOrder({
      projectId: project.id,
      projectNumber,
      customerName,
      projectName: project.name,
      poNumber, poDate, dueDate,
      supervisor: supervisor.trim(),
      qaOfficer: qaOfficer.trim(),
      readinessDate,
      inspectionDate: inspectionDate || undefined,
      dispatchDate: dispatchDate || undefined,
    });
    updateProject(project.id, { status: "Converted" });
    reset();
    onOpenChange(false);
    toast.success("Moved to Inward Orders");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Move to Inward Order</DialogTitle>
          <DialogDescription>
            Quotation details are carried over automatically. Fill in the execution details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
              From the quotation
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ReadOnlyField label="Project Number" value={projectNumber} />
              <ReadOnlyField label="Customer Name" value={customerName} />
              <ReadOnlyField label="Project Name" value={project.name} />
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-slate-400">Purchase Order Number</Label>
                <Input className="mt-1" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PO number" />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-slate-400">Date of Purchase Order</Label>
                <Input className="mt-1" type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-slate-400">Due Date</Label>
                <Input className="mt-1" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
              Execution details
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-slate-400">Project Supervisor *</Label>
                <Input
                  className="mt-1"
                  list="inward-supervisors"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  placeholder="Name"
                />
                <datalist id="inward-supervisors">
                  {employees.map((e) => <option key={e.id} value={e.name} />)}
                </datalist>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-slate-400">QA Officer *</Label>
                <Input className="mt-1" value={qaOfficer} onChange={(e) => setQaOfficer(e.target.value)} placeholder="Name" />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-slate-400">Date of Readiness *</Label>
                <Input className="mt-1" type="date" value={readinessDate} onChange={(e) => setReadinessDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-slate-400">Inspection Date</Label>
                <Input className="mt-1" type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-slate-400">Dispatch Date</Label>
                <Input className="mt-1" type="date" value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button className="neo-pop !bg-transparent !text-indigo-600 font-semibold" onClick={submit}>
            Move to Inward Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
