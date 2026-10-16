import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useProposalStore } from "@/store/proposalStore";
import { useCurrentUser } from "@/store/authStore";
import { useCanRate, useMyEmployee } from "@/lib/ratingRules";
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
  const addRating = useProposalStore((s) => s.addRating);
  const user = useCurrentUser();
  const me = useMyEmployee();
  const allowed = useCanRate()(employee);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  // The rating is always given by the signed-in person.
  const ratedBy = me?.name ?? user?.name ?? "";

  function close(next: boolean) {
    if (!next) {
      setStars(0);
      setComment("");
    }
    onOpenChange(next);
  }

  function save() {
    if (!stars) return toast.error("Pick a star rating");
    if (!allowed) return toast.error(notAllowedText(Boolean(me)));
    addRating({
      employeeId: employee.id,
      stars,
      comment: comment.trim(),
      ratedBy,
      ratedById: me?.id,
      taskRef: task,
    });
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
          {allowed ? (
            <p className="text-xs text-slate-500">
              Rating as <span className="font-medium text-slate-700">{ratedBy}</span>
            </p>
          ) : (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {notAllowedText(Boolean(me))}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!allowed}>
            Save rating
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function notAllowedText(linked: boolean) {
  return linked
    ? "You can't rate this person. Ask the admin to add a rating rule for your designation."
    : "Your login isn't linked to an employee, so you can't give ratings. Ask the admin to link it.";
}
