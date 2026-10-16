import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarClock,
  HardHat,
  ListPlus,
  MessageSquare,
  Pencil,
  Plus,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/db";
import type { Database } from "@/integrations/supabase/types";
import { formatDay, todayIso } from "@/lib/fabrication";
import {
  isSiteLate,
  mapSiteTask,
  SITE_META,
  SITE_STATUSES,
  SITE_WORK_TYPES,
  sitePercent,
  type SiteStatus,
  type SiteTask,
} from "@/lib/commissioning";
import { SITE_DESIGNATIONS, type Employee, type EmployeeRating } from "@/data/employeesData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { RatingDialog } from "@/components/employees/RatingDialog";
import { useCanRate } from "@/lib/ratingRules";
import { useProposalStore } from "@/store/proposalStore";
import type { StageBodyProps } from "./DesignStage";
import { AssigneePicker, Avatar } from "./AssigneePicker";
import { ListSkeleton } from "./StageSkeleton";
import { useStageCanEdit } from "./stageAccess";

type SiteRow = Database["public"]["Tables"]["commissioning_tasks"]["Row"];
const EVERYONE = "__everyone";
const NOBODY = "__nobody";

type TaskForm = {
  title: string;
  details: string;
  assignees: string[];
  startDate: string;
  endDate: string;
};

// Commissioning & Installation: the person responsible splits the site work into tasks and
// assigns each to site engineers and technicians. They confirm each task done or not done from
// their phone; points follow from that, and the in-charge can add a star rating per person.
export function CommissioningStage({ orderId, stage, employees }: StageBodyProps) {
  const canEdit = useStageCanEdit();
  const directory = useProposalStore((s) => s.employees);
  const ratings = useProposalStore((s) => s.ratings);
  const [tasks, setTasks] = useState<SiteTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ task?: SiteTask } | null>(null);
  const [removing, setRemoving] = useState<SiteTask | null>(null);
  const [person, setPerson] = useState(EVERYONE);
  const [rating, setRating] = useState<{ employee: Employee; task: SiteTask } | null>(null);
  const today = todayIso();

  const byName = useMemo(
    () => new Map(directory.map((e) => [e.name.trim().toLowerCase(), e])),
    [directory],
  );
  const employeeOf = (name: string) => byName.get(name.trim().toLowerCase());
  // Site people first, then everyone else; each with their designation under the name.
  const pickList = useMemo(() => {
    const isSite = (name: string) =>
      SITE_DESIGNATIONS.includes(employeeOf(name)?.designation ?? "") ? 0 : 1;
    return [...employees].sort((a, b) => isSite(a) - isSite(b) || a.localeCompare(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, byName]);
  const hints = useMemo(
    () =>
      Object.fromEntries(
        employees.map((name) => [name, employeeOf(name)?.designation ?? ""]).filter(([, d]) => d),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, byName],
  );
  const ratedKeys = useMemo(
    () =>
      new Set(
        ratings
          .filter((r) => r.taskRef?.kind === "commissioning")
          .map((r) => `${r.employeeId}:${r.taskRef!.id}`),
      ),
    [ratings],
  );

  useEffect(() => {
    let active = true;
    void supabase
      .from("commissioning_tasks")
      .select("*")
      .eq("inward_order_id", orderId)
      .order("display_order")
      .order("created_at")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) toast.error("Could not load site work");
        setTasks(((data ?? []) as SiteRow[]).map(mapSiteTask));
        setLoading(false);
      });

    // Live: a site engineer confirming from their phone shows here without a refresh.
    const channel = supabase
      .channel(`commissioning-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "commissioning_tasks",
          filter: `inward_order_id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as Partial<SiteRow>).id;
            setTasks((current) => current.filter((t) => t.id !== id));
            return;
          }
          const next = mapSiteTask(payload.new as SiteRow);
          setTasks((current) =>
            current.some((t) => t.id === next.id)
              ? current.map((t) => (t.id === next.id ? next : t))
              : [...current, next],
          );
        },
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [orderId]);

  const idsOf = (names: string[]) =>
    names.map((n) => employeeOf(n)?.id).filter((id): id is string => Boolean(id));

  async function saveTask(form: TaskForm, existing?: SiteTask) {
    const row = {
      title: form.title.trim(),
      details: form.details.trim(),
      assignees: form.assignees,
      assignee_ids: idsOf(form.assignees),
      start_date: form.startDate || null,
      end_date: form.endDate || null,
    };
    if (existing) {
      const { data, error } = await supabase
        .from("commissioning_tasks")
        .update(row)
        .eq("id", existing.id)
        .select()
        .single();
      if (error || !data) {
        toast.error("Could not save the task");
        return false;
      }
      const next = mapSiteTask(data);
      setTasks((current) => current.map((t) => (t.id === next.id ? next : t)));
      return true;
    }
    const { data, error } = await supabase
      .from("commissioning_tasks")
      .insert({ ...row, inward_order_id: orderId, display_order: tasks.length })
      .select()
      .single();
    if (error || !data) {
      toast.error("Could not add the task");
      return false;
    }
    const next = mapSiteTask(data);
    setTasks((current) => (current.some((t) => t.id === next.id) ? current : [...current, next]));
    toast.success(
      form.assignees.length
        ? `Task assigned to ${form.assignees.join(", ")}`
        : "Task added — assign someone so it shows on their phone",
    );
    return true;
  }

  async function addStandardList() {
    const existing = new Set(tasks.map((t) => t.title.trim().toLowerCase()));
    const rows = SITE_WORK_TYPES.filter((w) => !existing.has(w.toLowerCase())).map((title, i) => ({
      inward_order_id: orderId,
      title,
      display_order: tasks.length + i,
    }));
    if (!rows.length) return toast.info("The usual site work is already listed");
    const { data, error } = await supabase.from("commissioning_tasks").insert(rows).select();
    if (error) return toast.error("Could not add the site work list");
    const added = ((data ?? []) as SiteRow[]).map(mapSiteTask);
    setTasks((current) => [
      ...current,
      ...added.filter((a) => !current.some((t) => t.id === a.id)),
    ]);
    toast.success(`${added.length} tasks added — now assign them`);
  }

  async function setStatus(task: SiteTask, status: SiteStatus) {
    const previous = tasks;
    const completedOn = status === "done" ? today : undefined;
    setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status, completedOn } : t)));
    const { error } = await supabase
      .from("commissioning_tasks")
      .update({ status, completed_on: completedOn ?? null })
      .eq("id", task.id);
    if (error) {
      setTasks(previous);
      toast.error("Could not update the status");
    }
  }

  async function assign(task: SiteTask, names: string[]) {
    const previous = tasks;
    setTasks(tasks.map((t) => (t.id === task.id ? { ...t, assignees: names } : t)));
    const { error } = await supabase
      .from("commissioning_tasks")
      .update({ assignees: names, assignee_ids: idsOf(names) })
      .eq("id", task.id);
    if (error) {
      setTasks(previous);
      toast.error("Could not assign the task");
    }
  }

  async function removeTask(task: SiteTask) {
    const previous = tasks;
    setTasks(tasks.filter((t) => t.id !== task.id));
    const { error } = await supabase.from("commissioning_tasks").delete().eq("id", task.id);
    if (error) {
      setTasks(previous);
      toast.error("Could not delete the task");
    }
  }

  async function setInCharge(value: string) {
    if (!stage) return;
    const name = value === NOBODY ? "" : value;
    const { error } = await supabase
      .from("project_stages")
      .update({ assigned_to: name, assignee_id: employeeOf(name)?.id ?? null })
      .eq("id", stage.id);
    if (error) toast.error("Could not set the person responsible");
    else
      toast.success(name ? `${name} is responsible for site work` : "Person responsible cleared");
  }

  const people = useMemo(() => [...new Set(tasks.flatMap((t) => t.assignees))].sort(), [tasks]);
  const visible = person === EVERYONE ? tasks : tasks.filter((t) => t.assignees.includes(person));
  const done = visible.filter((t) => t.status === "done").length;
  const notDone = visible.filter((t) => t.status === "not done").length;
  const late = visible.filter((t) => isSiteLate(t, today)).length;
  const percent = sitePercent(visible);
  const inCharge = stage?.assignedTo ?? "";

  if (loading) return <ListSkeleton sections={1} rows={5} />;

  return (
    <div className="mx-auto w-full max-w-[80vw] space-y-5 max-lg:max-w-full">
      {/* Who is responsible, summary and filter */}
      <div className="neo-surface flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl px-4 py-3 sm:px-5">
        <div className="min-w-[200px]">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Person responsible
          </div>
          <Select
            value={inCharge || NOBODY}
            onValueChange={(v) => void setInCharge(v)}
            disabled={!canEdit || !stage}
          >
            <SelectTrigger className="mt-1 h-9 w-[220px]" aria-label="Person responsible">
              <HardHat className="h-3.5 w-3.5 text-lime-700" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NOBODY}>Not set</SelectItem>
              {[...new Set([...(inCharge ? [inCharge] : []), ...pickList])].map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                  {hints[name] ? ` · ${hints[name]}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Stat label="Tasks done" value={`${done}/${visible.length}`} tone="text-emerald-600" />
        <Stat
          label="Not done"
          value={notDone}
          tone={notDone ? "text-rose-600" : "text-muted-foreground"}
        />
        <Stat label="Late" value={late} tone={late ? "text-rose-600" : "text-muted-foreground"} />
        <div className="min-w-[140px] flex-1">
          <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
            <span>{person === EVERYONE ? "Overall" : person}</span>
            <span className="text-lime-700">{percent}%</span>
          </div>
          <div className="neo-inset mt-1 h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-gradient-to-r from-lime-400 to-green-500 transition-[width] duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={person} onValueChange={setPerson}>
            <SelectTrigger className="h-9 w-[170px]" aria-label="Show work for">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EVERYONE}>Everyone</SelectItem>
              {people.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canEdit && (
            <Button onClick={() => setDialog({})}>
              <Plus /> Add task
            </Button>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="neo-surface flex flex-col items-center gap-2 rounded-2xl px-4 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-lime-500 to-green-600 text-white shadow-md">
            <HardHat className="h-6 w-6" />
          </span>
          <span className="text-base font-semibold text-foreground">No site work yet</span>
          <span className="max-w-md text-sm text-muted-foreground">
            List the work at the client&apos;s site and assign each task to a site engineer or
            technician. They confirm done or not done from their phone.
          </span>
          {canEdit && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => void addStandardList()}>
                <ListPlus /> Add the usual site work
              </Button>
              <Button onClick={() => setDialog({})}>
                <Plus /> Add task
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="neo-surface overflow-hidden rounded-2xl">
          <ul className="divide-y divide-border/60">
            {visible.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                today={today}
                canEdit={canEdit}
                employees={pickList}
                hints={hints}
                ratedKeys={ratedKeys}
                employeeOf={employeeOf}
                onStatus={(s) => void setStatus(task, s)}
                onAssign={(names) => void assign(task, names)}
                onEdit={() => setDialog({ task })}
                onDelete={() => setRemoving(task)}
                onRate={(employee) => setRating({ employee, task })}
              />
            ))}
          </ul>
          {canEdit && (
            <div className="flex flex-wrap gap-2 border-t border-border/60 px-4 py-2.5">
              <Button size="sm" variant="ghost" onClick={() => setDialog({})}>
                <Plus /> Add task
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void addStandardList()}>
                <ListPlus /> Add the usual site work
              </Button>
            </div>
          )}
        </div>
      )}

      <TaskDialog
        key={dialog ? (dialog.task?.id ?? "new") : "closed"}
        open={Boolean(dialog)}
        task={dialog?.task}
        employees={pickList}
        hints={hints}
        onClose={() => setDialog(null)}
        onSave={(form) => saveTask(form, dialog?.task)}
      />

      {rating && (
        <RatingDialog
          open
          employee={rating.employee}
          task={
            {
              kind: "commissioning",
              id: rating.task.id,
              label: `${rating.task.title} · Commissioning & Installation`,
              orderId,
            } satisfies EmployeeRating["taskRef"]
          }
          onOpenChange={(open) => !open && setRating(null)}
        />
      )}

      <AlertDialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{removing?.title || "task"}”?</AlertDialogTitle>
            <AlertDialogDescription>
              It will also disappear from the phones of the people assigned to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removing) void removeTask(removing);
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

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div>
      <div className={`text-lg font-bold ${tone ?? "text-foreground"}`}>{value}</div>
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
    </div>
  );
}

function TaskRow({
  task,
  today,
  canEdit,
  employees,
  hints,
  ratedKeys,
  employeeOf,
  onStatus,
  onAssign,
  onEdit,
  onDelete,
  onRate,
}: {
  task: SiteTask;
  today: string;
  canEdit: boolean;
  employees: string[];
  hints: Record<string, string>;
  ratedKeys: Set<string>;
  employeeOf: (name: string) => Employee | undefined;
  onStatus: (status: SiteStatus) => void;
  onAssign: (names: string[]) => void;
  onEdit: () => void;
  onDelete: () => void;
  onRate: (employee: Employee) => void;
}) {
  const canRate = useCanRate();
  const late = isSiteLate(task, today);
  const meta = SITE_META[task.status];
  const finished = task.status === "done" || task.status === "not done";
  return (
    <li className={`px-4 py-3 sm:px-5 ${late ? "bg-rose-50/50" : ""}`}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-[220px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">{task.title || "Untitled task"}</span>
            {late && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                Late
              </span>
            )}
          </div>
          {task.details && (
            <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">
              {task.details}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              {task.startDate || task.endDate
                ? `${formatDay(task.startDate) || "?"} → ${formatDay(task.endDate) || "?"}`
                : "No dates"}
            </span>
            {task.confirmedBy && task.confirmedAt && (
              <span>
                {meta.label} · confirmed by {task.confirmedBy},{" "}
                {new Date(task.confirmedAt).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
          {task.remarks && (
            <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 ring-1 ring-amber-100">
              <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="whitespace-pre-wrap">{task.remarks}</span>
            </p>
          )}
        </div>

        <div className="w-[190px]">
          {canEdit ? (
            <AssigneePicker
              value={task.assignees}
              employees={employees}
              hints={hints}
              onChange={onAssign}
              placeholder="Assign engineer"
            />
          ) : (
            <span className="flex flex-wrap items-center gap-1 text-xs">
              {task.assignees.length ? task.assignees.join(", ") : "Not assigned"}
            </span>
          )}
        </div>

        <div className="w-[140px]">
          <Select
            value={task.status}
            onValueChange={(v) => onStatus(v as SiteStatus)}
            disabled={!canEdit}
          >
            <SelectTrigger className={`h-8 text-xs font-semibold ${meta.chip}`} aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SITE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  <span
                    className={`mr-1.5 inline-block h-2 w-2 rounded-full ${SITE_META[s].dot}`}
                  />
                  {SITE_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canEdit && (
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onEdit}
              aria-label="Edit task"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              aria-label="Delete task"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Once the site confirms, rate each person on the task. */}
      {finished && task.assignees.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {task.assignees.map((name) => {
            const employee = employeeOf(name);
            const rated = employee && ratedKeys.has(`${employee.id}:${task.id}`);
            return (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 py-0.5 pl-0.5 pr-1 text-xs"
              >
                <Avatar name={name} />
                {name}
                {rated ? (
                  <span className="flex items-center gap-0.5 pr-1.5 font-medium text-amber-600">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Rated
                  </span>
                ) : employee && canRate(employee) ? (
                  <button
                    type="button"
                    onClick={() => onRate(employee)}
                    className="flex items-center gap-0.5 rounded-full bg-white px-2 py-0.5 font-medium text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50"
                  >
                    <Star className="h-3 w-3" /> Rate
                  </button>
                ) : null}
              </span>
            );
          })}
        </div>
      )}
    </li>
  );
}

function TaskDialog({
  open,
  task,
  employees,
  hints,
  onClose,
  onSave,
}: {
  open: boolean;
  task?: SiteTask;
  employees: string[];
  hints: Record<string, string>;
  onClose: () => void;
  onSave: (form: TaskForm) => Promise<boolean>;
}) {
  const [form, setForm] = useState<TaskForm>({
    title: task?.title ?? "",
    details: task?.details ?? "",
    assignees: task?.assignees ?? [],
    startDate: task?.startDate ?? "",
    endDate: task?.endDate ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<TaskForm>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return toast.error("Write what has to be done");
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      return toast.error("The finish date is before the start date");
    setSaving(true);
    const ok = await onSave(form);
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Edit site task" : "New site task"}</DialogTitle>
          <DialogDescription>
            The people assigned get a notification and confirm it from their phone.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="site-title">Work *</Label>
            <Input
              id="site-title"
              autoFocus
              list="site-work-types"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="e.g. Cable termination"
            />
            <datalist id="site-work-types">
              {SITE_WORK_TYPES.map((w) => (
                <option key={w} value={w} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="site-details">Details</Label>
            <Textarea
              id="site-details"
              rows={2}
              value={form.details}
              onChange={(e) => set({ details: e.target.value })}
              placeholder="Location, panel, what exactly to check"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Assigned to</Label>
            <div className="neo-inset rounded-xl px-1 py-0.5">
              <AssigneePicker
                value={form.assignees}
                employees={employees}
                hints={hints}
                onChange={(assignees) => set({ assignees })}
                placeholder="Choose site engineers / technicians"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="site-start">Start</Label>
              <Input
                id="site-start"
                type="date"
                value={form.startDate}
                onChange={(e) => set({ startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-end">Finish by</Label>
              <Input
                id="site-end"
                type="date"
                value={form.endDate}
                onChange={(e) => set({ endDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {task ? "Save" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
