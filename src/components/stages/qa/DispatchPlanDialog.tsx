import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Check, LoaderCircle, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProposalStore } from "@/store/proposalStore";
import { todayIso } from "@/lib/qa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Saves the planned dispatch date and in-charge, and mirrors the date on the inward order.
export async function planDispatch(orderId: string, plannedDate: string, incharge: string) {
  const { error } = await supabase
    .from("dispatch_details")
    .upsert(
      { inward_order_id: orderId, planned_date: plannedDate || null, incharge },
      { onConflict: "inward_order_id" },
    );
  if (error) {
    toast.error("Could not save the dispatch plan");
    return false;
  }
  if (plannedDate)
    useProposalStore.getState().updateInwardOrder(orderId, { dispatchDate: plannedDate });
  return true;
}

export function DispatchPlanDialog({
  open,
  title,
  description,
  employees,
  defaultDate,
  defaultIncharge,
  confirmLabel = "Save plan",
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  employees: string[];
  defaultDate?: string;
  defaultIncharge?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (date: string, incharge: string) => Promise<void>;
}) {
  const [date, setDate] = useState(defaultDate ?? "");
  const [incharge, setIncharge] = useState(defaultIncharge ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!date || !incharge.trim()) {
      toast.error("Set the dispatch date and who is in charge");
      return;
    }
    setSaving(true);
    await onConfirm(date, incharge.trim());
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <motion.span
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="neo-pop grid h-11 w-11 place-items-center rounded-xl text-primary"
            >
              <Truck className="h-5 w-5" />
            </motion.span>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dispatch-date" className="text-xs font-semibold text-primary">
              Dispatch date
            </Label>
            <Input
              id="dispatch-date"
              type="date"
              min={todayIso()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dispatch-incharge" className="text-xs font-semibold text-primary">
              Dispatch in-charge
            </Label>
            <Input
              id="dispatch-incharge"
              list="dispatch-employees"
              value={incharge}
              onChange={(e) => setIncharge(e.target.value)}
              placeholder="Who handles packing and dispatch"
            />
            <datalist id="dispatch-employees">
              {employees.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <LoaderCircle className="animate-spin" /> : <Check />} {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
