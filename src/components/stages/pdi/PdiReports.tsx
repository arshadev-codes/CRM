import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ClipboardCheck, Cpu, Eye, Pencil, Plus, Trash2, Zap } from "lucide-react";
import {
  DECLARATION,
  PDI_CATEGORIES,
  reportProgress,
  sectionsFor,
  type PdiCategory,
  type PdiResponses,
  type PdiRow,
} from "@/lib/pdi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EASE, formatStamp, timeAgo } from "../shared";

// PDI reports of this order: one per panel, drafts first.
export function PdiReports({
  reports,
  onStart,
  onContinue,
  onDelete,
}: {
  reports: PdiRow[];
  onStart: () => void;
  onContinue: (report: PdiRow) => void;
  onDelete: (report: PdiRow) => void;
}) {
  const [viewing, setViewing] = useState<PdiRow | null>(null);
  const [deleting, setDeleting] = useState<PdiRow | null>(null);
  const submitted = reports.filter((report) => report.status === "submitted").length;
  const sorted = [...reports].sort(
    (a, b) =>
      Number(a.status === "submitted") - Number(b.status === "submitted") ||
      b.created_at.localeCompare(a.created_at),
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE, delay: 0.05 }}
      id="pdi"
      className="neo-surface scroll-mt-4 overflow-hidden rounded-3xl p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="neo-pop grid h-11 w-11 place-items-center rounded-xl text-primary">
          <ClipboardCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground">Pre-dispatch inspection (PDI)</h2>
          <p className="text-xs text-muted-foreground">
            {reports.length
              ? `${submitted} of ${reports.length} panel${reports.length === 1 ? "" : "s"} inspected`
              : "Fill the PDI checklist for each panel before it is packed"}
          </p>
        </div>
        <Button onClick={onStart}>
          <Plus /> {reports.length ? "Inspect another panel" : "Start PDI"}
        </Button>
      </div>

      {sorted.length > 0 && (
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {sorted.map((report) => {
            const category = report.panel_category as PdiCategory;
            const progress = reportProgress(category, (report.responses ?? {}) as PdiResponses);
            const done = report.status === "submitted";
            const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
            const Icon = category === "automation" ? Cpu : Zap;
            return (
              <li
                key={report.id}
                className={`group/pdi relative overflow-hidden rounded-2xl p-4 ${done ? "neo-pop" : "bg-amber-50/70 ring-1 ring-amber-200"}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${done ? "bg-emerald-500 text-white" : "bg-amber-200 text-amber-800"}`}
                  >
                    {done ? (
                      <Check className="h-5 w-5" strokeWidth={3} />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-foreground">
                      {report.panel_serial || "Untitled panel"}
                      {report.panel_name ? ` · ${report.panel_name}` : ""}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {PDI_CATEGORIES.find((c) => c.value === category)?.label} ·{" "}
                      {report.inspector_name || "—"} ·{" "}
                      {done && report.submitted_at
                        ? `submitted ${timeAgo(report.submitted_at)}`
                        : `draft, ${pct}% done`}
                    </div>
                  </div>
                  {!done && (
                    <button
                      type="button"
                      onClick={() => setDeleting(report)}
                      aria-label="Delete draft"
                      className="rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover/pdi:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {!done && (
                  <div className="neo-inset mt-3 h-1.5 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  {done ? (
                    <Button size="sm" variant="outline" onClick={() => setViewing(report)}>
                      <Eye /> View report
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => onContinue(report)}>
                      <Pencil /> Continue
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ReportDialog report={viewing} onClose={() => setViewing(null)} />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this PDI draft?</AlertDialogTitle>
            <AlertDialogDescription>
              The answers filled so far for {deleting?.panel_serial || "this panel"} are removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deleting) onDelete(deleting);
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.section>
  );
}

function ReportDialog({ report, onClose }: { report: PdiRow | null; onClose: () => void }) {
  const responses = (report?.responses ?? {}) as PdiResponses;
  const sections = sectionsFor((report?.panel_category ?? "") as PdiCategory);
  return (
    <Dialog open={Boolean(report)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            PDI · {report?.panel_serial} {report?.panel_name ? `· ${report.panel_name}` : ""}
          </DialogTitle>
          <DialogDescription>
            {PDI_CATEGORIES.find((c) => c.value === report?.panel_category)?.label} · Project{" "}
            {report?.project_number}
            {report?.customer_name ? ` · ${report.customer_name}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="neo-inset rounded-xl px-4 py-3 text-sm">
          Inspected by <span className="font-semibold">{report?.inspector_name}</span> (
          {report?.inspector_email}
          {report?.email_verified_at ? ", email verified" : ""})
          {report?.submitted_at ? ` · ${formatStamp(report.submitted_at)}` : ""}
        </div>
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.key}>
              <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                {section.title}
              </div>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const value = responses[item.key];
                  const na = value === "na";
                  return (
                    <li key={item.key} className="flex items-start gap-2 text-sm">
                      <span
                        className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${na ? "bg-slate-200 text-slate-600" : value ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                      >
                        {na ? "N/A" : value === "yes" ? "YES" : value ? "OK" : "—"}
                      </span>
                      <span className="text-foreground/85">{item.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {report?.remarks && (
            <div>
              <div className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">
                Remarks
              </div>
              <p className="whitespace-pre-wrap text-sm">{report.remarks}</p>
            </div>
          )}
          {report?.declared && (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <Check className="mt-0.5 h-4 w-4 shrink-0" /> {DECLARATION}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
