import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ClipboardList,
  FlaskConical,
  ListPlus,
  LoaderCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useProposalStore } from "@/store/proposalStore";
import { testsData } from "@/data/testsData";
import {
  formatLongDate,
  relativeDay,
  sessionsFor,
  sessionTitle,
  TEST_STATUS_META,
  TEST_STATUSES,
  todayIso,
  type TestItem,
  type TestStatus,
} from "@/lib/qa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StageBodyProps } from "./DesignStage";
import { EASE } from "./shared";
import { OpenPoints, orderSessions, SessionsBoard } from "./qa/Sessions";
import { useQaData, type QaData } from "./qa/useQaData";

const GROUP_ORDER = ["Routine", "Type", "Special"];

export function TestingStage({
  orderId,
  stage,
  setStageStatus,
  author,
  employees,
}: StageBodyProps) {
  const qa = useQaData(orderId);
  const order = useProposalStore((s) => s.inwardOrders.find((o) => o.id === orderId));
  const project = useProposalStore((s) => s.projects.find((p) => p.id === order?.projectId));
  const hydrateProjects = useProposalStore((s) => s.hydrateFromCloud);
  const [filter, setFilter] = useState<TestStatus | "all">("all");
  const seeded = useRef(false);

  useEffect(() => {
    if (order?.projectId && !project) void hydrateProjects();
  }, [order?.projectId, project, hydrateProjects]);

  // Tests sold in the quotation that are not on this order's checklist yet.
  const quotationTests = useMemo(
    () =>
      (project?.data.selectedTests ?? [])
        .map((key) => testsData.find((t) => t.id === key))
        .filter((t): t is (typeof testsData)[number] => Boolean(t)),
    [project],
  );
  const missing = quotationTests.filter((t) => !qa.tests.some((item) => item.key === t.id));

  async function loadFromQuotation(silent = false) {
    const start = qa.tests.reduce((max, t) => Math.max(max, t.displayOrder), 0);
    const added = await qa.addTests(
      missing.map((t, i) => ({
        test_key: t.id,
        title: t.title,
        test_group: t.group,
        display_order: start + i + 1,
      })),
    );
    if (added.length && !silent) toast.success(`${added.length} tests loaded from the quotation`);
  }

  useEffect(() => {
    // First visit: fill the checklist from the quotation automatically.
    if (!qa.loading && !seeded.current && qa.tests.length === 0 && missing.length) {
      seeded.current = true;
      void loadFromQuotation(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qa.loading, qa.tests.length, missing.length]);

  const counts = useMemo(() => {
    const result = Object.fromEntries(TEST_STATUSES.map((s) => [s, 0])) as Record<
      TestStatus,
      number
    >;
    for (const t of qa.tests) result[t.status]++;
    return result;
  }, [qa.tests]);
  const total = qa.tests.length;
  const passedPct = total ? Math.round((counts.passed / total) * 100) : 0;
  const allPassed = total > 0 && counts.passed === total;

  const today = todayIso();
  const sessions = orderSessions(sessionsFor("testing", qa.sessions), today);
  const nextSession = sessions.find(
    (s) => s.status !== "completed" && s.status !== "cancelled" && (!s.date || s.date >= today),
  );
  const todaySession = sessions.find((s) => s.date === today);

  async function setStatus(test: TestItem, status: TestStatus) {
    const updated = await qa.updateTest(test.id, {
      status,
      tested_by: status === "pending" ? test.testedBy : author || test.testedBy,
      session_id: test.sessionId ?? todaySession?.id ?? null,
    });
    if (updated && stage?.status === "not started" && status !== "pending")
      await setStageStatus("in progress");
  }

  const visible = qa.tests
    .filter((t) => filter === "all" || t.status === filter)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const groups = [...new Set([...GROUP_ORDER, ...visible.map((t) => t.group || "Other")])]
    .map((group) => ({ group, tests: visible.filter((t) => (t.group || "Other") === group) }))
    .filter((g) => g.tests.length);

  return (
    <div className="mx-auto w-full max-w-[80vw] space-y-6 max-lg:max-w-full">
      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
        className="neo-surface grid gap-6 rounded-3xl p-5 sm:p-7 lg:grid-cols-[1fr_320px]"
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tests passed
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <motion.span
              key={passedPct}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold text-foreground"
            >
              {passedPct}%
            </motion.span>
            <span className="text-sm text-muted-foreground">
              {counts.passed} of {total} passed
              {counts.failed > 0 && (
                <span className="font-semibold text-rose-600"> · {counts.failed} failed</span>
              )}
              {counts.retest > 0 && (
                <span className="font-semibold text-amber-600"> · {counts.retest} to retest</span>
              )}
            </span>
          </div>
          <div className="neo-inset mt-4 flex h-3.5 overflow-hidden rounded-full">
            {(["passed", "in progress", "retest", "failed"] as TestStatus[]).map((s) => (
              <motion.div
                key={s}
                className={`h-full ${TEST_STATUS_META[s].bar}`}
                initial={{ width: 0 }}
                animate={{ width: total ? `${(counts[s] / total) * 100}%` : 0 }}
                transition={{ duration: 0.9, ease: EASE }}
                title={`${TEST_STATUS_META[s].label}: ${counts[s]}`}
              />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <FilterChip
              label="All"
              count={total}
              active={filter === "all"}
              onClick={() => setFilter("all")}
            />
            {TEST_STATUSES.map((s) => (
              <FilterChip
                key={s}
                label={TEST_STATUS_META[s].label}
                count={counts[s]}
                dot={TEST_STATUS_META[s].bar}
                active={filter === s}
                onClick={() => setFilter((c) => (c === s ? "all" : s))}
              />
            ))}
          </div>
        </div>
        <NextSessionCard session={nextSession} today={today} />
      </motion.section>

      <AnimatePresence>
        {allPassed && stage?.status !== "done" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white shadow-xl shadow-emerald-500/25">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20">
                <FlaskConical className="h-6 w-6" />
              </span>
              <div className="flex-1">
                <div className="text-lg font-bold">All {total} tests passed</div>
                <div className="text-sm text-white/85">
                  Mark Testing as done to move the order to inspection.
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  void setStageStatus("done").then(
                    (ok) => ok && toast.success("Testing marked done"),
                  )
                }
              >
                <Check /> Mark testing done
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.14 }}
        className="neo-surface rounded-3xl p-5 sm:p-6"
      >
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="neo-pop grid h-10 w-10 place-items-center rounded-xl text-primary">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">Test checklist</h2>
            <p className="text-xs text-muted-foreground">
              {project
                ? `From quotation ${project.name}. Click a status to update it.`
                : "Click a status to update it."}
            </p>
          </div>
          {missing.length > 0 && qa.tests.length > 0 && (
            <Button variant="outline" onClick={() => void loadFromQuotation()}>
              <ListPlus /> Add {missing.length} from quotation
            </Button>
          )}
        </div>

        {qa.loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {!total && (
              <div className="neo-inset mb-4 rounded-2xl px-6 py-10 text-center text-sm text-muted-foreground">
                {order?.projectId
                  ? "Loading tests from the quotation… If none appear, the quotation had no tests selected. Add them below."
                  : "This order is not linked to a quotation. Add the tests below."}
              </div>
            )}
            <div className="space-y-6">
              {groups.map(({ group, tests }) => (
                <div key={group}>
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {group} tests
                    <span className="rounded-full bg-muted px-2 py-0.5">{tests.length}</span>
                  </div>
                  <div className="space-y-2">
                    <AnimatePresence initial={true}>
                      {tests.map((test, index) => (
                        <TestRow
                          key={test.id}
                          test={test}
                          index={index}
                          qa={qa}
                          employees={employees}
                          onStatus={(s) => void setStatus(test, s)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
            <AddTest qa={qa} />
          </>
        )}
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0">
          <SessionsBoard page="testing" qa={qa} employees={employees} author={author} />
        </div>
        <div className="min-w-0">
          <OpenPoints page="testing" qa={qa} employees={employees} />
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  dot,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  dot?: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${active ? "neo-pressed text-primary" : "neo-pop text-foreground"} ${count === 0 && !active ? "opacity-55" : ""}`}
    >
      {dot && <span className={`h-2 w-2 rounded-full ${dot}`} />}
      {label}
      <span className="text-muted-foreground">{count}</span>
    </motion.button>
  );
}

export function NextSessionCard({
  session,
  today,
  label = "Next testing session",
}: {
  session?: ReturnType<typeof orderSessions>[number];
  today: string;
  label?: string;
}) {
  return (
    <div className="neo-inset flex flex-col justify-center rounded-2xl p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {session ? (
        <>
          <div className="mt-1 text-lg font-bold text-foreground">
            {session.date === today ? "Today" : relativeDay(session.date, today) || "Date not set"}
            {session.time && (
              <span className="text-sm font-medium text-muted-foreground"> · {session.time}</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {sessionTitle(session)} · {formatLongDate(session.date)}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {[
              ...session.team.map((m) => m.name),
              ...session.clients.map((c) => `${c.name}${c.company ? ` (${c.company})` : ""}`),
            ]
              .slice(0, 5)
              .map((name, i) => (
                <span
                  key={i}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${i < session.team.length ? "bg-primary/10 text-primary" : "bg-violet-100 text-violet-700"}`}
                >
                  {name}
                </span>
              ))}
          </div>
        </>
      ) : (
        <div className="mt-1 text-sm text-muted-foreground">
          Nothing planned. Add a session below.
        </div>
      )}
    </div>
  );
}

function TestRow({
  test,
  index,
  qa,
  employees,
  onStatus,
}: {
  test: TestItem;
  index: number;
  qa: QaData;
  employees: string[];
  onStatus: (status: TestStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(test.notes);
  useEffect(() => setNotes(test.notes), [test.notes]);
  const meta = TEST_STATUS_META[test.status];
  const session = qa.sessions.find((s) => s.id === test.sessionId);
  const tint =
    test.status === "passed"
      ? "bg-emerald-50/70"
      : test.status === "failed"
        ? "bg-rose-50/80"
        : test.status === "retest"
          ? "bg-amber-50/70"
          : "bg-white/50";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.35, ease: EASE, delay: Math.min(index, 12) * 0.03 }}
      className={`group/test overflow-hidden rounded-2xl shadow-sm transition-shadow hover:shadow-md ${tint}`}
    >
      <div className="flex flex-wrap items-center gap-3 p-3 pl-4">
        <motion.span
          key={test.status}
          initial={{ scale: 0.4 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-white ${meta.bar}`}
        >
          {test.status === "passed" ? (
            <Check className="h-4 w-4" strokeWidth={3} />
          ) : test.status === "failed" ? (
            <X className="h-4 w-4" strokeWidth={3} />
          ) : (
            <span className="text-[10px] font-bold">{index + 1}</span>
          )}
        </motion.span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="font-medium text-foreground">{test.title}</div>
          <div className="truncate text-xs text-muted-foreground">
            {[test.testedBy && `by ${test.testedBy}`, session && sessionTitle(session), test.notes]
              .filter(Boolean)
              .join(" · ") || "Not tested yet"}
          </div>
        </button>
        <div
          className="flex flex-wrap gap-1"
          role="radiogroup"
          aria-label={`Status of ${test.title}`}
        >
          {TEST_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={test.status === s}
              onClick={() => test.status !== s && onStatus(s)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${test.status === s ? `${TEST_STATUS_META[s].chip} shadow-sm ring-1 ring-black/5` : "text-muted-foreground hover:bg-white/80"}`}
            >
              {TEST_STATUS_META[s].label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Details"
          className="rounded-full p-1 text-muted-foreground hover:bg-white/80"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid gap-3 border-t border-border/40 p-4 sm:grid-cols-[1fr_200px_220px_auto]">
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() =>
                  notes !== test.notes && void qa.updateTest(test.id, { result_notes: notes })
                }
                placeholder="Readings, observations, why it failed…"
              />
              <Input
                list="test-employees"
                defaultValue={test.testedBy}
                onBlur={(e) =>
                  e.target.value !== test.testedBy &&
                  void qa.updateTest(test.id, { tested_by: e.target.value })
                }
                placeholder="Tested by"
              />
              <datalist id="test-employees">
                {employees.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <Select
                value={test.sessionId ?? "none"}
                onValueChange={(v) =>
                  void qa.updateTest(test.id, { session_id: v === "none" ? null : v })
                }
              >
                <SelectTrigger aria-label="Session">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No session</SelectItem>
                  {sessionsFor("testing", qa.sessions).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {sessionTitle(s)} · {formatLongDate(s.date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Remove test"
                onClick={() => void qa.deleteTest(test.id)}
              >
                <Trash2 />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AddTest({ qa }: { qa: QaData }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [group, setGroup] = useState("Routine");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const order = qa.tests.reduce((max, t) => Math.max(max, t.displayOrder), 0) + 1;
    const added = await qa.addTests([
      {
        test_key: `custom-${crypto.randomUUID()}`,
        title: title.trim(),
        test_group: group,
        display_order: order,
      },
    ]);
    setSaving(false);
    if (added.length) {
      setTitle("");
      toast.success("Test added");
    }
  }

  if (!open)
    return (
      <Button variant="ghost" className="mt-4" onClick={() => setOpen(true)}>
        <Plus /> Add a test
      </Button>
    );
  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 flex flex-wrap gap-2"
    >
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Test name"
        className="min-w-[220px] flex-1"
      />
      <Select value={group} onValueChange={setGroup}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[...GROUP_ORDER, "Other"].map((g) => (
            <SelectItem key={g} value={g}>
              {g}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" disabled={saving || !title.trim()}>
        {saving ? <LoaderCircle className="animate-spin" /> : <Plus />} Add
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Done
      </Button>
    </motion.form>
  );
}
