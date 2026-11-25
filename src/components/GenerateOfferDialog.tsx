import { useState } from "react";
import { FileText, Printer } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OFFER_TYPES, type OfferType } from "@/components/pdf/offerType";

/** Opens the print page of one of the three offers in a new tab. */
export function openOfferPdf(projectId: string, offer: OfferType) {
  window.open(`/print/${projectId}?offer=${offer}`, "_blank");
}

/**
 * "Generate PDF": pick Techno-Commercial, Technical or Commercial Offer.
 * Generating doesn't change the quotation's status (see Mark as Complete / Sent).
 */
export function GenerateOfferDialog({ projectId, open, onOpenChange }: {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [choice, setChoice] = useState<OfferType>("techno");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate PDF</DialogTitle>
          <DialogDescription>Which offer do you want to generate?</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {OFFER_TYPES.map(o => (
            <label
              key={o.id}
              className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition ${
                choice === o.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300"
              }`}
            >
              <input
                type="radio"
                name="offer-type"
                checked={choice === o.id}
                onChange={() => setChoice(o.id)}
                className="mt-1 accent-blue-600"
              />
              <span>
                <span className="flex items-center gap-1.5 font-semibold text-sm text-slate-800">
                  <FileText className="h-4 w-4 text-blue-600" />{o.label}
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">{o.description}</span>
              </span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!projectId}
            onClick={() => {
              if (!projectId) return;
              openOfferPdf(projectId, choice);
              onOpenChange(false);
            }}
          >
            <Printer className="h-4 w-4 mr-1" />Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
