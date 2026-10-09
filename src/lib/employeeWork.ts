import { supabase } from "@/lib/db";
import { stagePageSlug, type StagePageSlug } from "@/lib/stages";
import { panelLabel } from "@/lib/production";
import type { RatingSource } from "@/data/employeesData";

// One piece of work someone is (or was) responsible for, gathered from the
// production tasks, order stages and QA action points. Tasks and stages are matched by
// employee id; QA action points (whose owner is typed in) by name.
export type WorkItem = {
  key: string;
  kind: RatingSource;
  id: string;
  title: string;
  context: string;
  orderId: string;
  stageSlug?: StagePageSlug;
  status: string;
  done: boolean;
  dueDate?: string;
  completedOn?: string;
  /** Open and past due, or finished after the due date. */
  late: boolean;
};

export const SOURCE_LABEL: Record<RatingSource, string> = {
  production: "Production task",
  stage: "Order stage",
  qa: "QA action",
};

export function nameKey(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

const idKey = (id: string) => `id:${id}`;

/** One person's work: everything under their employee id, plus anything still under their name. */
export function workFor(
  byPerson: Map<string, WorkItem[]>,
  person: { id?: string | null; name: string },
): WorkItem[] {
  const list = [
    ...(person.id ? (byPerson.get(idKey(person.id)) ?? []) : []),
    ...(byPerson.get(nameKey(person.name)) ?? []),
  ];
  const seen = new Set<string>();
  return list.filter((item) => !seen.has(item.key) && Boolean(seen.add(item.key)));
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

function lateFor(
  done: boolean,
  dueDate: string | undefined,
  completedOn: string | undefined,
  now: string,
) {
  if (!dueDate) return false;
  if (done) return Boolean(completedOn && completedOn > dueDate);
  return dueDate < now;
}

/**
 * Every work item in the system, keyed by employee id (`id:<id>`) or, where no id is known,
 * by assignee name (normalised); read one person's list with `workFor`. With `lenient`, a table
 * this account may not read (field staff in the phone app) counts as empty instead of failing.
 */
export async function loadWorkByPerson({ lenient = false } = {}): Promise<Map<string, WorkItem[]>> {
  const now = today();
  const [tasks, panels, stages, points] = await Promise.all([
    supabase.from("production_tasks").select("*"),
    supabase.from("production_panels").select("*"),
    supabase.from("project_stages").select("*"),
    supabase.from("mom_points").select("*"),
  ]);
  const firstError = tasks.error ?? panels.error ?? stages.error ?? points.error;
  if (firstError && !lenient) throw firstError;

  const byPerson = new Map<string, WorkItem[]>();
  const add = (person: string, item: WorkItem, byId = false) => {
    const key = byId ? idKey(person) : nameKey(person);
    if (!key) return;
    const list = byPerson.get(key) ?? [];
    if (!list.some((w) => w.key === item.key)) list.push(item);
    byPerson.set(key, list);
  };

  const panelById = new Map((panels.data ?? []).map((p) => [p.id, p]));
  for (const t of tasks.data ?? []) {
    const done = t.status === "done";
    const panel = panelById.get(t.panel_id);
    const dueDate = t.end_date ?? undefined;
    const completedOn = t.completed_on ?? undefined;
    const item: WorkItem = {
      key: `production:${t.id}`,
      kind: "production",
      id: t.id,
      title: t.work || "Production work",
      context: panel ? panelLabel({ panelType: panel.panel_type, tag: panel.tag }) : "Production",
      orderId: t.inward_order_id,
      stageSlug: "production",
      status: t.status,
      done,
      dueDate,
      completedOn,
      late: lateFor(done, dueDate, completedOn, now),
    };
    const ids = t.assignee_ids ?? [];
    if (ids.length) for (const id of ids) add(id, item, true);
    else {
      const assignees: unknown[] = Array.isArray(t.assignees) ? t.assignees : [];
      for (const person of assignees) add(String(person), item);
    }
  }

  for (const s of stages.data ?? []) {
    if (!s.assigned_to?.trim()) continue;
    const done = s.status === "done";
    const dueDate = s.expected_date ?? undefined;
    const completedOn = done ? s.updated_at.slice(0, 10) : undefined;
    const stageItem: WorkItem = {
      key: `stage:${s.id}`,
      kind: "stage",
      id: s.id,
      title: s.stage_name,
      context: "Stage owner",
      orderId: s.inward_order_id,
      stageSlug: stagePageSlug(s.stage_name),
      status: s.status,
      done,
      dueDate,
      completedOn,
      late: lateFor(done, dueDate, completedOn, now),
    };
    if (s.assignee_id) add(s.assignee_id, stageItem, true);
    else add(s.assigned_to, stageItem);
  }

  for (const p of points.data ?? []) {
    if (!p.owner?.trim()) continue;
    const done = p.status === "closed";
    const dueDate = p.due_date ?? undefined;
    const completedOn = done && p.closed_at ? p.closed_at.slice(0, 10) : undefined;
    add(p.owner, {
      key: `qa:${p.id}`,
      kind: "qa",
      id: p.id,
      title: p.action || p.description || "QA action point",
      context: "QA action point",
      orderId: p.inward_order_id,
      stageSlug: "testing",
      status: p.status,
      done,
      dueDate,
      completedOn,
      late: lateFor(done, dueDate, completedOn, now),
    });
  }

  return byPerson;
}
