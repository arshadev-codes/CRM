import { EditLock, EditOnly, useStageCanEdit } from "./stageAccess";
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
import { panelLabel, type Panel } from "@/lib/production";
import {
  matchTemplate,
  TEST_GROUPS,
  testKey,
  useOrderPanels,
  usePanelTemplates,
  type PanelTemplate,
} from "@/lib/panelTests";
import {
  formatLongDate,
  isTestDone,
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

// Tests are done panel-wise: every panel of the order (from the BOM / Production) gets the
// tests of its panel type from the Panel tests library, and each test is marked OK, Not OK or
// N.A. with a reading where one is taken.
export function TestingStage({
  orderId,
  stage,
  setStageStatus,
  author,
  employees,
}: StageBodyProps) {
  const canEdit = useStageCanEdit();
  const qa = useQaData(orderId);
  const { panels, loading: panelsLoading } = useOrderPanels(orderId);
  const { templates, loading: templatesLoading } = usePanelTemplates();
  const [filter, setFilter] = useState<TestStatus | "all">("all");
  const seeded = useRef(new Set<string>());

  const testsOf = (panelId?: string) =>
    qa.tests.filter((t) => t.panelId === panelId).sort((a, b) => a.displayOrder - b.displayOrder);

  async function loadTemplate(panel: Panel, template: PanelTemplate, silent = false) {
    const have = new Set(testsOf(panel.id).map((t) => t.key));
    const start = qa.tests.reduce((max, t) => Math.max(max, t.displayOrder), 0);
    const rows = template.tests
      .filter((t) => !have.has(testKey(t)))
      .map((t, i) => ({
        panel_id: panel.id,
        test_key: testKey(t),
        title: t.title,
        test_group: t.group,
        display_order: start + i + 1,
      }));
    const added = await qa.addTests(rows);
    if (added.length && !silent)
      toast.success(`${added.length} tests added to ${panelLabel(panel)}`);
  }

  useEffect(() => {
    // First visit: give each panel without tests the tests of its panel type.
    if (!canEdit || qa.loading || panelsLoading || templatesLoading) return;
    for (const panel of panels) {
      if (seeded.current.has(panel.id)) continue;
      seeded.current.add(panel.id);
      const template = matchTemplate(panel.panelType, templates);
      if (template && !qa.tests.some((t) => t.panelId === panel.id))
        void loadTemplate(panel, template, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, qa.loading, panelsLoading, templatesLoading, panels, templates]);

  const counts = useMemo(() => {
    const result = Object.fromEntries(TEST_STATUSES.map((s) => [s, 0])) as Record<
      TestStatus,
      number
    >;
    for (const t of qa.tests) result[t.status]++;
    return result;
  }, [qa.tests]);
  const total = qa.tests.length;
  const done = counts.passed + counts.na;
  const donePct = total ? Math.round((done / total) * 100) : 0;
  const allPassed = total > 0 && qa.tests.every((t) => isTestDone(t.status));

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

  const panelIds = new Set(panels.map((p) => p.id));
  // Older orders: tests from the quotation, not tied to a panel.
  const loose = qa.tests
    .filter((t) => !t.panelId || !panelIds.has(t.panelId))
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const shownStatuses = TEST_STATUSES.filter(
    (s) => ["pending", "passed", "failed", "na"].includes(s) || counts[s] > 0,
  );

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
            Tests done
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <motion.span
              key={donePct}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold text-foreground"
            >
              {donePct}%
            </motion.span>
            <span className="text-sm text-muted-foreground">
              {done} of {total} done · {panels.length} panel{panels.length === 1 ? "" : "s"}
              {counts.failed > 0 && (
                <span className="font-semibold text-rose-600"> · {counts.failed} not OK</span>
              )}
              {counts.retest > 0 && (
                <span className="font-semibold text-amber-600"> · {counts.retest} to retest</span>
              )}
            </span>
          </div>
          <div className="neo-inset mt-4 flex h-3.5 overflow-hidden rounded-full">
            {(["passed", "na", "in progress", "retest", "failed"] as TestStatus[]).map((s) => (
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
            {shownStatuses.map((s) => (
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
                <div className="text-lg font-bold">All {total} tests done</div>
                <div className="text-sm text-white/85">
                  Mark Testing as done to move the order to inspection.
                </div>
              </div>
              <Button
                variant="secondary"
                className={canEdit ? "" : "hidden"}
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

      {qa.loading || panelsLoading ? (
        <div className="neo-surface space-y-2 rounded-3xl p-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {!panels.length && (
            <div className="neo-surface rounded-3xl px-6 py-10 text-center text-sm text-muted-foreground">
              This order has no panels yet. Panels come from the BOM (Design) or are added in
              Production; their tests then appear here.
            </div>
          )}
          {panels.map((panel, i) => (
            <PanelTests
              key={panel.id}
              panel={panel}
              index={i}
              tests={testsOf(panel.id)}
              filter={filter}
              qa={qa}
              employees={employees}
              templates={templates}
              matched={matchTemplate(panel.panelType, templates)}
              onLoad={(t) => void loadTemplate(panel, t)}
              onStatus={(test, s) => void setStatus(test, s)}
            />
          ))}
          {loose.length > 0 && (
            <PanelTests
              index={panels.length}
              tests={loose}
              filter={filter}
              qa={qa}
              employees={employees}
              templates={templates}
              onStatus={(test, s) => void setStatus(test, s)}
            />
          )}
        </>
      )}

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

// One panel's tests, grouped as on its inspection report (Checklist, Megger test, ...).
function PanelTests({
  panel,
  index,
  tests,
  filter,
  qa,
  employees,
  templates,
  matched,
  onLoad,
  onStatus,
}: {
  panel?: Panel;
  index: number;
  tests: TestItem[];
  filter: TestStatus | "all";
  qa: QaData;
  employees: string[];
  templates: PanelTemplate[];
  matched?: PanelTemplate;
  onLoad?: (template: PanelTemplate) => void;
  onStatus: (test: TestItem, status: TestStatus) => void;
}) {
  const canEdit = useStageCanEdit();
  const [pick, setPick] = useState("");
  const done = tests.filter((t) => isTestDone(t.status)).length;
  const failed = tests.filter((t) => t.status === "failed").length;
  const visible = tests.filter((t) => filter === "all" || t.status === filter);
  const groups = [...new Set(visible.map((t) => t.group || "Other"))].map((group) => ({
    group,
    tests: visible.filter((t) => (t.group || "Other") === group),
  }));

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.1 + Math.min(index, 6) * 0.05 }}
      className="neo-surface rounded-3xl p-5 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="neo-pop grid h-10 w-10 place-items-center rounded-xl text-primary">
          <ClipboardList className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground">
            {panel ? panelLabel(panel) : "Other tests (whole order)"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {tests.length ? `${done} of ${tests.length} done` : "No tests yet"}
            {failed > 0 && <span className="font-semibold text-rose-600"> · {failed} not OK</span>}
            {panel && matched && ` · tests of "${matched.name}"`}
            {panel && !matched && " · not in the Panel tests library"}
          </p>
        </div>
        {panel && canEdit && onLoad && (
          <div className="flex flex-wrap items-center gap-2">
            {matched && tests.length > 0 && tests.length < matched.tests.length && (
              <Button variant="outline" size="sm" onClick={() => onLoad(matched)}>
                <ListPlus /> Add missing tests
              </Button>
            )}
            {(!matched || !tests.length) && (
              <>
                <Select value={pick} onValueChange={setPick}>
                  <SelectTrigger className="h-9 w-52">
                    <SelectValue placeholder="Take tests from…" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.tests.length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!pick}
                  onClick={() => {
                    const t = templates.find((x) => x.id === pick);
                    if (t) onLoad(t);
                  }}
                >
                  <ListPlus /> Add tests
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {panel && !tests.length && (
        <div className="neo-inset mb-4 rounded-2xl px-6 py-8 text-center text-sm text-muted-foreground">
          {matched
            ? "Loading this panel's tests…"
            : "This panel type is not in the Panel tests library yet. Pick a similar panel above, ask the designer to add it under Panel tests, or add tests by hand below."}
        </div>
      )}

      <div className="space-y-6">
        {groups.map(({ group, tests: groupTests }) => (
          <div key={group}>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {group}
              <span className="rounded-full bg-muted px-2 py-0.5">{groupTests.length}</span>
            </div>
            <div className="space-y-2">
              <AnimatePresence initial={true}>
                {groupTests.map((test, i) => (
                  <TestRow
                    key={test.id}
                    test={test}
                    index={i}
                    qa={qa}
                    employees={employees}
                    onStatus={(s) => onStatus(test, s)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
      {panel && (
        <EditOnly>
          <AddTest qa={qa} panelId={panel.id} groups={[...new Set(tests.map((t) => t.group))]} />
        </EditOnly>
      )}
    </motion.section>
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

const RESULT_BUTTONS: TestStatus[] = ["passed", "failed", "na"];

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
  const canEdit = useStageCanEdit();
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
          ) : test.status === "na" ? (
            <span className="text-[9px] font-bold">NA</span>
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
            {[test.testedBy && `by ${test.testedBy}`, session && sessionTitle(session)]
              .filter(Boolean)
              .join(" · ") || "Not tested yet"}
          </div>
        </button>
        <Input
          value={notes}
          disabled={!canEdit}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== test.notes && void qa.updateTest(test.id, { result_notes: notes })}
          placeholder="Reading / remark"
          aria-label={`Reading for ${test.title}`}
          className="h-8 w-40 bg-white/70 text-xs"
        />
        <div
          className="flex flex-wrap gap-1"
          role="radiogroup"
          aria-label={`Status of ${test.title}`}
        >
          {RESULT_BUTTONS.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={test.status === s}
              onClick={() => onStatus(test.status === s ? "pending" : s)}
              disabled={!canEdit && test.status !== s}
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
            <EditLock>
            <div className="grid gap-3 border-t border-border/40 p-4 sm:grid-cols-[1fr_220px_auto]">
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
            </EditLock>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AddTest({ qa, panelId, groups }: { qa: QaData; panelId: string; groups: string[] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [group, setGroup] = useState(groups[0] || "Checklist");
  const [saving, setSaving] = useState(false);
  const listId = `test-groups-${panelId}`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const order = qa.tests.reduce((max, t) => Math.max(max, t.displayOrder), 0) + 1;
    const added = await qa.addTests([
      {
        panel_id: panelId,
        test_key: `custom-${crypto.randomUUID()}`,
        title: title.trim(),
        test_group: group.trim() || "Checklist",
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
      <Input
        list={listId}
        value={group}
        onChange={(e) => setGroup(e.target.value)}
        placeholder="Group"
        className="w-48"
      />
      <datalist id={listId}>
        {[...new Set([...groups, ...TEST_GROUPS])].map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <Button type="submit" disabled={saving || !title.trim()}>
        {saving ? <LoaderCircle className="animate-spin" /> : <Plus />} Add
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Done
      </Button>
    </motion.form>
  );
}
