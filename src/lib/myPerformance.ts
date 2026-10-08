import { supabase } from "@/lib/db";
import { POINTS } from "@/lib/employeeScore";
import { loadWorkByPerson, nameKey, type WorkItem } from "@/lib/employeeWork";
import type { AppUser } from "@/store/authStore";

// The phone app's Performance tab: one person's finished and overdue work with the points
// each earned or lost (rules in employeeScore.ts), totalled by month and by project.

export type ScoredItem = WorkItem & {
  points: number;
  result: "on-time" | "late" | "overdue";
  /** Day the points count for: when it was finished, or when it fell due. */
  date?: string;
  project: string;
};

export type MonthTotal = { month: string; label: string; earned: number; deducted: number };
export type ProjectTotal = { orderId: string; project: string; points: number; items: number };

export type MyPerformance = {
  items: ScoredItem[];
  total: number;
  earned: number;
  deducted: number;
  onTime: number;
  late: number;
  overdue: number;
  open: number;
  months: MonthTotal[];
  projects: ProjectTotal[];
};

function score(item: WorkItem): Pick<ScoredItem, "points" | "result"> | null {
  if (item.done && !item.late) return { points: POINTS.onTime, result: "on-time" };
  if (item.done) return { points: POINTS.late, result: "late" };
  if (item.late) return { points: POINTS.overdue, result: "overdue" };
  return null; // still open and not due yet: no points either way
}

// The last `count` months, oldest first, as "2026-10".
function recentMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return {
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-IN", { month: "short" }),
    };
  });
}

export async function loadMyPerformance(user: AppUser): Promise<MyPerformance> {
  const [byPerson, orders] = await Promise.all([
    loadWorkByPerson({ lenient: true }),
    supabase.from("inward_orders").select("id, project_number, customer_name"),
  ]);
  const projectOf = new Map(
    (orders.data ?? []).map((o) => [
      o.id,
      [o.project_number, o.customer_name].filter(Boolean).join(" · ") || "Order",
    ]),
  );

  const work = byPerson.get(nameKey(user.name)) ?? [];
  const items: ScoredItem[] = [];
  for (const item of work) {
    const scored = score(item);
    if (!scored) continue;
    items.push({
      ...item,
      ...scored,
      date: item.done ? item.completedOn : item.dueDate,
      project: projectOf.get(item.orderId) ?? "Order",
    });
  }
  items.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const months = recentMonths(6).map((m) => ({ ...m, earned: 0, deducted: 0 }));
  const projects = new Map<string, ProjectTotal>();
  for (const item of items) {
    const month = months.find((m) => item.date?.startsWith(m.month));
    if (month) {
      if (item.points > 0) month.earned += item.points;
      else month.deducted += item.points;
    }
    const project = projects.get(item.orderId) ?? {
      orderId: item.orderId,
      project: item.project,
      points: 0,
      items: 0,
    };
    project.points += item.points;
    project.items += 1;
    projects.set(item.orderId, project);
  }

  const earned = items.filter((i) => i.points > 0).reduce((sum, i) => sum + i.points, 0);
  const deducted = items.filter((i) => i.points < 0).reduce((sum, i) => sum + i.points, 0);
  return {
    items,
    total: earned + deducted,
    earned,
    deducted,
    onTime: items.filter((i) => i.result === "on-time").length,
    late: items.filter((i) => i.result === "late").length,
    overdue: items.filter((i) => i.result === "overdue").length,
    open: work.filter((w) => !w.done && !w.late).length,
    months,
    projects: [...projects.values()].sort((a, b) => b.points - a.points),
  };
}
