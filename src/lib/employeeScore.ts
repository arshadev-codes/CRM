import type { EmployeeRating } from "@/data/employeesData";
import type { WorkItem } from "@/lib/employeeWork";

// All the scoring rules in one place, so they are easy to change.
export const POINTS = {
  onTime: 10,
  late: 5,
  overdue: -2,
  perStar: 4,
} as const;

export type Score = {
  total: number;
  onTime: { count: number; points: number };
  late: { count: number; points: number };
  overdue: { count: number; points: number };
  ratings: { count: number; points: number };
  avgStars: number;
};

export function scoreEmployee(work: WorkItem[], ratings: EmployeeRating[]): Score {
  const onTime = work.filter((w) => w.done && !w.late).length;
  const late = work.filter((w) => w.done && w.late).length;
  const overdue = work.filter((w) => !w.done && w.late).length;
  const stars = ratings.reduce((sum, r) => sum + r.stars, 0);
  const s: Score = {
    onTime: { count: onTime, points: onTime * POINTS.onTime },
    late: { count: late, points: late * POINTS.late },
    overdue: { count: overdue, points: overdue * POINTS.overdue },
    ratings: { count: ratings.length, points: stars * POINTS.perStar },
    avgStars: ratings.length ? stars / ratings.length : 0,
    total: 0,
  };
  s.total = s.onTime.points + s.late.points + s.overdue.points + s.ratings.points;
  return s;
}
