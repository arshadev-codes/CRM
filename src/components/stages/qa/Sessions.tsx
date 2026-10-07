import { EditOnly, useStageCanEdit } from "../stageAccess";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarPlus,
  Check,
  ChevronDown,
  CircleDot,
  Clock,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  Printer,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatLongDate,
  KIND_META,
  POINT_META,
  POINT_TYPES,
  relativeDay,
  SESSION_STATUS_META,
  sessionsFor,
  sessionTitle,
  TEAM_ROLES,
  todayIso,
  type ClientAttendee,
  type MomPoint,
  type PointType,
  type QaSession,
  type SessionKind,
  type SessionStatus,
  type TeamMember,
} from "@/lib/qa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EASE, initials } from "../shared";
import type { QaData } from "./useQaData";

type Page = "testing" | "inspection";
const INFO_TYPES: PointType[] = ["test_result", "decision", "note"];

// Today first, then upcoming (soonest first), then past (latest first).
export function orderSessions(sessions: QaSession[], today = todayIso()) {
  const rank = (s: QaSession) => (!s.date ? 1 : s.date === today ? 0 : s.date > today ? 1 : 2);
  return [...sessions].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank) return byRank;
    const ad = a.date ?? "9999";
    const bd = b.date ?? "9999";
    return rank(a) === 2 ? bd.localeCompare(ad) : ad.localeCompare(bd);
  });
}

export function SessionsBoard({
  page,
  qa,
  employees,
  author,
}: {
  page: Page;
  qa: QaData;
  employees: string[];
  author: string;
}) {
  const [editing, setEditing] = useState<QaSession | "new" | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const today = todayIso();
  const list = useMemo(
    () => orderSessions(sessionsFor(page, qa.sessions), today),
    [page, qa.sessions, today],
  );

  useEffect(() => {
    // Open today's (or the next) session by default.
    if (open === null && list.length) setOpen(list[0].id);
  }, [list, open]);

  return (
    <section className="neo-surface rounded-3xl p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="neo-pop grid h-10 w-10 place-items-center rounded-xl text-primary">
          <Users className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Sessions &amp; MoM</h2>
          <p className="text-xs text-muted-foreground">
            {page === "testing"
              ? "Each testing day with its team and minutes. Joint sessions also appear under Inspection."
              : "Each client visit with who came and the minutes. Joint sessions also appear under Testing."}
          </p>
        </div>
        <EditOnly>
          <Button onClick={() => setEditing("new")}>
            <CalendarPlus /> New session
          </Button>
        </EditOnly>
      </div>

      {qa.loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="neo-inset flex flex-col items-center rounded-2xl px-6 py-12 text-center">
          <CircleDot className="h-8 w-8 text-primary/60" />
          <div className="mt-3 font-semibold text-foreground">No sessions yet</div>
          <div className="mt-1 max-w-sm text-sm text-muted-foreground">
            {page === "testing"
              ? "Plan a testing session: assign the engineer and technicians, then record the MoM."
              : "Plan the client's inspection visit: who is coming, when, and who attends from our side."}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={true}>
            {list.map((session, index) => (
              <motion.div
                key={session.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.4, ease: EASE, delay: Math.min(index, 6) * 0.05 }}
              >
                <SessionCard
                  session={session}
                  today={today}
                  points={qa.points.filter((p) => p.sessionId === session.id)}
                  testsCount={qa.tests.filter((t) => t.sessionId === session.id).length}
                  expanded={open === session.id}
                  onToggle={() => setOpen((c) => (c === session.id ? "" : session.id))}
                  onEdit={() => setEditing(session)}
                  qa={qa}
                  employees={employees}
                  author={author}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <SessionDialog
        key={editing === "new" ? "new" : (editing?.id ?? "none")}
        session={editing}
        page={page}
        employees={employees}
        author={author}
        onClose={() => setEditing(null)}
        onSave={async (values, id) => {
          const saved = await qa.saveSession(values, id);
          if (saved) {
            setEditing(null);
            setOpen(saved.id);
            toast.success(id ? "Session updated" : "Session planned");
          }
        }}
        onDelete={async (id) => {
          if (await qa.deleteSession(id)) {
            setEditing(null);
            toast.success("Session deleted");
          }
        }}
      />
    </section>
  );
}

function DateTile({ date, today }: { date?: string; today: string }) {
  const d = date ? new Date(`${date}T00:00:00`) : null;
  const isToday = date === today;
  return (
    <div
      className={`grid w-16 shrink-0 place-items-center rounded-2xl py-2 text-center ${isToday ? "bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-lg shadow-primary/30" : "neo-pop"}`}
    >
      {d ? (
        <>
          <div
            className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? "" : "text-primary"}`}
          >
            {d.toLocaleDateString("en-IN", { month: "short" })}
          </div>
          <div className="text-2xl font-bold leading-none">{d.getDate()}</div>
          <div
            className={`text-[10px] font-medium ${isToday ? "text-white/85" : "text-muted-foreground"}`}
          >
            {d.toLocaleDateString("en-IN", { weekday: "short" })}
          </div>
        </>
      ) : (
        <div className="px-1 text-[10px] font-semibold text-muted-foreground">No date</div>
      )}
    </div>
  );
}

function SessionCard({
  session,
  today,
  points,
  testsCount,
  expanded,
  onToggle,
  onEdit,
  qa,
  employees,
  author,
}: {
  session: QaSession;
  today: string;
  points: MomPoint[];
  testsCount: number;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  qa: QaData;
  employees: string[];
  author: string;
}) {
  const kind = KIND_META[session.kind];
  const status = SESSION_STATUS_META[session.status];
  const openCount = points.filter((p) => p.status === "open").length;
  const isToday = session.date === today;
  const isJoint = session.kind === "joint";

  const body = (
    <div
      className={`rounded-[18px] p-4 transition-shadow ${isJoint || isToday ? "bg-[var(--neo-bg)]" : "neo-pop"} ${session.status === "cancelled" ? "opacity-60" : ""}`}
    >
      <div className="flex gap-4">
        <DateTile date={session.date} today={today} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${kind.chip}`}>
              {kind.label}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.chip}`}>
              {status.label}
            </span>
            {isToday && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" />
                </span>
                Today
              </span>
            )}
            {!isToday && session.date && (
              <span className="text-[11px] font-medium text-muted-foreground">
                {relativeDay(session.date, today)}
              </span>
            )}
          </div>
          <button type="button" onClick={onToggle} className="mt-1.5 block text-left">
            <div className="font-semibold text-foreground hover:text-primary">
              {sessionTitle(session)}
            </div>
          </button>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {session.time && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {session.time}
              </span>
            )}
            {session.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {session.location}
              </span>
            )}
            <span>
              {points.length} MoM point{points.length === 1 ? "" : "s"}
              {openCount > 0 && (
                <span className="font-semibold text-amber-600"> · {openCount} open</span>
              )}
            </span>
            {testsCount > 0 && <span>{testsCount} tests linked</span>}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {session.team.map((member, i) => (
              <span
                key={`t${i}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/60 py-0.5 pl-0.5 pr-2.5 text-xs shadow-sm"
                title={member.role}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
                  {initials(member.name)}
                </span>
                {member.name}
                {member.role && <span className="text-muted-foreground">· {member.role}</span>}
              </span>
            ))}
            {session.clients.map((client, i) => (
              <span
                key={`c${i}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 py-0.5 pl-0.5 pr-2.5 text-xs text-violet-900 shadow-sm"
                title={[client.designation, client.company, client.phone]
                  .filter(Boolean)
                  .join(" · ")}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-violet-200 text-[9px] font-bold text-violet-700">
                  {initials(client.name)}
                </span>
                {client.name}
                {client.company && <span className="text-violet-600/80">· {client.company}</span>}
              </span>
            ))}
            {!session.team.length && !session.clients.length && (
              <span className="text-xs text-amber-600">Nobody assigned yet</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex gap-1">
            <EditOnly>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={onEdit}
                aria-label="Edit session"
              >
                <Pencil />
              </Button>
            </EditOnly>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label="Print MoM"
              title="Print / save MoM as PDF"
              onClick={() => window.open(`/print/mom/${session.id}`, "_blank")}
            >
              <Printer />
            </Button>
          </div>
          <Button size="sm" variant="ghost" onClick={onToggle} aria-expanded={expanded}>
            MoM
            <ChevronDown className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <MomEditor
              session={session}
              points={points}
              qa={qa}
              employees={employees}
              author={author}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (!isJoint && !isToday) return body;
  // Joint sessions carry a two-colour border; today's session glows.
  return (
    <div
      className={`rounded-[20px] bg-gradient-to-r p-[2px] ${isJoint ? kind.ring : "from-sky-400 to-primary"} ${isToday ? "shadow-[0_12px_32px_-12px_rgba(14,165,233,0.55)]" : ""}`}
    >
      {body}
    </div>
  );
}

function MomEditor({
  session,
  points,
  qa,
  employees,
  author,
}: {
  session: QaSession;
  points: MomPoint[];
  qa: QaData;
  employees: string[];
  author: string;
}) {
  const [summary, setSummary] = useState(session.summary);
  const [adding, setAdding] = useState(false);
  useEffect(() => setSummary(session.summary), [session.summary]);
  const sorted = [...points].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.createdAt.localeCompare(b.createdAt),
  );

  return (
    <div className="mt-4 space-y-4 border-t border-border/40 pt-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-primary">Summary of the session</Label>
        <Textarea
          rows={2}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          onBlur={() => {
            if (summary !== session.summary) void qa.saveSession({ summary }, session.id);
          }}
          placeholder="What was done today, overall result…"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Minutes of meeting
          </div>
          {!adding && (
            <EditOnly>
              <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                <Plus /> Add point
              </Button>
            </EditOnly>
          )}
        </div>
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {sorted.map((point, index) => (
              <PointRow key={point.id} point={point} index={index} qa={qa} employees={employees} />
            ))}
          </AnimatePresence>
          {!sorted.length && !adding && (
            <div className="neo-inset rounded-xl px-4 py-5 text-center text-sm text-muted-foreground">
              No points yet. Add what happened, what failed and why, the fix, and anything the
              client asked for.
            </div>
          )}
          <AnimatePresence>
            {adding && (
              <PointForm
                key="new"
                employees={employees}
                defaultType={session.kind === "testing" ? "test_result" : "client_request"}
                onCancel={() => setAdding(false)}
                onSave={async (values) => {
                  const saved = await qa.savePoint({
                    ...values,
                    session_id: session.id,
                    display_order: points.length + 1,
                    // Only problems and client asks need follow-up; the rest are records.
                    ...(INFO_TYPES.includes(values.point_type)
                      ? { status: "closed", closed_at: new Date().toISOString() }
                      : {}),
                  });
                  if (saved) setAdding(false);
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
      {author && (
        <div className="text-right text-[11px] text-muted-foreground">Recording as {author}</div>
      )}
    </div>
  );
}

type PointValues = {
  point_type: PointType;
  description: string;
  cause: string;
  action: string;
  owner: string;
  due_date: string | null;
};

function PointForm({
  point,
  employees,
  defaultType,
  onSave,
  onCancel,
}: {
  point?: MomPoint;
  employees: string[];
  defaultType: PointType;
  onSave: (values: PointValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<PointValues>({
    point_type: point?.type ?? defaultType,
    description: point?.description ?? "",
    cause: point?.cause ?? "",
    action: point?.action ?? "",
    owner: point?.owner ?? "",
    due_date: point?.dueDate ?? null,
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof PointValues>(key: K, value: PointValues[K]) =>
    setValues((c) => ({ ...c, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!values.description.trim()) {
      toast.error("Describe what happened");
      return;
    }
    setSaving(true);
    await onSave({ ...values, description: values.description.trim() });
    setSaving(false);
  }

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="neo-inset space-y-3 rounded-2xl p-4"
    >
      <div className="flex flex-wrap gap-1.5">
        {POINT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => set("point_type", type)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${values.point_type === type ? `${POINT_META[type].chip} ring-2 ring-offset-1 ring-primary/30 scale-105` : "bg-white/50 text-muted-foreground hover:bg-white"}`}
          >
            {POINT_META[type].label}
          </button>
        ))}
      </div>
      <Textarea
        autoFocus
        rows={2}
        value={values.description}
        onChange={(e) => set("description", e.target.value)}
        placeholder="What happened / what was discussed"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Textarea
          rows={2}
          value={values.cause}
          onChange={(e) => set("cause", e.target.value)}
          placeholder="Why (cause), if relevant"
        />
        <Textarea
          rows={2}
          value={values.action}
          onChange={(e) => set("action", e.target.value)}
          placeholder="Solution / action agreed"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
        <Input
          list="mom-owners"
          value={values.owner}
          onChange={(e) => set("owner", e.target.value)}
          placeholder="Responsible person"
        />
        <datalist id="mom-owners">
          {employees.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <Input
          type="date"
          value={values.due_date ?? ""}
          onChange={(e) => set("due_date", e.target.value || null)}
          aria-label="Due date"
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? <LoaderCircle className="animate-spin" /> : <Check />} Save
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </motion.form>
  );
}

function PointRow({
  point,
  index,
  qa,
  employees,
  sessionLabel,
}: {
  point: MomPoint;
  index: number;
  qa: QaData;
  employees: string[];
  sessionLabel?: string;
}) {
  const canEdit = useStageCanEdit();
  const [editing, setEditing] = useState(false);
  const meta = POINT_META[point.type];
  const closed = point.status === "closed";
  const overdue = !closed && point.dueDate && point.dueDate < todayIso();

  if (editing)
    return (
      <PointForm
        point={point}
        employees={employees}
        defaultType={point.type}
        onCancel={() => setEditing(false)}
        onSave={async (values) => {
          if (await qa.updatePoint(point.id, values)) setEditing(false);
        }}
      />
    );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      whileHover={{ y: -2 }}
      className={`group/point relative flex gap-3 overflow-hidden rounded-2xl bg-white/55 p-3 pl-4 shadow-sm transition-colors ${closed ? "opacity-70" : ""}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${meta.accent}`} />
      <button
        type="button"
        onClick={() =>
          void qa.updatePoint(point.id, {
            status: closed ? "open" : "closed",
            closed_at: closed ? null : new Date().toISOString(),
          })
        }
        disabled={!canEdit}
        aria-label={closed ? "Reopen point" : "Close point"}
        title={closed ? "Reopen" : "Mark as closed"}
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all ${closed ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/30 hover:border-emerald-500 hover:bg-emerald-50"}`}
      >
        {closed && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.chip}`}>
            {meta.label}
          </span>
          {sessionLabel && (
            <span className="text-[11px] text-muted-foreground">{sessionLabel}</span>
          )}
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${closed ? "bg-emerald-100 text-emerald-700" : overdue ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}
          >
            {closed ? "Closed" : overdue ? "Overdue" : "Open"}
          </span>
        </div>
        <p
          className={`mt-1 whitespace-pre-wrap text-sm text-foreground ${closed ? "line-through decoration-emerald-500/50" : ""}`}
        >
          {point.description}
        </p>
        {(point.cause || point.action) && (
          <div className="mt-1.5 grid gap-1 text-xs sm:grid-cols-2">
            {point.cause && (
              <div>
                <span className="font-semibold text-muted-foreground">Why: </span>
                {point.cause}
              </div>
            )}
            {point.action && (
              <div>
                <span className="font-semibold text-muted-foreground">Action: </span>
                {point.action}
              </div>
            )}
          </div>
        )}
        {(point.owner || point.dueDate) && (
          <div className="mt-1.5 text-xs text-muted-foreground">
            {point.owner && (
              <>
                Owner: <span className="font-medium text-foreground">{point.owner}</span>
              </>
            )}
            {point.owner && point.dueDate && " · "}
            {point.dueDate && <>Due {formatLongDate(point.dueDate)}</>}
          </div>
        )}
      </div>
      <div className={`flex shrink-0 flex-col gap-1 opacity-0 transition-opacity group-hover/point:opacity-100 focus-within:opacity-100 ${canEdit ? "" : "hidden"}`}>
        <button
          type="button"
          aria-label="Edit point"
          className="rounded-full p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Delete point"
          className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={() => void qa.deletePoint(point.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export function OpenPoints({
  page,
  qa,
  employees,
}: {
  page: Page;
  qa: QaData;
  employees: string[];
}) {
  const sessions = sessionsFor(page, qa.sessions);
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const open = qa.points
    .filter((p) => p.status === "open" && byId.has(p.sessionId))
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));

  return (
    <section className="neo-surface rounded-3xl p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="neo-pop grid h-10 w-10 place-items-center rounded-xl text-amber-600">
          <CircleDot className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Open points</h2>
          <p className="text-xs text-muted-foreground">
            {page === "inspection"
              ? "Everything the client raised that is not closed yet, from all visits"
              : "Problems and actions from all sessions that are not closed yet"}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-bold ${open.length ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}
        >
          {open.length}
        </span>
      </div>
      {open.length === 0 ? (
        <div className="neo-inset flex items-center gap-3 rounded-2xl px-4 py-5 text-sm text-emerald-700">
          <Check className="h-4 w-4" /> All points are closed.
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {open.map((point, index) => {
              const session = byId.get(point.sessionId)!;
              return (
                <PointRow
                  key={point.id}
                  point={point}
                  index={index}
                  qa={qa}
                  employees={employees}
                  sessionLabel={`${sessionTitle(session)}${session.date ? ` · ${formatLongDate(session.date)}` : ""}`}
                />
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

type SessionForm = {
  kind: SessionKind;
  title: string;
  session_date: string;
  start_time: string;
  location: string;
  status: SessionStatus;
  team: TeamMember[];
  clients: ClientAttendee[];
};

function SessionDialog({
  session,
  page,
  employees,
  author,
  onClose,
  onSave,
  onDelete,
}: {
  session: QaSession | "new" | null;
  page: Page;
  employees: string[];
  author: string;
  onClose: () => void;
  onSave: (values: Parameters<QaData["saveSession"]>[0], id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const existing = session && session !== "new" ? session : undefined;
  const [form, setForm] = useState<SessionForm>({
    kind: existing?.kind ?? page,
    title: existing?.title ?? "",
    session_date: existing?.date ?? todayIso(),
    start_time: existing?.time ?? "10:00",
    location: existing?.location ?? "Electrosoft factory",
    status: existing?.status ?? "planned",
    team: existing?.team.length ? existing.team : [{ name: author, role: "Test Engineer" }],
    clients: existing?.clients ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const showClients = form.kind !== "testing";
  const set = <K extends keyof SessionForm>(key: K, value: SessionForm[K]) =>
    setForm((c) => ({ ...c, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    await onSave(
      {
        kind: form.kind,
        title: form.title.trim(),
        session_date: form.session_date || null,
        start_time: form.start_time,
        location: form.location.trim(),
        status: form.status,
        team: form.team.filter((m) => m.name.trim()),
        client_attendees: showClients ? form.clients.filter((c) => c.name.trim()) : [],
        ...(existing ? {} : { created_by: author }),
      },
      existing?.id,
    );
    setSaving(false);
  }

  return (
    <Dialog open={Boolean(session)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit session" : "Plan a session"}</DialogTitle>
          <DialogDescription>
            A testing day, a client inspection visit, or both together.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(KIND_META) as SessionKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => set("kind", kind)}
                className={`rounded-2xl p-3 text-left transition-all ${form.kind === kind ? "neo-pressed ring-2 ring-primary/40" : "neo-pop"}`}
              >
                <span
                  className={`block h-1.5 w-10 rounded-full bg-gradient-to-r ${KIND_META[kind].ring}`}
                />
                <span className="mt-2 block text-sm font-semibold text-foreground">
                  {KIND_META[kind].label}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {kind === "testing"
                    ? "Our team only"
                    : kind === "inspection"
                      ? "Client visit"
                      : "Both at the same time"}
                </span>
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-primary">Title (optional)</Label>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={
                  form.kind === "testing"
                    ? "e.g. Routine tests, day 1"
                    : "e.g. FAT witness by client"
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Date</Label>
              <Input
                type="date"
                value={form.session_date}
                onChange={(e) => set("session_date", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Time</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => set("start_time", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Location</Label>
              <Input value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as SessionStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SESSION_STATUS_META) as SessionStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {SESSION_STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-primary">
                Assigned from Electrosoft
              </Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => set("team", [...form.team, { name: "", role: "Technician" }])}
              >
                <UserPlus /> Add person
              </Button>
            </div>
            <datalist id="session-employees">
              {employees.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {form.team.map((member, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  list="session-employees"
                  value={member.name}
                  placeholder="Name"
                  onChange={(e) =>
                    set(
                      "team",
                      form.team.map((m, j) => (j === i ? { ...m, name: e.target.value } : m)),
                    )
                  }
                />
                <Select
                  value={member.role}
                  onValueChange={(role) =>
                    set(
                      "team",
                      form.team.map((m, j) => (j === i ? { ...m, role } : m)),
                    )
                  }
                >
                  <SelectTrigger className="w-44 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Remove person"
                  onClick={() =>
                    set(
                      "team",
                      form.team.filter((_, j) => j !== i),
                    )
                  }
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>

          <AnimatePresence initial={false}>
            {showClients && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-violet-700">
                    Who is coming from the client
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      set("clients", [
                        ...form.clients,
                        { name: "", designation: "", company: "", phone: "" },
                      ])
                    }
                  >
                    <UserPlus /> Add visitor
                  </Button>
                </div>
                {!form.clients.length && (
                  <div className="rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-800">
                    Add the client's inspectors, their designation and company.
                  </div>
                )}
                {form.clients.map((client, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 gap-2 rounded-2xl bg-violet-50/60 p-2 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto]"
                  >
                    {(["name", "designation", "company", "phone"] as const).map((field) => (
                      <Input
                        key={field}
                        value={client[field]}
                        placeholder={field[0].toUpperCase() + field.slice(1)}
                        onChange={(e) =>
                          set(
                            "clients",
                            form.clients.map((c, j) =>
                              j === i ? { ...c, [field]: e.target.value } : c,
                            ),
                          )
                        }
                      />
                    ))}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Remove visitor"
                      onClick={() =>
                        set(
                          "clients",
                          form.clients.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <DialogFooter className="gap-2">
            {existing && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 /> Delete
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <LoaderCircle className="animate-spin" /> : <Check />}
              {existing ? "Save" : "Plan session"}
            </Button>
          </DialogFooter>
        </form>

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this session?</AlertDialogTitle>
              <AlertDialogDescription>
                Its MoM points are deleted too. Test results linked to it are kept.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={() => existing && void onDelete(existing.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
