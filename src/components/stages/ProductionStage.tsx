import { EditLock, EditOnly, useStageCanEdit } from "./stageAccess";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CircleDashed,
  Factory,
  LayoutList,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/db";
import type { Database } from "@/integrations/supabase/types";
import { formatDay, todayIso } from "@/lib/fabrication";
import {
  isLate,
  mapPanel,
  mapTask,
  PANEL_TYPES,
  panelLabel,
  TASK_META,
  TASK_STATUSES,
  taskPercent,
  WORK_TYPES,
  type Panel,
  type PanelRow,
  type Task,
  type TaskRow,
  type TaskStatus,
} from "@/lib/production";
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
import type { StageBodyProps } from "./DesignStage";
import { AssigneePicker } from "./AssigneePicker";
import { ListSkeleton } from "./StageSkeleton";

type TaskPatch = Partial<
  Pick<Task, "work" | "assignees" | "startDate" | "endDate" | "status" | "completedOn" | "remarks">
>;
const EVERYONE = "__everyone";

function patchToRow(patch: TaskPatch) {
  const row: Database["public"]["Tables"]["production_tasks"]["Update"] = {};
  if ("work" in patch) row.work = patch.work;
  if ("assignees" in patch) row.assignees = patch.assignees;
  if ("startDate" in patch) row.start_date = patch.startDate || null;
  if ("endDate" in patch) row.end_date = patch.endDate || null;
  if ("status" in patch) row.status = patch.status;
  if ("completedOn" in patch) row.completed_on = patch.completedOn || null;
  if ("remarks" in patch) row.remarks = patch.remarks;
  return row;
}

// Production: the order is split into panels; each panel has its own work list
// (Mounting, Cut Out, Wiring, ...) with planned dates and the people doing it.
export function ProductionStage({ orderId, stage, setStageStatus, employees }: StageBodyProps) {
  const canEdit = useStageCanEdit();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelDialog, setPanelDialog] = useState<{ panel?: Panel } | null>(null);
  const [removing, setRemoving] = useState<Panel | null>(null);
  const [person, setPerson] = useState(EVERYONE);
  const today = todayIso();

  useEffect(() => {
    let active = true;
    void Promise.all([
      supabase
        .from("production_panels")
        .select("*")
        .eq("inward_order_id", orderId)
        .order("display_order")
        .order("created_at"),
      supabase
        .from("production_tasks")
        .select("*")
        .eq("inward_order_id", orderId)
        .order("display_order")
        .order("created_at"),
    ]).then(([p, t]) => {
      if (!active) return;
      if (p.error || t.error) toast.error("Could not load production work");
      setPanels(((p.data ?? []) as PanelRow[]).map(mapPanel));
      setTasks(((t.data ?? []) as TaskRow[]).map(mapTask));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [orderId]);

  function syncStatus(next: Task[]) {
    if (!stage || !next.length) return;
    const allDone = next.every((t) => t.status === "done");
    if (allDone && stage.status !== "done") {
      void setStageStatus("done");
      toast.success("All panel work done — Production marked done");
    } else if (
      !allDone &&
      stage.status === "not started" &&
      next.some((t) => t.status !== "pending")
    ) {
      void setStageStatus("in progress");
    }
  }

  async function updateTask(task: Task, patch: TaskPatch) {
    // Starting work fills the start date; finishing it records the day.
    const full: TaskPatch = { ...patch };
    if (patch.status === "done" && task.status !== "done") full.completedOn = today;
    if (patch.status && patch.status !== "done" && task.completedOn) full.completedOn = undefined;
    if (patch.status === "in progress" && !task.startDate) full.startDate = today;
    const previous = tasks;
    const next = tasks.map((t) => (t.id === task.id ? { ...t, ...full } : t));
    setTasks(next);
    const { error } = await supabase
      .from("production_tasks")
      .update(patchToRow(full))
      .eq("id", task.id);
    if (error) {
      setTasks(previous);
      toast.error("Could not save");
      return;
    }
    if ("status" in patch) syncStatus(next);
  }

  async function assignAll(panelId: string, assignees: string[]) {
    const previous = tasks;
    setTasks(tasks.map((t) => (t.panelId === panelId ? { ...t, assignees } : t)));
    const { error } = await supabase
      .from("production_tasks")
      .update({ assignees })
      .eq("panel_id", panelId);
    if (error) {
      setTasks(previous);
      toast.error("Could not assign");
    }
  }

  async function addTasks(panelId: string, works: string[], defaults: TaskPatch = {}) {
    const offset = tasks.filter((t) => t.panelId === panelId).length;
    const { data, error } = await supabase
      .from("production_tasks")
      .insert(
        works.map((work, index) => ({
          inward_order_id: orderId,
          panel_id: panelId,
          work,
          display_order: offset + index,
          ...patchToRow(defaults),
        })),
      )
      .select();
    if (error || !data) {
      toast.error("Could not add work");
      return;
    }
    setTasks((current) => [...current, ...(data as TaskRow[]).map(mapTask)]);
  }

  async function removeTask(task: Task) {
    const previous = tasks;
    setTasks(tasks.filter((t) => t.id !== task.id));
    const { error } = await supabase.from("production_tasks").delete().eq("id", task.id);
    if (error) {
      setTasks(previous);
      toast.error("Could not remove");
    }
  }

  async function savePanel(form: PanelForm, existing?: Panel) {
    const row = {
      panel_type: form.panelType.trim(),
      tag: form.tag.trim(),
      quantity: Math.max(1, Number(form.quantity) || 1),
      notes: form.notes.trim(),
    };
    if (existing) {
      const { error } = await supabase.from("production_panels").update(row).eq("id", existing.id);
      if (error) {
        toast.error("Could not save the panel");
        return false;
      }
      setPanels((current) =>
        current.map((p) =>
          p.id === existing.id
            ? {
                ...p,
                panelType: row.panel_type,
                tag: row.tag,
                quantity: row.quantity,
                notes: row.notes,
              }
            : p,
        ),
      );
      return true;
    }
    const { data, error } = await supabase
      .from("production_panels")
      .insert({ ...row, inward_order_id: orderId, display_order: panels.length })
      .select()
      .single();
    if (error || !data) {
      toast.error("Could not add the panel");
      return false;
    }
    const panel = mapPanel(data as PanelRow);
    setPanels((current) => [...current, panel]);
    if (form.works.length)
      await addTasks(panel.id, form.works, {
        assignees: form.team,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      });
    toast.success(`${panelLabel(panel)} added with ${form.works.length} work items`);
    return true;
  }

  async function removePanel(panel: Panel) {
    const previous = { panels, tasks };
    setPanels(panels.filter((p) => p.id !== panel.id));
    setTasks(tasks.filter((t) => t.panelId !== panel.id));
    const { error } = await supabase.from("production_panels").delete().eq("id", panel.id);
    if (error) {
      setPanels(previous.panels);
      setTasks(previous.tasks);
      toast.error("Could not delete the panel");
    }
  }

  const people = useMemo(
    () => [...new Set([...tasks.flatMap((t) => t.assignees)])].sort(),
    [tasks],
  );
  const visible = person === EVERYONE ? tasks : tasks.filter((t) => t.assignees.includes(person));
  const done = visible.filter((t) => t.status === "done").length;
  const running = visible.filter((t) => t.status === "in progress").length;
  const late = visible.filter((t) => isLate(t, today)).length;
  const percent = taskPercent(visible);

  if (loading) return <ListSkeleton sections={2} rows={5} />;

  return (
    <div className="mx-auto w-full max-w-[80vw] space-y-5 max-lg:max-w-full">
      {/* Summary + filter */}
      <div className="neo-surface flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl px-4 py-3 sm:px-5">
        <Stat label="Panels" value={panels.length} />
        <Stat label="Work done" value={`${done}/${visible.length}`} tone="text-emerald-600" />
        <Stat label="In progress" value={running} tone="text-sky-600" />
        <Stat label="Late" value={late} tone={late ? "text-rose-600" : "text-muted-foreground"} />
        <div className="min-w-[140px] flex-1">
          <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
            <span>{person === EVERYONE ? "Overall" : person}</span>
            <span className="text-cyan-600">{percent}%</span>
          </div>
          <div className="neo-inset mt-1 h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 transition-[width] duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            <Button onClick={() => setPanelDialog({})}>
              <Plus /> Add panel
            </Button>
          )}
        </div>
      </div>

      {panels.length === 0 ? (
        <button
          type="button"
          onClick={() => setPanelDialog({})}
          disabled={!canEdit}
          className="neo-surface flex w-full flex-col items-center gap-2 rounded-2xl px-4 py-12 text-center transition-colors hover:bg-primary/[0.03]"
        >
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-500 text-white shadow-md">
            <Factory className="h-6 w-6" />
          </span>
          <span className="text-base font-semibold text-foreground">
            Split this order into panels
          </span>
          <span className="max-w-md text-sm text-muted-foreground">
            Add each panel (Console, Test Bench, RIO Panel, …). Its work list — Mounting, Cut Out,
            Wiring and the rest — is created for you to assign and schedule.
          </span>
        </button>
      ) : (
        panels.map((panel) => {
          const panelTasks = tasks.filter((t) => t.panelId === panel.id);
          const shown =
            person === EVERYONE
              ? panelTasks
              : panelTasks.filter((t) => t.assignees.includes(person));
          if (person !== EVERYONE && !shown.length) return null;
          return (
            <PanelSection
              key={panel.id}
              panel={panel}
              tasks={panelTasks}
              shown={shown}
              today={today}
              employees={employees}
              onEdit={() => setPanelDialog({ panel })}
              onDelete={() => setRemoving(panel)}
              onUpdate={updateTask}
              onAdd={(works) => addTasks(panel.id, works)}
              onRemoveTask={(task) => void removeTask(task)}
              onAssignAll={(names) => void assignAll(panel.id, names)}
            />
          );
        })
      )}

      <PanelDialog
        key={panelDialog ? (panelDialog.panel?.id ?? "new") : "closed"}
        open={Boolean(panelDialog)}
        panel={panelDialog?.panel}
        employees={employees}
        onClose={() => setPanelDialog(null)}
        onSave={(form) => savePanel(form, panelDialog?.panel)}
      />

      <AlertDialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {removing ? panelLabel(removing) : "panel"}?</AlertDialogTitle>
            <AlertDialogDescription>
              The panel and all of its work items, dates and assignments will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removing) void removePanel(removing);
                setRemoving(null);
              }}
            >
              Delete panel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "text-foreground",
}: {
  label: string;
  value: number | string;
  tone?: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`text-xl font-bold leading-tight ${tone}`}>{value}</div>
    </div>
  );
}

const GRID = "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_132px_132px_140px_36px]";

function PanelSection({
  panel,
  tasks,
  shown,
  today,
  employees,
  onEdit,
  onDelete,
  onUpdate,
  onAdd,
  onRemoveTask,
  onAssignAll,
}: {
  panel: Panel;
  tasks: Task[];
  shown: Task[];
  today: string;
  employees: string[];
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (task: Task, patch: TaskPatch) => Promise<void>;
  onAdd: (works: string[]) => Promise<void>;
  onRemoveTask: (task: Task) => void;
  onAssignAll: (names: string[]) => void;
}) {
  const percent = taskPercent(tasks);
  const done = tasks.filter((t) => t.status === "done").length;
  const late = tasks.filter((t) => isLate(t, today)).length;
  const complete = tasks.length > 0 && done === tasks.length;
  const [open, setOpen] = useState(!complete);
  const [adding, setAdding] = useState("");
  const missing = WORK_TYPES.filter((w) => !tasks.some((t) => t.work === w));
  const starts = tasks
    .map((t) => t.startDate)
    .filter(Boolean)
    .sort() as string[];
  const ends = tasks
    .map((t) => t.endDate)
    .filter(Boolean)
    .sort() as string[];
  const team = [...new Set(tasks.flatMap((t) => t.assignees))];

  async function add(event?: FormEvent) {
    event?.preventDefault();
    const name = adding.trim();
    if (!name) return;
    await onAdd([name]);
    setAdding("");
  }

  return (
    <section className="neo-surface es-pop-in overflow-hidden rounded-2xl">
      <header
        className={`relative flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${open ? "border-b border-border/50" : ""}`}
      >
        <span
          className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${complete ? "from-emerald-400 to-green-500" : "from-cyan-400 to-sky-500"}`}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
          aria-expanded={open}
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
          />
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-sm ${complete ? "bg-emerald-500" : "bg-gradient-to-br from-cyan-500 to-sky-500"}`}
          >
            {complete ? (
              <Check className="h-4 w-4" strokeWidth={3} />
            ) : (
              <LayoutList className="h-4 w-4" />
            )}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate text-base font-bold text-foreground">
                {panel.panelType}
              </span>
              {panel.tag && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {panel.tag}
                </span>
              )}
              {panel.quantity > 1 && (
                <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700">
                  × {panel.quantity}
                </span>
              )}
              {late > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                  <AlertTriangle className="h-3 w-3" /> {late} late
                </span>
              )}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {done}/{tasks.length} done
              {starts.length > 0 &&
                ` · ${formatDay(starts[0])} → ${ends.length ? formatDay(ends[ends.length - 1]) : "?"}`}
              {panel.notes && ` · ${panel.notes}`}
            </span>
          </span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-28">
            <div className="text-right text-xs font-bold text-cyan-600">{percent}%</div>
            <div className="neo-inset mt-0.5 h-1.5 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ${complete ? "bg-emerald-500" : "bg-gradient-to-r from-cyan-400 to-sky-500"}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          <EditOnly>
            <AssigneePicker
              value={team}
              employees={employees}
              onChange={onAssignAll}
              compact
              placeholder="Assign all"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onEdit}
              aria-label="Edit panel"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              aria-label="Delete panel"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </EditOnly>
        </div>
      </header>

      {open && (
        <div>
          <div
            className={`hidden items-center gap-3 border-b border-border/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:grid ${GRID}`}
          >
            <span>Work</span>
            <span>Assigned to</span>
            <span>Start</span>
            <span>Finish</span>
            <span>Status</span>
            <span />
          </div>
          <EditLock>
          <ul className="divide-y divide-border/40">
            {shown.map((task) => (
              <TaskRowItem
                key={task.id}
                task={task}
                today={today}
                employees={employees}
                onUpdate={(patch) => void onUpdate(task, patch)}
                onRemove={() => onRemoveTask(task)}
              />
            ))}
          </ul>
          </EditLock>
          <EditOnly>
          <form
            onSubmit={(event) => void add(event)}
            className="flex flex-wrap items-center gap-2 border-t border-border/40 bg-muted/20 px-4 py-2"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            <Input
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              list={`work-types-${panel.id}`}
              placeholder="Add work…"
              className="h-8 max-w-56 flex-1 bg-transparent"
            />
            <datalist id={`work-types-${panel.id}`}>
              {missing.map((w) => (
                <option key={w} value={w} />
              ))}
            </datalist>
            {adding.trim() && (
              <Button type="submit" size="sm" className="h-8">
                Add
              </Button>
            )}
            {missing.slice(0, 4).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => void onAdd([w])}
                className="rounded-full border border-dashed border-muted-foreground/30 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                + {w}
              </button>
            ))}
          </form>
          </EditOnly>
        </div>
      )}
    </section>
  );
}

function TaskRowItem({
  task,
  today,
  employees,
  onUpdate,
  onRemove,
}: {
  task: Task;
  today: string;
  employees: string[];
  onUpdate: (patch: TaskPatch) => void;
  onRemove: () => void;
}) {
  const late = isLate(task, today);
  const meta = TASK_META[task.status];
  return (
    <li
      className={`group/row grid grid-cols-2 items-center gap-x-3 gap-y-1.5 px-4 py-2 transition-colors hover:bg-primary/[0.03] ${GRID} ${late ? "bg-rose-50/40" : ""}`}
    >
      <div className="col-span-2 flex min-w-0 items-center gap-2 lg:col-span-1">
        <button
          type="button"
          onClick={() => onUpdate({ status: task.status === "done" ? "pending" : "done" })}
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${task.status === "done" ? "border-emerald-500 bg-emerald-500 text-white" : task.status === "in progress" ? "border-sky-500 text-sky-500" : "border-muted-foreground/40 text-transparent hover:border-emerald-500 hover:text-emerald-500"}`}
          aria-label={
            task.status === "done" ? `Mark ${task.work} not done` : `Mark ${task.work} done`
          }
        >
          {task.status === "in progress" ? (
            <CircleDashed className="h-3 w-3" />
          ) : (
            <Check className="h-3 w-3" strokeWidth={3} />
          )}
        </button>
        <span
          className={`truncate text-sm font-medium ${task.status === "done" ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground"}`}
        >
          {task.work}
        </span>
        {task.completedOn && (
          <span className="shrink-0 text-[11px] text-emerald-600">
            ✓ {formatDay(task.completedOn)}
          </span>
        )}
        {late && <span className="shrink-0 text-[11px] font-semibold text-rose-600">late</span>}
      </div>
      <div className="col-span-2 min-w-0 lg:col-span-1">
        <AssigneePicker
          value={task.assignees}
          employees={employees}
          onChange={(assignees) => onUpdate({ assignees })}
        />
      </div>
      <DateCell
        label="Start"
        value={task.startDate}
        max={task.endDate}
        onChange={(startDate) => onUpdate({ startDate })}
      />
      <DateCell
        label="Finish"
        value={task.endDate}
        min={task.startDate}
        late={late}
        onChange={(endDate) => onUpdate({ endDate })}
      />
      <Select
        value={task.status}
        onValueChange={(status) => onUpdate({ status: status as TaskStatus })}
      >
        <SelectTrigger
          className={`h-8 border-0 text-xs font-semibold shadow-none ${meta.chip}`}
          aria-label="Status"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TASK_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${TASK_META[s].dot}`} />
                {TASK_META[s].label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <EditOnly fallback={<span />}>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 justify-self-end text-muted-foreground opacity-60 hover:text-destructive group-hover/row:opacity-100"
          onClick={onRemove}
          aria-label={`Remove ${task.work}`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </EditOnly>
    </li>
  );
}

function DateCell({
  label,
  value,
  min,
  max,
  late,
  onChange,
}: {
  label: string;
  value?: string;
  min?: string;
  max?: string;
  late?: boolean;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <label className="flex min-w-0 items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase text-muted-foreground lg:hidden">
        {label}
      </span>
      <input
        type="date"
        value={value ?? ""}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value || undefined)}
        aria-label={label}
        className={`h-8 w-full min-w-0 rounded-md bg-transparent px-1.5 text-xs outline-none transition-colors hover:bg-primary/[0.06] focus:bg-background focus:ring-2 focus:ring-primary/40 ${late ? "font-semibold text-rose-600" : value ? "text-foreground" : "text-muted-foreground"}`}
      />
    </label>
  );
}

type PanelForm = {
  panelType: string;
  tag: string;
  quantity: string;
  notes: string;
  works: string[];
  team: string[];
  startDate: string;
  endDate: string;
};

function PanelDialog({
  open,
  panel,
  employees,
  onClose,
  onSave,
}: {
  open: boolean;
  panel?: Panel;
  employees: string[];
  onClose: () => void;
  onSave: (form: PanelForm) => Promise<boolean>;
}) {
  const [form, setForm] = useState<PanelForm>(() => ({
    panelType: panel?.panelType ?? "",
    tag: panel?.tag ?? "",
    quantity: String(panel?.quantity ?? 1),
    notes: panel?.notes ?? "",
    works: [...WORK_TYPES],
    team: [],
    startDate: "",
    endDate: "",
  }));
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleWork(work: string) {
    setForm((f) => ({
      ...f,
      works: f.works.includes(work) ? f.works.filter((w) => w !== work) : [...f.works, work],
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.panelType.trim()) {
      toast.error("Choose the panel type");
      return;
    }
    setSaving(true);
    const ok = await onSave(form);
    setSaving(false);
    if (ok) onClose();
  }

  const allWorks = [...WORK_TYPES, ...form.works.filter((w) => !WORK_TYPES.includes(w))];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{panel ? "Edit panel" : "Add panel"}</DialogTitle>
            <DialogDescription>
              {panel
                ? "Change the panel's name, tag or quantity."
                : "Pick the panel and the work it needs. Each work item gets its own dates and people."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-primary">
              Panel type <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {PANEL_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, panelType: type }))}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${form.panelType === type ? "bg-cyan-600 text-white shadow-sm" : "neo-pop text-foreground/80 hover:text-primary"}`}
                >
                  {type}
                </button>
              ))}
            </div>
            <Input
              value={form.panelType}
              onChange={(e) => setForm((f) => ({ ...f, panelType: e.target.value }))}
              placeholder="…or type another panel name"
              className="mt-1"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
            <div className="space-y-1.5">
              <Label htmlFor="panel-tag" className="text-xs font-semibold text-primary">
                Tag / serial (optional)
              </Label>
              <Input
                id="panel-tag"
                value={form.tag}
                onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
                placeholder="e.g. Panel 1, ES/2610/01"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="panel-qty" className="text-xs font-semibold text-primary">
                Quantity
              </Label>
              <Input
                id="panel-qty"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>
          </div>

          {!panel && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-primary">
                    Work on this panel ({form.works.length})
                  </Label>
                  <div className="flex gap-2 text-[11px] font-medium">
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setForm((f) => ({ ...f, works: [...WORK_TYPES] }))}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground hover:underline"
                      onClick={() => setForm((f) => ({ ...f, works: [] }))}
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {allWorks.map((work) => {
                    const on = form.works.includes(work);
                    return (
                      <button
                        key={work}
                        type="button"
                        onClick={() => toggleWork(work)}
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${on ? "bg-cyan-50 text-cyan-900" : "text-muted-foreground hover:bg-muted/50"}`}
                      >
                        <span
                          className={`grid h-4 w-4 place-items-center rounded border ${on ? "border-cyan-600 bg-cyan-600 text-white" : "border-muted-foreground/40"}`}
                        >
                          {on && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                        {work}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder="Other work…"
                    className="h-8"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const name = custom.trim();
                        if (name && !form.works.includes(name))
                          setForm((f) => ({ ...f, works: [...f.works, name] }));
                        setCustom("");
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-primary">Team for all work</Label>
                  <div className="neo-inset rounded-lg px-1">
                    <AssigneePicker
                      value={form.team}
                      employees={employees}
                      onChange={(team) => setForm((f) => ({ ...f, team }))}
                      placeholder="Assign later"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="panel-start" className="text-xs font-semibold text-primary">
                    Planned start
                  </Label>
                  <Input
                    id="panel-start"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="panel-end" className="text-xs font-semibold text-primary">
                    Planned finish
                  </Label>
                  <Input
                    id="panel-end"
                    type="date"
                    min={form.startDate || undefined}
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">
                Team and dates are applied to every work item; change any of them per item
                afterwards.
              </p>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="panel-notes" className="text-xs font-semibold text-primary">
              Notes
            </Label>
            <Textarea
              id="panel-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Check /> {panel ? "Save" : "Add panel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
