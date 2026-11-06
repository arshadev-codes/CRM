import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle, ArrowLeft, Briefcase, Building2, CalendarDays, CheckCircle2, Clock, Pencil, Phone,
  Plus, Star, Trash2, Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/stages/AssigneePicker";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stars } from "@/components/employees/Stars";
import { RatingDialog } from "@/components/employees/RatingDialog";
import { EmployeeFormDialog } from "@/components/employees/EmployeeFormDialog";
import { Can } from "@/components/auth/Can";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEmployeeDirectory } from "@/components/employees/useEmployeeDirectory";
import { useProposalStore } from "@/store/proposalStore";
import { requireAdminPassword } from "@/lib/passwordGate";
import { POINTS } from "@/lib/employeeScore";
import { useCanRate } from "@/lib/ratingRules";
import { SOURCE_LABEL, type WorkItem } from "@/lib/employeeWork";
import type { EmployeeRating } from "@/data/employeesData";

export const Route = createFileRoute("/employees/$id")({
  head: () => ({ meta: [{ title: "Employee — Electrosoft Proposal Engine" }] }),
  component: EmployeeProfile,
});

function formatDate(date?: string | number) {
  if (!date) return "—";
  const d = typeof date === "number" ? new Date(date) : new Date(`${date}T00:00:00`);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function EmployeeProfile() {
  const { id } = Route.useParams();
  const { summaries, loading, error, reload, orderLabel } = useEmployeeDirectory();
  const deleteRating = useProposalStore((s) => s.deleteRating);
  const deleteEmployee = useProposalStore((s) => s.deleteEmployee);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [rating, setRating] = useState<{ open: boolean; task?: EmployeeRating["taskRef"] }>({ open: false });

  const canRate = useCanRate();

  const s = summaries.find((x) => x.employee.id === id);
  if (!s) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="neo-surface rounded-2xl py-16 text-center">
          <p className="text-slate-600">Employee not found.</p>
          <Link to="/employees" className="mt-3 inline-block text-sm font-semibold text-primary underline">
            Back to employees
          </Link>
        </div>
      </div>
    );
  }

  const { employee, score, current, completed, ratings } = s;
  const ratedKeys = new Set(ratings.map((r) => r.taskRef && `${r.taskRef.kind}:${r.taskRef.id}`));
  const mayRate = canRate(employee);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <Link to="/employees" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> All employees
      </Link>

      {/* Header */}
      <div className="neo-surface mb-5 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="scale-150 p-2">
            <Avatar name={employee.name} size="md" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">{employee.name}</h1>
              {employee.active === false ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Inactive
                </span>
              ) : (
                !loading && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${s.busy ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-700"}`}
                  >
                    {s.busy ? "Busy" : "Available"}
                  </span>
                )
              )}
            </div>
            <p className="text-sm text-slate-500">{employee.designation || "No designation set"}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{employee.department || "—"}</span>
              <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{employee.phone || "—"}</span>
              <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Joined {formatDate(employee.joinedOn)}</span>
            </div>
          </div>
          <Can perm="employees">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="icon" aria-label="Edit employee" title="Edit employee" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Delete employee"
                title="Delete employee"
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => setRemoving(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Can>
          {mayRate && (
            <Button onClick={() => setRating({ open: true })}>
              <Star className="mr-1.5 h-4 w-4" /> Add rating
            </Button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total points" value={loading ? "…" : score.total} icon={Trophy} tone="text-amber-600 bg-amber-50" />
          <Stat label="Rank" value={loading || !s.rank || score.total <= 0 ? "—" : `#${s.rank}`} icon={Trophy} tone="text-indigo-600 bg-indigo-50" />
          <Stat
            label={`Avg rating (${score.ratings.count})`}
            value={score.ratings.count ? score.avgStars.toFixed(1) : "—"}
            icon={Star}
            tone="text-amber-600 bg-amber-50"
          />
          <Stat label="Open work" value={loading ? "…" : current.length} icon={Briefcase} tone="text-sky-600 bg-sky-50" />
        </div>

        {/* How the points add up */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <Breakdown label={`Done on time (+${POINTS.onTime} each)`} count={score.onTime.count} points={score.onTime.points} />
          <Breakdown label={`Done late (+${POINTS.late} each)`} count={score.late.count} points={score.late.points} />
          <Breakdown label={`Overdue now (${POINTS.overdue} each)`} count={score.overdue.count} points={score.overdue.points} />
          <Breakdown label={`Ratings (${POINTS.perStar} per star)`} count={score.ratings.count} points={score.ratings.points} />
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Couldn't load work assignments ({error}).
          <button type="button" className="ml-auto font-semibold underline" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Current work ({loading ? "…" : current.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({loading ? "…" : completed.length})</TabsTrigger>
          <TabsTrigger value="ratings">Ratings ({ratings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-4">
          {loading ? (
            <ListSkeleton />
          ) : current.length === 0 ? (
            <Empty text="No work assigned right now. This employee is available for a new task." />
          ) : (
            <div className="space-y-2">
              {current.map((w) => (
                <WorkRow key={w.key} w={w} orderLabel={orderLabel} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {loading ? (
            <ListSkeleton />
          ) : completed.length === 0 ? (
            <Empty text="Nothing completed yet." />
          ) : (
            <div className="space-y-2">
              {completed.map((w) => (
                <WorkRow
                  key={w.key}
                  w={w}
                  orderLabel={orderLabel}
                  action={
                    !mayRate ? null : ratedKeys.has(w.key) ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Rated
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setRating({
                            open: true,
                            task: {
                              kind: w.kind,
                              id: w.id,
                              label: `${w.title} · ${w.context} · ${orderLabel(w.orderId)}`,
                              orderId: w.orderId,
                            },
                          })
                        }
                      >
                        <Star className="mr-1 h-3.5 w-3.5" /> Rate
                      </Button>
                    )
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ratings" className="mt-4">
          {mayRate && (
            <div className="mb-3 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setRating({ open: true })}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add rating
              </Button>
            </div>
          )}
          {ratings.length === 0 ? (
            <Empty text="No ratings yet. Rate a completed task or add a general rating." />
          ) : (
            <div className="space-y-2">
              {ratings.map((r) => (
                <div key={r.id} className="neo-surface rounded-xl p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars value={r.stars} />
                    <span className="text-xs font-semibold text-slate-700">+{r.stars * POINTS.perStar} pts</span>
                    <span className="text-xs text-slate-400">
                      by {r.ratedBy} · {formatDate(r.createdAt)}
                    </span>
                    <button
                      type="button"
                      aria-label="Delete rating"
                      className="ml-auto rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => {
                        if (!requireAdminPassword("employees")) return;
                        deleteRating(r.id);
                        toast.success("Rating removed");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{r.taskRef ? r.taskRef.label : "General rating"}</p>
                  {r.comment && <p className="mt-2 text-sm text-slate-700">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <RatingDialog
        employee={employee}
        task={rating.task}
        open={rating.open}
        onOpenChange={(open) => setRating((prev) => ({ ...prev, open }))}
      />

      {editing && <EmployeeFormDialog employee={employee} onClose={() => setEditing(false)} />}

      <AlertDialog open={removing} onOpenChange={setRemoving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {employee.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They are removed from the Employees list and assignee pickers, and their {ratings.length}{" "}
              rating{ratings.length === 1 ? "" : "s"} are deleted. Work already assigned keeps their name.
              To keep their history, switch them to inactive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                deleteEmployee(employee.id);
                toast.success(`${employee.name} deleted`);
                void navigate({ to: "/employees" });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: typeof Trophy;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/50 p-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-bold leading-none text-slate-800">{value}</span>
        <span className="mt-1 block truncate text-[11px] text-slate-500">{label}</span>
      </span>
    </div>
  );
}

function Breakdown({ label, count, points }: { label: string; count: number; points: number }) {
  return (
    <div className="rounded-lg bg-slate-50/70 px-3 py-2">
      <div className="truncate text-slate-500">{label}</div>
      <div className="mt-0.5 font-semibold text-slate-700">
        {count} → {points > 0 ? "+" : ""}
        {points} pts
      </div>
    </div>
  );
}

function WorkRow({
  w,
  orderLabel,
  action,
}: {
  w: WorkItem;
  orderLabel: (id: string) => string;
  action?: React.ReactNode;
}) {
  return (
    <div className="neo-surface flex flex-wrap items-center gap-3 rounded-xl p-4">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${w.done ? "bg-emerald-50 text-emerald-600" : w.late ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-sky-600"}`}
      >
        {w.done ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-800">{w.title}</div>
        <div className="truncate text-xs text-slate-500">
          {SOURCE_LABEL[w.kind]} · {w.context} ·{" "}
          {w.stageSlug ? (
            <Link
              to="/inward-orders/$id/stages/$stage"
              params={{ id: w.orderId, stage: w.stageSlug }}
              className="font-medium text-primary hover:underline"
            >
              {orderLabel(w.orderId)}
            </Link>
          ) : (
            <Link to="/inward-orders/$id" params={{ id: w.orderId }} className="font-medium text-primary hover:underline">
              {orderLabel(w.orderId)}
            </Link>
          )}
        </div>
      </div>
      <div className="text-right text-xs">
        {w.done ? (
          <>
            <div className="text-slate-500">Done {formatDate(w.completedOn)}</div>
            <div className={w.late ? "font-semibold text-amber-600" : "font-semibold text-emerald-600"}>
              {w.late ? `Late · +${POINTS.late}` : `On time · +${POINTS.onTime}`}
            </div>
          </>
        ) : (
          <>
            <div className="capitalize text-slate-500">{w.status}</div>
            <div className={w.late ? "font-semibold text-rose-600" : "text-slate-500"}>
              {w.dueDate ? `${w.late ? "Overdue · " : "Due "}${formatDate(w.dueDate)}` : "No due date"}
            </div>
          </>
        )}
      </div>
      {action}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="neo-surface rounded-xl py-10 text-center text-sm text-slate-500">{text}</div>;
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
