import type { Database } from "@/integrations/supabase/types";

export type PanelRow = Database["public"]["Tables"]["production_panels"]["Row"];
export type TaskRow = Database["public"]["Tables"]["production_tasks"]["Row"];

// The panels an order is usually split into. Any other name can be typed in.
export const PANEL_TYPES = [
  "Console",
  "Test Bench",
  "CT PT Selection Panel",
  "RIO Panel",
  "LV Trolley",
  "TR Protection Panel",
  "VCB Panel",
  "Desk Panel",
  "Excitation Panel",
  "RTB",
  "JB",
  "PLC cum Control Panel",
  "NGR Panel",
  "Distribution Board",
];

// The usual work on a panel, in the order it is done.
export const WORK_TYPES = [
  "Mounting",
  "Cut Out",
  "Wiring",
  "Acrylic",
  "Testing",
  "Busbaring",
  "Gasket & Lock",
  "Additional Wiring",
  "Label",
  "Cleaning & Packaging",
];

export type TaskStatus = "pending" | "in progress" | "done";
export const TASK_STATUSES: TaskStatus[] = ["pending", "in progress", "done"];

export type Panel = {
  id: string;
  panelType: string;
  tag: string;
  quantity: number;
  notes: string;
  displayOrder: number;
};
export type Task = {
  id: string;
  panelId: string;
  work: string;
  assignees: string[];
  startDate?: string;
  endDate?: string;
  status: TaskStatus;
  completedOn?: string;
  remarks: string;
  displayOrder: number;
};

export function mapPanel(row: PanelRow): Panel {
  return {
    id: row.id,
    panelType: row.panel_type,
    tag: row.tag,
    quantity: Number(row.quantity) || 1,
    notes: row.notes,
    displayOrder: row.display_order,
  };
}
export function mapTask(row: TaskRow): Task {
  const status = TASK_STATUSES.includes(row.status as TaskStatus)
    ? (row.status as TaskStatus)
    : "pending";
  return {
    id: row.id,
    panelId: row.panel_id,
    work: row.work,
    assignees: Array.isArray(row.assignees) ? row.assignees.map(String) : [],
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    status,
    completedOn: row.completed_on ?? undefined,
    remarks: row.remarks,
    displayOrder: row.display_order,
  };
}

export function panelLabel(panel: Pick<Panel, "panelType" | "tag">) {
  return panel.tag ? `${panel.panelType} · ${panel.tag}` : panel.panelType;
}

export function taskPercent(tasks: Pick<Task, "status">[]) {
  if (!tasks.length) return 0;
  const score = tasks.reduce(
    (s, t) => s + (t.status === "done" ? 1 : t.status === "in progress" ? 0.5 : 0),
    0,
  );
  return Math.round((score / tasks.length) * 100);
}

// Late = not done and the planned finish has passed.
export function isLate(task: Pick<Task, "status" | "endDate">, today: string) {
  return task.status !== "done" && Boolean(task.endDate && task.endDate < today);
}

export const TASK_META: Record<TaskStatus, { label: string; dot: string; chip: string }> = {
  pending: { label: "Pending", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-600" },
  "in progress": { label: "In progress", dot: "bg-sky-500", chip: "bg-sky-100 text-sky-700" },
  done: { label: "Done", dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700" },
};
