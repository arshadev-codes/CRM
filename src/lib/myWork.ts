import { supabase } from "@/lib/db";
import type { Database } from "@/integrations/supabase/types";
import {
  mapPanel,
  mapTask,
  type Panel,
  type PanelRow,
  type Task,
  type TaskRow,
} from "@/lib/production";
import type { AppUser } from "@/store/authStore";

// What the phone app shows one person: the orders where they have work, with their panels
// and tasks. The database already limits field staff to this; office staff opening the app
// get the same personal view by the filtering here.

export type OrderRow = Database["public"]["Tables"]["inward_orders"]["Row"];

export type MyOrder = {
  order: OrderRow;
  panels: Panel[];
  tasks: Task[];
  /** Order stages (Design, Testing, ...) assigned to this person. */
  stages: string[];
};

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export async function loadMyWork(user: AppUser): Promise<MyOrder[]> {
  const [panelResult, taskResult, stageResult] = await Promise.all([
    supabase.from("production_panels").select("*").order("display_order"),
    supabase.from("production_tasks").select("*").order("display_order"),
    supabase.from("project_stages").select("inward_order_id, stage_name, assigned_to, assignee_id"),
  ]);
  const error = panelResult.error ?? taskResult.error ?? stageResult.error;
  if (error) throw error;

  const panels = ((panelResult.data ?? []) as PanelRow[]).map(mapPanel);
  const tasks = ((taskResult.data ?? []) as TaskRow[]).map(mapTask);
  const panelOrder = new Map(
    ((panelResult.data ?? []) as PanelRow[]).map((row) => [row.id, row.inward_order_id]),
  );

  // By employee id; a login not linked to an employee (office staff) falls back to the name.
  const isMine = (task: Task) =>
    user.employeeId
      ? task.assigneeIds.includes(user.employeeId)
      : task.assignees.some((name) => same(name, user.name));
  const myPanelIds = new Set(
    panels
      .filter(
        (p) =>
          (user.employeeId && p.assigneeIds.includes(user.employeeId)) ||
          tasks.some((t) => t.panelId === p.id && isMine(t)),
      )
      .map((p) => p.id),
  );
  // On a panel assigned to me I see all its work; elsewhere only my own tasks.
  const myTasks = tasks.filter(
    (t) =>
      myPanelIds.has(t.panelId) &&
      (isMine(t) ||
        panels.some(
          (p) => p.id === t.panelId && user.employeeId && p.assigneeIds.includes(user.employeeId),
        )),
  );

  const byOrder = new Map<string, MyOrder>();
  const entry = (orderId: string) => {
    let found = byOrder.get(orderId);
    if (!found) {
      found = { order: null as unknown as OrderRow, panels: [], tasks: [], stages: [] };
      byOrder.set(orderId, found);
    }
    return found;
  };
  for (const panel of panels) {
    if (!myPanelIds.has(panel.id)) continue;
    entry(panelOrder.get(panel.id)!).panels.push(panel);
  }
  for (const task of myTasks) entry(panelOrder.get(task.panelId)!).tasks.push(task);
  for (const stage of stageResult.data ?? []) {
    const mine = user.employeeId
      ? stage.assignee_id === user.employeeId
      : Boolean(stage.assigned_to) && same(stage.assigned_to, user.name);
    if (mine)
      entry(stage.inward_order_id).stages.push(stage.stage_name);
  }

  const ids = [...byOrder.keys()];
  if (!ids.length) return [];
  const { data: orders, error: orderError } = await supabase
    .from("inward_orders")
    .select("*")
    .in("id", ids);
  if (orderError) throw orderError;
  for (const order of (orders ?? []) as OrderRow[]) entry(order.id).order = order;
  return [...byOrder.values()]
    .filter((item) => item.order)
    .sort((a, b) => (a.order.readiness_date ?? "").localeCompare(b.order.readiness_date ?? ""));
}
