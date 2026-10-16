import type { Database } from "@/integrations/supabase/types";

export type SiteTaskRow = Database["public"]["Tables"]["commissioning_tasks"]["Row"];

// The usual work at the client's site after dispatch, in the order it is done.
export const SITE_WORK_TYPES = [
  "Unloading & placement",
  "Panel installation & alignment",
  "Cable laying",
  "Cable termination",
  "Earthing",
  "Power-on / energisation",
  "Software installation",
  "Functional testing at site",
  "Client training",
  "Handover & sign-off",
];

/** "not done" is the site engineer saying the work could not be finished (with a reason). */
export type SiteStatus = "pending" | "in progress" | "done" | "not done";
export const SITE_STATUSES: SiteStatus[] = ["pending", "in progress", "done", "not done"];

export type SiteTask = {
  id: string;
  orderId: string;
  title: string;
  details: string;
  /** Names, for display. */
  assignees: string[];
  /** Employee ids of the same people; access, notifications and points follow these. */
  assigneeIds: string[];
  startDate?: string;
  endDate?: string;
  status: SiteStatus;
  completedOn?: string;
  confirmedBy: string;
  confirmedAt?: string;
  remarks: string;
  displayOrder: number;
};

export function mapSiteTask(row: SiteTaskRow): SiteTask {
  const status = SITE_STATUSES.includes(row.status as SiteStatus)
    ? (row.status as SiteStatus)
    : "pending";
  return {
    id: row.id,
    orderId: row.inward_order_id,
    title: row.title,
    details: row.details,
    assignees: Array.isArray(row.assignees) ? row.assignees.map(String) : [],
    assigneeIds: row.assignee_ids ?? [],
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    status,
    completedOn: row.completed_on ?? undefined,
    confirmedBy: row.confirmed_by,
    confirmedAt: row.confirmed_at ?? undefined,
    remarks: row.remarks,
    displayOrder: row.display_order,
  };
}

/** Done counts fully, started counts half; "not done" counts nothing. */
export function sitePercent(tasks: Pick<SiteTask, "status">[]) {
  if (!tasks.length) return 0;
  const score = tasks.reduce(
    (s, t) => s + (t.status === "done" ? 1 : t.status === "in progress" ? 0.5 : 0),
    0,
  );
  return Math.round((score / tasks.length) * 100);
}

export function isSiteLate(task: Pick<SiteTask, "status" | "endDate">, today: string) {
  return task.status !== "done" && Boolean(task.endDate && task.endDate < today);
}

export const SITE_META: Record<SiteStatus, { label: string; dot: string; chip: string }> = {
  pending: { label: "Not started", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-600" },
  "in progress": { label: "Started", dot: "bg-sky-500", chip: "bg-sky-100 text-sky-700" },
  done: { label: "Done", dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700" },
  "not done": { label: "Not done", dot: "bg-rose-500", chip: "bg-rose-100 text-rose-700" },
};
