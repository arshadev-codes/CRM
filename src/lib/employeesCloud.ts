import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import type { Employee, EmployeeRating, EmployeeScope, RatingRule } from "@/data/employeesData";

// Employees and ratings are kept in the database so every computer sees the same list.
// The store keeps a copy for instant screens; these helpers read and write the database.

type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];
type RatingRow = Database["public"]["Tables"]["employee_ratings"]["Row"];
type RuleRow = Database["public"]["Tables"]["rating_rules"]["Row"];

function fromEmployeeRow(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.name,
    designation: row.designation,
    scope: row.scope as EmployeeScope,
    phone: row.phone ?? undefined,
    department: row.department ?? undefined,
    joinedOn: row.joined_on ?? undefined,
    active: row.active,
  };
}

function toEmployeeRow(e: Employee) {
  return {
    id: e.id,
    name: e.name.trim(),
    designation: e.designation ?? "",
    scope: e.scope ?? "quotation",
    phone: e.phone || null,
    department: e.department || null,
    joined_on: e.joinedOn || null,
    active: e.active ?? true,
  };
}

function fromRatingRow(row: RatingRow): EmployeeRating {
  return {
    id: row.id,
    employeeId: row.employee_id,
    stars: row.stars,
    comment: row.comment,
    ratedBy: row.rated_by,
    ratedById: row.rated_by_id ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    taskRef: (row.task_ref as EmployeeRating["taskRef"]) ?? undefined,
  };
}

function toRatingRow(r: EmployeeRating) {
  return {
    id: r.id,
    employee_id: r.employeeId,
    stars: r.stars,
    comment: r.comment,
    rated_by: r.ratedBy,
    rated_by_id: r.ratedById ?? null,
    task_ref: (r.taskRef ?? null) as Json,
    created_at: new Date(r.createdAt).toISOString(),
  };
}

function failed(what: string, error: { message: string }) {
  console.warn(`[employees] ${what} failed:`, error.message);
  toast.error(`Could not save ${what} — check your connection or permission`);
}

export async function loadEmployeesFromCloud() {
  const [people, ratings] = await Promise.all([
    supabase.from("employees").select("*").order("created_at"),
    supabase.from("employee_ratings").select("*").order("created_at", { ascending: false }),
  ]);
  if (people.error || ratings.error) return null;
  return {
    employees: people.data.map(fromEmployeeRow),
    ratings: ratings.data.map(fromRatingRow),
  };
}

/** Uploads what this browser had before the list moved online. Already-known ids are skipped. */
export async function uploadLocalEmployees(employees: Employee[], ratings: EmployeeRating[]) {
  if (employees.length) {
    const { error } = await supabase
      .from("employees")
      .upsert(employees.map(toEmployeeRow), { onConflict: "id", ignoreDuplicates: true });
    if (error) return false;
  }
  if (ratings.length) {
    const { error } = await supabase
      .from("employee_ratings")
      .upsert(ratings.map(toRatingRow), { onConflict: "id", ignoreDuplicates: true });
    if (error) return false;
  }
  return true;
}

export async function saveEmployee(e: Employee) {
  const { error } = await supabase.from("employees").upsert(toEmployeeRow(e), { onConflict: "id" });
  if (error) failed("the employee", error);
}

export async function removeEmployee(id: string) {
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) failed("the employee", error);
}

export async function saveRating(r: EmployeeRating) {
  const { error } = await supabase.from("employee_ratings").insert(toRatingRow(r));
  if (error) failed("the rating", error);
}

export async function removeRating(id: string) {
  const { error } = await supabase.from("employee_ratings").delete().eq("id", id);
  if (error) failed("the rating", error);
}

function fromRuleRow(row: RuleRow): RatingRule {
  return {
    id: row.id,
    raterDesignation: row.rater_designation,
    targetKind: row.target_kind === "department" ? "department" : "designation",
    target: row.target,
  };
}

export async function loadRatingRules(): Promise<RatingRule[] | null> {
  const { data, error } = await supabase.from("rating_rules").select("*").order("created_at");
  if (error) return null;
  return data.map(fromRuleRow);
}

export async function saveRatingRule(r: RatingRule) {
  const { error } = await supabase.from("rating_rules").insert({
    id: r.id,
    rater_designation: r.raterDesignation.trim(),
    target_kind: r.targetKind,
    target: r.target.trim(),
  });
  if (error) failed("the rating rule", error);
  return !error;
}

export async function removeRatingRule(id: string) {
  const { error } = await supabase.from("rating_rules").delete().eq("id", id);
  if (error) failed("the rating rule", error);
}
