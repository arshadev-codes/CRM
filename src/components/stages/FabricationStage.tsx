import { useStageCanEdit } from "./stageAccess";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Lock,
  PackageCheck,
  Paintbrush,
  Pencil,
  Phone,
  Plus,
  Send,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/db";
import {
  daysBetween,
  fabricationPercent,
  formatDay,
  JOB_META,
  jobState,
  mapFabrication,
  phaseDone,
  PHASES,
  todayIso,
  type FabricationJob,
  type FabricationRow,
  type Phase,
} from "@/lib/fabrication";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import type { StageBodyProps } from "./DesignStage";
import { Avatar } from "./AssigneePicker";
import { ListSkeleton } from "./StageSkeleton";

const PHASE_ICON = { fabrication: Wrench, powder_coating: Paintbrush } as const;

type Form = {
  description: string;
  vendor: string;
  contact: string;
  givenBy: string;
  givenOn: string;
  expectedOn: string;
  receivedOn: string;
  receivedBy: string;
  remarks: string;
};
const emptyForm = (author: string): Form => ({
  description: "",
  vendor: "",
  contact: "",
  givenBy: author,
  givenOn: todayIso(),
  expectedOn: "",
  receivedOn: "",
  receivedBy: "",
  remarks: "",
});
const toRow = (form: Form) => ({
  description: form.description.trim(),
  vendor: form.vendor.trim(),
  contact: form.contact.trim(),
  given_by: form.givenBy.trim(),
  given_on: form.givenOn || null,
  expected_on: form.expectedOn || null,
  received_on: form.receivedOn || null,
  received_by: form.receivedBy.trim(),
  remarks: form.remarks.trim(),
});

// Fabrication: work goes out to a fabricator, comes back, then goes out for powder coating.
// Each batch records who it was given to, when it went, when it is due and when it arrived.
export function FabricationStage({
  orderId,
  stage,
  setStageStatus,
  author,
  employees,
}: StageBodyProps) {
  const [jobs, setJobs] = useState<FabricationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const canEdit = useStageCanEdit();
  const [editing, setEditingRaw] = useState<{ phase: Phase; job?: FabricationJob } | null>(null);
  // View-only users can't open the entry form.
  const setEditing = (value: typeof editing) => setEditingRaw(canEdit ? value : null);
  const [removing, setRemoving] = useState<FabricationJob | null>(null);
  const today = todayIso();

  useEffect(() => {
    let active = true;
    void supabase
      .from("fabrication_jobs")
      .select("*")
      .eq("inward_order_id", orderId)
      .order("display_order")
      .order("created_at")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) toast.error("Could not load fabrication work");
        setJobs(((data ?? []) as FabricationRow[]).map(mapFabrication));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  // Keep the stage status in step with the work recorded here.
  function syncStatus(next: FabricationJob[]) {
    if (!stage) return;
    const done = phaseDone(next, "fabrication") && phaseDone(next, "powder_coating");
    if (done && stage.status !== "done") {
      void setStageStatus("done");
      toast.success("Fabrication and powder coating complete — stage marked done");
    } else if (!done && next.some((j) => j.givenOn) && stage.status === "not started") {
      void setStageStatus("in progress");
    }
  }

  async function save(phase: Phase, form: Form, existing?: FabricationJob) {
    if (existing) {
      const { data, error } = await supabase
        .from("fabrication_jobs")
        .update(toRow(form))
        .eq("id", existing.id)
        .select()
        .single();
      if (error || !data) {
        toast.error("Could not save");
        return false;
      }
      const next = jobs.map((j) =>
        j.id === existing.id ? mapFabrication(data as FabricationRow) : j,
      );
      setJobs(next);
      syncStatus(next);
      return true;
    }
    const { data, error } = await supabase
      .from("fabrication_jobs")
      .insert({
        ...toRow(form),
        inward_order_id: orderId,
        phase,
        display_order: jobs.filter((j) => j.phase === phase).length,
      })
      .select()
      .single();
    if (error || !data) {
      toast.error("Could not save");
      return false;
    }
    const next = [...jobs, mapFabrication(data as FabricationRow)];
    setJobs(next);
    syncStatus(next);
    toast.success(form.vendor ? `Given to ${form.vendor.trim()}` : "Added");
    return true;
  }

  async function markReceived(job: FabricationJob) {
    const patch = { received_on: today, received_by: author };
    const next = jobs.map((j) =>
      j.id === job.id ? { ...j, receivedOn: today, receivedBy: author } : j,
    );
    setJobs(next);
    const { error } = await supabase.from("fabrication_jobs").update(patch).eq("id", job.id);
    if (error) {
      setJobs(jobs);
      return toast.error("Could not mark as received");
    }
    syncStatus(next);
    toast.success(`Received from ${job.vendor || "vendor"}`);
  }

  async function remove(job: FabricationJob) {
    const previous = jobs;
    setJobs(jobs.filter((j) => j.id !== job.id));
    const { error } = await supabase.from("fabrication_jobs").delete().eq("id", job.id);
    if (error) {
      setJobs(previous);
      toast.error("Could not delete");
    }
  }

  const vendors = useMemo(() => [...new Set(jobs.map((j) => j.vendor).filter(Boolean))], [jobs]);
  const percent = fabricationPercent(jobs);
  const fabDone = phaseDone(jobs, "fabrication");

  if (loading) return <ListSkeleton sections={2} />;

  return (
    <div className="mx-auto w-full max-w-[80vw] space-y-6 max-lg:max-w-full">
      {/* Two-step flow */}
      <div className="neo-surface rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          {PHASES.map((phase, index) => {
            const list = jobs.filter((j) => j.phase === phase.key);
            const done = phaseDone(jobs, phase.key);
            const out = list.filter((j) => j.givenOn && !j.receivedOn).length;
            const Icon = PHASE_ICON[phase.key];
            return (
              <div key={phase.key} className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 ${done ? "bg-emerald-50" : list.length ? "bg-orange-50" : "neo-inset"}`}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-sm ${done ? "bg-emerald-500" : list.length ? "bg-gradient-to-br from-orange-500 to-red-500" : "bg-slate-300"}`}
                  >
                    {done ? (
                      <Check className="h-5 w-5" strokeWidth={3} />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Step {phase.step}
                    </div>
                    <div className="truncate text-sm font-bold text-foreground">{phase.label}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {done
                        ? "All received"
                        : !list.length
                          ? "Not given yet"
                          : out
                            ? `${out} at vendor`
                            : `${list.length} not given yet`}
                    </div>
                  </div>
                </div>
                {index === 0 && (
                  <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground/60 max-sm:hidden" />
                )}
              </div>
            );
          })}
          <div className="flex items-center gap-3 pl-1 max-sm:w-full">
            <div className="w-28 max-sm:flex-1">
              <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                <span>Progress</span>
                <span className="text-orange-600">{percent}%</span>
              </div>
              <div className="neo-inset mt-1 h-2 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-400 transition-[width] duration-700"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {PHASES.map((phase) => {
        const list = jobs.filter((j) => j.phase === phase.key);
        const Icon = PHASE_ICON[phase.key];
        const waiting = phase.key === "powder_coating" && !fabDone;
        return (
          <section key={phase.key}>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Icon className="h-5 w-5 text-orange-600" />
                  {phase.step}. {phase.label}
                </h2>
                <p className="text-sm text-muted-foreground">{phase.hint}</p>
              </div>
              {canEdit && (
                <Button size="sm" onClick={() => setEditing({ phase: phase.key })}>
                  <Send /> Give for {phase.label.toLowerCase()}
                </Button>
              )}
            </div>

            {waiting && list.length === 0 && (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                <Lock className="h-3.5 w-3.5" />
                Starts once fabrication is received. Parts that are already back can be sent now.
              </div>
            )}

            <div className="neo-surface overflow-hidden rounded-2xl">
              {list.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setEditing({ phase: phase.key })}
                  disabled={!canEdit}
                  className="flex w-full flex-col items-center gap-1 px-4 py-8 text-center transition-colors hover:bg-primary/[0.03]"
                >
                  <Plus className="h-6 w-6 text-orange-500/70" />
                  <span className="text-sm font-semibold text-foreground">
                    Nothing given for {phase.label.toLowerCase()} yet
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Record who it is given to, when, and when it should come back
                  </span>
                </button>
              ) : (
                <>
                  <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_96px_110px_110px_minmax(150px,auto)] items-center gap-3 border-b border-border/50 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:grid">
                    <span>What</span>
                    <span>Given to</span>
                    <span>Given on</span>
                    <span>Expected back</span>
                    <span>Received</span>
                    <span className="text-right">Action</span>
                  </div>
                  <ul className="divide-y divide-border/40">
                    {list.map((job) => (
                      <JobRow
                        key={job.id}
                        job={job}
                        today={today}
                        onEdit={() => setEditing({ phase: phase.key, job })}
                        onReceive={() => void markReceived(job)}
                        onDelete={() => setRemoving(job)}
                        canEdit={canEdit}
                      />
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>
        );
      })}

      <JobDialog
        key={editing ? `${editing.phase}-${editing.job?.id ?? "new"}` : "closed"}
        open={Boolean(editing)}
        phase={editing?.phase ?? "fabrication"}
        job={editing?.job}
        author={author}
        employees={employees}
        vendors={vendors}
        onClose={() => setEditing(null)}
        onSave={(form) => save(editing!.phase, form, editing!.job)}
      />

      <AlertDialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.description || "This batch"}
              {removing?.vendor ? ` given to ${removing.vendor}` : ""} will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removing) void remove(removing);
                setRemoving(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function JobRow({
  job,
  today,
  onEdit,
  onReceive,
  onDelete,
  canEdit,
}: {
  job: FabricationJob;
  today: string;
  onEdit: () => void;
  onReceive: () => void;
  onDelete: () => void;
  canEdit: boolean;
}) {
  const state = jobState(job, today);
  const meta = JOB_META[state];
  const due = job.expectedOn && !job.receivedOn ? daysBetween(today, job.expectedOn) : undefined;
  return (
    <li
      className={`group/row relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-2.5 transition-colors hover:bg-primary/[0.04] lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_96px_110px_110px_minmax(150px,auto)] ${state === "overdue" ? "bg-rose-50/50" : ""}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${meta.accent}`} />
      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 text-left focus-visible:outline-none"
      >
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
          <span className="truncate text-sm font-semibold text-foreground group-hover/row:text-primary">
            {job.description || "Fabrication work"}
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.chip}`}
          >
            {meta.label}
          </span>
        </div>
        {job.remarks && (
          <div className="truncate pl-4 text-xs text-muted-foreground">{job.remarks}</div>
        )}
        {/* Small screens: the columns are hidden, so show the key facts here. */}
        <div className="truncate pl-4 text-xs text-muted-foreground lg:hidden">
          {[
            job.vendor && `To ${job.vendor}`,
            job.givenOn && `given ${formatDay(job.givenOn)}`,
            job.receivedOn
              ? `received ${formatDay(job.receivedOn)}`
              : job.expectedOn && `due ${formatDay(job.expectedOn)}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </button>

      <div className="hidden min-w-0 lg:block">
        <div className="truncate text-sm font-medium text-foreground">{job.vendor || "—"}</div>
        {job.contact && (
          <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <Phone className="h-3 w-3" /> {job.contact}
          </div>
        )}
      </div>
      <div className="hidden text-sm lg:block">
        {job.givenOn ? formatDay(job.givenOn) : <span className="text-muted-foreground">—</span>}
        {job.givenBy && (
          <div className="truncate text-[11px] text-muted-foreground">by {job.givenBy}</div>
        )}
      </div>
      <div className="hidden text-sm lg:block">
        {job.expectedOn ? (
          <>
            {formatDay(job.expectedOn)}
            {due !== undefined && (
              <div
                className={`text-[11px] font-medium ${due < 0 ? "text-rose-600" : due <= 2 ? "text-amber-600" : "text-muted-foreground"}`}
              >
                {due < 0 ? `${-due}d late` : due === 0 ? "due today" : `in ${due}d`}
              </div>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
      <div className="hidden text-sm lg:block">
        {job.receivedOn ? (
          <>
            <span className="font-medium text-emerald-700">{formatDay(job.receivedOn)}</span>
            {job.receivedBy && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Avatar name={job.receivedBy} /> <span className="truncate">{job.receivedBy}</span>
              </div>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>

      <div className={`flex items-center justify-end gap-1 ${canEdit ? "" : "hidden"}`}>
        {!job.receivedOn && job.givenOn && (
          <Button size="sm" variant="outline" className="h-8" onClick={onReceive}>
            <PackageCheck /> Received
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} aria-label="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

function JobDialog({
  open,
  phase,
  job,
  author,
  employees,
  vendors,
  onClose,
  onSave,
}: {
  open: boolean;
  phase: Phase;
  job?: FabricationJob;
  author: string;
  employees: string[];
  vendors: string[];
  onClose: () => void;
  onSave: (form: Form) => Promise<boolean>;
}) {
  const label = PHASES.find((p) => p.key === phase)!.label;
  const [form, setForm] = useState<Form>(() =>
    job
      ? {
          description: job.description,
          vendor: job.vendor,
          contact: job.contact,
          givenBy: job.givenBy,
          givenOn: job.givenOn ?? "",
          expectedOn: job.expectedOn ?? "",
          receivedOn: job.receivedOn ?? "",
          receivedBy: job.receivedBy,
          remarks: job.remarks,
        }
      : emptyForm(author),
  );
  const [saving, setSaving] = useState(false);
  const set = (key: keyof Form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.vendor.trim()) return toast.error("Who is it given to?");
    if (form.expectedOn && form.givenOn && form.expectedOn < form.givenOn)
      return toast.error("Expected date is before the given date");
    setSaving(true);
    const ok = await onSave(form);
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {job ? `Edit ${label.toLowerCase()} entry` : `Give for ${label.toLowerCase()}`}
            </DialogTitle>
            <DialogDescription>
              Who it is given to, when it went and when it should come back.
            </DialogDescription>
          </DialogHeader>

          <Field label="What is being sent" id="fab-desc">
            <Input
              id="fab-desc"
              value={form.description}
              onChange={(e) => set("description")(e.target.value)}
              placeholder={
                phase === "fabrication"
                  ? "e.g. Console enclosure, 2 panels"
                  : "e.g. All fabricated parts, RAL 7035"
              }
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Given to (vendor)" id="fab-vendor" required>
              <Input
                id="fab-vendor"
                list="fab-vendors"
                value={form.vendor}
                onChange={(e) => set("vendor")(e.target.value)}
                placeholder="Vendor / workshop"
                autoFocus={!job}
              />
              <datalist id="fab-vendors">
                {vendors.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </Field>
            <Field label="Vendor contact" id="fab-contact">
              <Input
                id="fab-contact"
                value={form.contact}
                onChange={(e) => set("contact")(e.target.value)}
                placeholder="Name or phone"
              />
            </Field>
            <Field label="Given on" id="fab-given">
              <Input
                id="fab-given"
                type="date"
                value={form.givenOn}
                onChange={(e) => set("givenOn")(e.target.value)}
              />
            </Field>
            <Field label="Expected back" id="fab-expected">
              <Input
                id="fab-expected"
                type="date"
                value={form.expectedOn}
                min={form.givenOn || undefined}
                onChange={(e) => set("expectedOn")(e.target.value)}
              />
            </Field>
            <Field label="Given by" id="fab-by">
              <Input
                id="fab-by"
                list="fab-people"
                value={form.givenBy}
                onChange={(e) => set("givenBy")(e.target.value)}
                placeholder="Employee"
              />
              <datalist id="fab-people">
                {employees.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </Field>
            {job && (
              <Field label="Received on" id="fab-received">
                <Input
                  id="fab-received"
                  type="date"
                  value={form.receivedOn}
                  onChange={(e) => {
                    set("receivedOn")(e.target.value);
                    if (e.target.value && !form.receivedBy) set("receivedBy")(author);
                  }}
                />
              </Field>
            )}
          </div>
          {job && form.receivedOn && (
            <Field label="Received by" id="fab-recv-by">
              <Input
                id="fab-recv-by"
                list="fab-people"
                value={form.receivedBy}
                onChange={(e) => set("receivedBy")(e.target.value)}
              />
            </Field>
          )}
          <Field label="Remarks" id="fab-remarks">
            <Textarea
              id="fab-remarks"
              rows={2}
              value={form.remarks}
              onChange={(e) => set("remarks")(e.target.value)}
              placeholder="Drawing revision, finish, quantity, anything to note"
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {job ? <Check /> : <CalendarClock />} {job ? "Save" : "Save entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  id,
  required,
  children,
}: {
  label: string;
  id: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-primary">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}
