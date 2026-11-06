import { isWorkshopPerson } from "@/data/employeesData";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useProposalStore } from "@/store/proposalStore";
import type { Employee, EmployeeRating } from "@/data/employeesData";
import { loadWorkByPerson, workFor, type WorkItem } from "@/lib/employeeWork";
import { scoreEmployee, type Score } from "@/lib/employeeScore";

export type EmployeeSummary = {
  employee: Employee;
  current: WorkItem[];
  completed: WorkItem[];
  ratings: EmployeeRating[];
  score: Score;
  /** 1 = most points, among active employees. */
  rank: number;
  busy: boolean;
};

const byDueDate = (a: WorkItem, b: WorkItem) =>
  (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
const byCompleted = (a: WorkItem, b: WorkItem) =>
  (b.completedOn ?? "").localeCompare(a.completedOn ?? "");

export function useEmployeeDirectory() {
  const allEmployees = useProposalStore((s) => s.employees);
  const employees = useMemo(() => allEmployees.filter(isWorkshopPerson), [allEmployees]);
  const ratings = useProposalStore((s) => s.ratings);
  const orders = useProposalStore((s) => s.inwardOrders);
  const hydrateOrders = useProposalStore((s) => s.hydrateInwardOrders);
  const [work, setWork] = useState<Map<string, WorkItem[]> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    loadWorkByPerson()
      .then(setWork)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Could not load work");
        setWork(new Map());
      });
  }, []);

  useEffect(() => {
    void hydrateOrders();
    reload();
  }, [hydrateOrders, reload]);

  const summaries = useMemo<EmployeeSummary[]>(() => {
    const list = employees.map((employee) => {
      const items = work ? workFor(work, employee) : [];
      const own = ratings.filter((r) => r.employeeId === employee.id);
      const current = items.filter((w) => !w.done).sort(byDueDate);
      return {
        employee,
        current,
        completed: items.filter((w) => w.done).sort(byCompleted),
        ratings: own,
        score: scoreEmployee(items, own),
        rank: 0,
        busy: current.length > 0,
      };
    });
    const ranked = list
      .filter((s) => s.employee.active !== false)
      .sort((a, b) => b.score.total - a.score.total);
    ranked.forEach((s, i) => {
      s.rank = i > 0 && s.score.total === ranked[i - 1].score.total ? ranked[i - 1].rank : i + 1;
    });
    return list;
  }, [employees, ratings, work]);

  const orderLabel = useCallback(
    (orderId: string) => {
      const o = orders.find((x) => x.id === orderId);
      return o ? o.projectNumber || o.projectName || "Order" : "Order";
    },
    [orders],
  );

  return { summaries, loading: work === null, error, reload, orderLabel };
}
