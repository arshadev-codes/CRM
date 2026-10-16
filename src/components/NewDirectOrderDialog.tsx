import { isWorkshopPerson } from "@/data/employeesData";
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { isDirectOrder, useProposalStore } from "@/store/proposalStore";
import { getFY, pad3 } from "@/lib/offerNumber";
import { todayIso } from "@/lib/procurement";
import { setCurrentStage, STAGE_NAMES, type CurrentStage } from "@/lib/stages";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const labelClass = "text-[11px] uppercase tracking-widest text-slate-400";

/** Next free order number for direct orders, e.g. DO/2026-27/004. */
function nextOrderNumber(taken: string[]) {
  const fy = getFY(todayIso());
  const prefix = `DO/${fy}/`;
  const used = taken
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10) || 0);
  return `${prefix}${pad3(Math.max(0, ...used) + 1)}`;
}

/**
 * An inward order made straight away, without a quotation: for regular customers whose
 * prices are already fixed and who send their purchase order directly.
 */
export function NewDirectOrderDialog({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const createInwardOrder = useProposalStore((s) => s.createInwardOrder);
  const orders = useProposalStore((s) => s.inwardOrders);
  const employees = useProposalStore((s) => s.employees);
  const companies = useProposalStore((s) => s.companies);

  const suggested = useMemo(
    () => nextOrderNumber(orders.filter(isDirectOrder).map((o) => o.projectNumber)),
    [orders],
  );

  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [qaOfficer, setQaOfficer] = useState("");
  const [readinessDate, setReadinessDate] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
  const [currentStage, setStage] = useState<CurrentStage>("Design");

  const reset = () => {
    setOrderNumber(""); setCustomerName(""); setProjectName("");
    setPoNumber(""); setPoDate(""); setDueDate("");
    setSupervisor(""); setQaOfficer(""); setReadinessDate("");
    setInspectionDate(""); setDispatchDate(""); setStage("Design");
  };

  const submit = async () => {
    if (!customerName.trim() || !projectName.trim() || !poNumber.trim()) {
      toast.error("Customer, Project name and PO number are required.");
      return;
    }
    if (!supervisor.trim() || !qaOfficer.trim() || !readinessDate) {
      toast.error("Supervisor, QA Officer and Date of Readiness are required.");
      return;
    }
    const number = orderNumber.trim() || suggested;
    if (orders.some((o) => o.projectNumber.trim().toLowerCase() === number.toLowerCase())) {
      toast.error(`Order number ${number} is already used.`);
      return;
    }
    const id = crypto.randomUUID();
    createInwardOrder({
      id,
      projectId: id,
      projectNumber: number,
      customerName: customerName.trim(),
      projectName: projectName.trim(),
      poNumber: poNumber.trim(), poDate, dueDate,
      supervisor: supervisor.trim(),
      qaOfficer: qaOfficer.trim(),
      readinessDate,
      inspectionDate: inspectionDate || undefined,
      dispatchDate: dispatchDate || undefined,
      status: currentStage === "all" ? "Completed" : currentStage === "Design" ? "Open" : "In Progress",
    });
    const stage = currentStage;
    reset();
    onOpenChange(false);
    toast.success("Inward order created");
    if (!(await setCurrentStage(id, stage)))
      toast.error("Order created, but its stage could not be set. Set it on the order page.");
    void navigate({ to: "/inward-orders/$id", params: { id } });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New inward order (without quotation)</DialogTitle>
          <DialogDescription>
            For a regular customer who sends the purchase order directly, with prices already fixed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
              Order details
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className={labelClass}>Order Number</Label>
                <Input className="mt-1" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder={suggested} />
                <p className="mt-1 text-[11px] text-slate-400">Leave empty to use {suggested}</p>
              </div>
              <div>
                <Label className={labelClass}>Customer Name *</Label>
                <Input
                  className="mt-1"
                  list="direct-order-customers"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Pick or type the company"
                />
                <datalist id="direct-order-customers">
                  {[...new Set(
                    [...companies.map((c) => c.companyFullName), ...orders.map((o) => o.customerName)]
                      .map((n) => n.trim()).filter(Boolean),
                  )].map((n) => <option key={n} value={n} />)}
                </datalist>
              </div>
              <div className="sm:col-span-2">
                <Label className={labelClass}>Project Name *</Label>
                <Input className="mt-1" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="What is being made, e.g. 2 RIO Panels + Control Desk" />
              </div>
              <div>
                <Label className={labelClass}>Purchase Order Number *</Label>
                <Input className="mt-1" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PO number" />
              </div>
              <div>
                <Label className={labelClass}>Date of Purchase Order</Label>
                <Input className="mt-1" type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
              </div>
              <div>
                <Label className={labelClass}>Due Date</Label>
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
                <Label className={labelClass}>Project Supervisor *</Label>
                <Input
                  className="mt-1"
                  list="direct-order-supervisors"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  placeholder="Name"
                />
                <datalist id="direct-order-supervisors">
                  {employees.filter(isWorkshopPerson).map((e) => <option key={e.id} value={e.name} />)}
                </datalist>
              </div>
              <div>
                <Label className={labelClass}>QA Officer *</Label>
                <Input className="mt-1" value={qaOfficer} onChange={(e) => setQaOfficer(e.target.value)} placeholder="Name" />
              </div>
              <div>
                <Label className={labelClass}>Date of Readiness *</Label>
                <Input className="mt-1" type="date" value={readinessDate} onChange={(e) => setReadinessDate(e.target.value)} />
              </div>
              <div>
                <Label className={labelClass}>Inspection Date</Label>
                <Input className="mt-1" type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
              </div>
              <div>
                <Label className={labelClass}>Dispatch Date</Label>
                <Input className="mt-1" type="date" value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <Label className={labelClass}>Where is this order now?</Label>
            <CurrentStageSelect value={currentStage} onChange={setStage} />
            <p className="mt-1 text-[11px] text-slate-400">
              For an order already running: the stages before this are marked done.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button className="neo-pop !bg-transparent !text-indigo-600 font-semibold" onClick={() => void submit()}>
            Create order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CurrentStageSelect({
  value, onChange, className = "mt-1",
}: {
  value: CurrentStage | "";
  onChange: (v: CurrentStage) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CurrentStage)}>
      <SelectTrigger className={className}><SelectValue placeholder="Choose the stage" /></SelectTrigger>
      <SelectContent>
        {STAGE_NAMES.map((name, i) => (
          <SelectItem key={name} value={name}>{i === 0 ? `${name} (new order)` : name}</SelectItem>
        ))}
        <SelectItem value="all">All done (order finished)</SelectItem>
      </SelectContent>
    </Select>
  );
}
