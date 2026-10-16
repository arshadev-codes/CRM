import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DESIGNATIONS, type RatingRule } from "@/data/employeesData";
import { useProposalStore } from "@/store/proposalStore";
import { useIsAdmin } from "@/store/authStore";
import { ruleCovers } from "@/lib/ratingRules";

export const Route = createFileRoute("/employees/rating-rules")({
  head: () => ({ meta: [{ title: "Rating rules — Electrosoft Proposal Engine" }] }),
  component: RatingRulesPage,
});

const norm = (s?: string) => (s ?? "").trim().toLowerCase();

function uniqueSorted(values: (string | undefined)[]) {
  const seen = new Map<string, string>();
  for (const v of values) if (v?.trim() && !seen.has(norm(v))) seen.set(norm(v), v.trim());
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

// Admin page: which designation may rate which designation or department.
function RatingRulesPage() {
  const isAdmin = useIsAdmin();
  const employees = useProposalStore((s) => s.employees);
  const rules = useProposalStore((s) => s.ratingRules);
  const addRatingRule = useProposalStore((s) => s.addRatingRule);
  const deleteRatingRule = useProposalStore((s) => s.deleteRatingRule);
  const [rater, setRater] = useState("");
  const [targetKind, setTargetKind] = useState<RatingRule["targetKind"]>("designation");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);

  const active = useMemo(() => employees.filter((e) => e.active !== false), [employees]);
  const designations = useMemo(
    () => uniqueSorted([...DESIGNATIONS, ...employees.map((e) => e.designation)]),
    [employees],
  );
  const departments = useMemo(
    () => uniqueSorted(["Production", ...employees.map((e) => e.department)]),
    [employees],
  );

  async function add() {
    if (!rater.trim() || !target.trim()) return toast.error("Fill in both sides of the rule");
    const duplicate = rules.some(
      (r) => norm(r.raterDesignation) === norm(rater) && r.targetKind === targetKind && norm(r.target) === norm(target),
    );
    if (duplicate) return toast.error("This rule already exists");
    setSaving(true);
    const ok = await addRatingRule({ raterDesignation: rater.trim(), targetKind, target: target.trim() });
    setSaving(false);
    if (ok) {
      toast.success("Rule added");
      setRater("");
      setTarget("");
    }
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="neo-surface rounded-2xl py-16 text-center">
          <p className="text-slate-600">Only an admin can change rating rules.</p>
          <Link to="/employees" className="mt-3 inline-block text-sm font-semibold text-primary underline">
            Back to employees
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <Link to="/employees" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> All employees
      </Link>
      <h1 className="text-3xl font-bold tracking-tight text-slate-800">Rating rules</h1>
      <p className="mt-1 text-sm text-slate-500">
        Who may rate whom. A person rates others by their own designation; admins can rate everyone.
        Each login must be linked to its employee (Users page) for this to work.
      </p>

      {/* Add a rule */}
      <div className="neo-surface mt-5 rounded-2xl p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Who rates (designation)</span>
            <Input className="mt-1" list="rr-designations" value={rater} onChange={(e) => setRater(e.target.value)} placeholder="e.g. Sales Manager" />
          </label>
          <span className="hidden pb-2.5 text-xs font-medium text-slate-500 sm:block">can rate</span>
          <div>
            <div className="flex gap-1 text-xs">
              {(["designation", "department"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTargetKind(k)}
                  className={`rounded-full px-2.5 py-0.5 font-medium ${targetKind === k ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-600"}`}
                >
                  {k === "designation" ? "Designation" : "Whole department"}
                </button>
              ))}
            </div>
            <Input
              className="mt-1"
              list={targetKind === "designation" ? "rr-designations" : "rr-departments"}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={targetKind === "designation" ? "e.g. Site Engineer" : "e.g. Production"}
            />
          </div>
        </div>
        <datalist id="rr-designations">{designations.map((d) => <option key={d} value={d} />)}</datalist>
        <datalist id="rr-departments">{departments.map((d) => <option key={d} value={d} />)}</datalist>
        <div className="mt-3 flex justify-end">
          <Button onClick={() => void add()} disabled={saving}>
            <Plus className="h-4 w-4" /> Add rule
          </Button>
        </div>
      </div>

      {/* Rules */}
      <div className="mt-5 space-y-2">
        {rules.length === 0 && (
          <p className="neo-surface rounded-2xl py-10 text-center text-sm text-slate-500">
            No rules yet. Only admins can give ratings until you add one.
          </p>
        )}
        {rules.map((rule) => {
          const raters = active.filter((e) => norm(e.designation) === norm(rule.raterDesignation));
          const targets = active.filter((t) => raters.some((r) => r.id !== t.id && ruleCovers(rule, r, t)));
          return (
            <div key={rule.id} className="neo-surface flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-800">
                  {rule.raterDesignation}
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  {rule.targetKind === "department" ? `Everyone in ${rule.target}` : rule.target}
                </p>
                <p className={`mt-0.5 text-xs ${raters.length && targets.length ? "text-slate-500" : "text-amber-600"}`}>
                  {raters.length} {raters.length === 1 ? "person rates" : "people rate"} · {targets.length}{" "}
                  {targets.length === 1 ? "person" : "people"} can be rated
                  {!raters.length || !targets.length ? " — check the spelling matches the employees" : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete rule"
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => {
                  deleteRatingRule(rule.id);
                  toast.success("Rule removed");
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
