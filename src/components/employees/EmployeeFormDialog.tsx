import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useProposalStore } from "@/store/proposalStore";
import type { Employee } from "@/data/employeesData";

type Form = {
  name: string;
  designation: string;
  department: string;
  phone: string;
  joinedOn: string;
  active: boolean;
};

/** Add or edit a workshop employee. Pass `employee` to edit. */
export function EmployeeFormDialog({
  employee,
  onClose,
  onSaved,
}: {
  employee?: Employee;
  onClose: () => void;
  onSaved?: (employee: Employee) => void;
}) {
  const employees = useProposalStore((s) => s.employees);
  const addEmployee = useProposalStore((s) => s.addEmployee);
  const updateEmployee = useProposalStore((s) => s.updateEmployee);
  const [form, setForm] = useState<Form>({
    name: employee?.name ?? "",
    designation: employee?.designation ?? "",
    department: employee?.department ?? "",
    phone: employee?.phone ?? "",
    joinedOn: employee?.joinedOn ?? "",
    active: employee?.active !== false,
  });
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  function save(event: React.FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return toast.error("Name is required");
    // Work is matched to people by name, so names must stay unique.
    const clash = employees.some(
      (e) => e.id !== employee?.id && e.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (clash) return toast.error(`${name} already exists`);
    const fields = {
      name,
      designation: form.designation.trim(),
      department: form.department.trim(),
      phone: form.phone.trim(),
      joinedOn: form.joinedOn,
      active: form.active,
    };
    if (employee) {
      updateEmployee(employee.id, fields);
      toast.success(`${name} updated`);
      onSaved?.({ ...employee, ...fields });
    } else {
      const created = addEmployee({ ...fields, scope: "workshop" });
      toast.success(`${name} added`);
      onSaved?.(created);
    }
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{employee ? `Edit ${employee.name}` : "Add employee"}</DialogTitle>
          <DialogDescription>
            {employee && employee.name !== form.name.trim()
              ? "Work already assigned under the old name will need to be reassigned."
              : "Workshop team member. They will show in stage assignee lists."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="emp-name">Name *</Label>
              <Input id="emp-name" autoFocus value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Rahul Pawar" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-designation">Designation</Label>
              <Input id="emp-designation" value={form.designation} onChange={(e) => set({ designation: e.target.value })} placeholder="e.g. Wireman" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-department">Department</Label>
              <Input id="emp-department" value={form.department} onChange={(e) => set({ department: e.target.value })} placeholder="e.g. Production" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-phone">Phone</Label>
              <Input id="emp-phone" type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="e.g. 98200 00000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-joined">Joined on</Label>
              <Input id="emp-joined" type="date" value={form.joinedOn} onChange={(e) => set({ joinedOn: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <Switch checked={form.active} onCheckedChange={(v) => set({ active: v })} />
            Active (inactive people are hidden from lists and assignee pickers)
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{employee ? "Save changes" : "Add employee"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
