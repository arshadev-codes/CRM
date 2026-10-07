import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useProposalStore } from "@/store/proposalStore";
import { requireAdminPassword } from "@/lib/passwordGate";
import type { Employee, EmployeeRating } from "@/data/employeesData";
import { POINTS } from "@/lib/employeeScore";
import { StarInput } from "./Stars";

const LABELS = ["", "Poor", "Below expectations", "Good", "Very good", "Excellent"];

// Rate an employee, either for one finished piece of work or in general.
export function RatingDialog({
  employee,
  task,
  open,
  onOpenChange,
}: {
  employee: Employee;
  task?: EmployeeRating["taskRef"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const employees = useProposalStore((s) => s.employees);
  const addRating = useProposalStore((s) => s.addRating);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [ratedBy, setRatedBy] = useState("");

  function close(next: boolean) {
    if (!next) {
      setStars(0);
      setComment("");
    }
    onOpenChange(next);
  }

  function save() {
    if (!stars) return toast.error("Pick a star rating");
    if (!ratedBy) return toast.error("Choose who is giving the rating");
    if (!requireAdminPassword("employees")) return;
    addRating({ employeeId: employee.id, stars, comment: comment.trim(), ratedBy, taskRef: task });
    toast.success(`Rated ${employee.name} ${stars}★ · +${stars * POINTS.perStar} points`);
    close(false);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate {employee.name}</DialogTitle>
          <DialogDescription>
            {task ? `For: ${task.label}` : "General rating, not tied to one task."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <StarInput value={stars} onChange={setStars} />
            <p className="mt-1 h-4 text-xs text-slate-500">
              {stars ? `${LABELS[stars]} · +${stars * POINTS.perStar} points` : ""}
            </p>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Comment</span>
            <textarea
              className="neo-inset mt-1 w-full resize-y px-3 py-2 text-sm outline-none"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What went well, what to improve"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Rated by *</span>
            <select
              className="neo-inset mt-1 w-full px-3 py-2 text-sm outline-none"
              value={ratedBy}
              onChange={(e) => setRatedBy(e.target.value)}
            >
              <option value="">Select…</option>
              {employees
                .filter((e) => e.id !== employee.id && e.active !== false)
                .map((e) => (
                  <option key={e.id} value={e.name}>
                    {e.name}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save rating</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
