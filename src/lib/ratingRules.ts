import type { Employee, RatingRule } from "@/data/employeesData";
import { useProposalStore } from "@/store/proposalStore";
import { useCurrentUser, type AppUser } from "@/store/authStore";

// Who may rate whom. Mirrors public.can_rate() in the database, which has the final say:
// admins rate anyone; everyone else rates the people a rating rule covers, as themselves.

const norm = (s?: string) => (s ?? "").trim().toLowerCase();

/** Does this rule let `rater` rate `target`? */
export function ruleCovers(rule: RatingRule, rater: Employee, target: Employee): boolean {
  if (norm(rule.raterDesignation) !== norm(rater.designation)) return false;
  const value = rule.targetKind === "department" ? target.department : target.designation;
  return norm(rule.target) === norm(value);
}

export function canRate(
  user: AppUser | null,
  rater: Employee | undefined,
  target: Employee,
  rules: RatingRule[],
): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  if (!rater || rater.active === false || target.active === false || rater.id === target.id) return false;
  return rules.some((r) => ruleCovers(r, rater, target));
}

/** The employee the signed-in login is linked to, if any. */
export function useMyEmployee(): Employee | undefined {
  const user = useCurrentUser();
  return useProposalStore((s) => s.employees.find((e) => e.id === user?.employeeId));
}

/** A function telling whether the signed-in person may rate an employee. */
export function useCanRate(): (target: Employee) => boolean {
  const user = useCurrentUser();
  const me = useMyEmployee();
  const rules = useProposalStore((s) => s.ratingRules);
  return (target) => canRate(user, me, target, rules);
}
