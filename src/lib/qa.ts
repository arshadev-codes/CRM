import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import type { StageStatus } from "@/lib/stages";

type Tables = Database["public"]["Tables"];
export type SessionRow = Tables["qa_sessions"]["Row"];
export type TestRow = Tables["test_items"]["Row"];
export type PointRow = Tables["mom_points"]["Row"];
export type OutcomeRow = Tables["inspection_outcomes"]["Row"];
export type DispatchRow = Tables["dispatch_details"]["Row"];

/* ---------- Sessions ---------- */

export type SessionKind = "testing" | "inspection" | "joint";
export type SessionStatus = "planned" | "in progress" | "completed" | "cancelled";
export type TeamMember = { name: string; role: string };
export type ClientAttendee = { name: string; designation: string; company: string; phone: string };

export const TEAM_ROLES = [
  "Test Engineer",
  "Technician",
  "Supervisor",
  "QA Officer",
  "Project Manager",
  "Helper",
];

export const KIND_META: Record<
  SessionKind,
  { label: string; short: string; chip: string; ring: string }
> = {
  testing: {
    label: "Internal testing",
    short: "Testing",
    chip: "bg-primary/10 text-primary",
    ring: "from-primary to-chart-2",
  },
  inspection: {
    label: "Client inspection",
    short: "Inspection",
    chip: "bg-violet-100 text-violet-700",
    ring: "from-violet-500 to-fuchsia-500",
  },
  joint: {
    label: "Testing + Inspection",
    short: "Joint",
    chip: "bg-gradient-to-r from-primary/15 to-violet-200 text-indigo-700",
    ring: "from-primary via-indigo-500 to-violet-500",
  },
};

export const SESSION_STATUS_META: Record<SessionStatus, { label: string; chip: string }> = {
  planned: { label: "Planned", chip: "bg-slate-200/70 text-slate-700" },
  "in progress": { label: "In progress", chip: "bg-sky-100 text-sky-700" },
  completed: { label: "Completed", chip: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", chip: "bg-rose-100 text-rose-700 line-through" },
};

export type QaSession = {
  id: string;
  kind: SessionKind;
  title: string;
  date?: string;
  time: string;
  location: string;
  team: TeamMember[];
  clients: ClientAttendee[];
  status: SessionStatus;
  summary: string;
  createdBy: string;
  createdAt: string;
};

function asArray<T>(value: Json): T[] {
  return Array.isArray(value) ? (value as unknown as T[]) : [];
}

export function mapSession(row: SessionRow): QaSession {
  return {
    id: row.id,
    kind: row.kind as SessionKind,
    title: row.title,
    date: row.session_date ?? undefined,
    time: row.start_time,
    location: row.location,
    team: asArray<TeamMember>(row.team),
    clients: asArray<ClientAttendee>(row.client_attendees),
    status: row.status as SessionStatus,
    summary: row.summary,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function sessionTitle(session: QaSession) {
  return session.title || KIND_META[session.kind].label;
}

// Sessions shown on a stage page: its own kind plus joint sessions.
export function sessionsFor(page: "testing" | "inspection", sessions: QaSession[]) {
  return sessions.filter((session) => session.kind === page || session.kind === "joint");
}

/* ---------- Tests ---------- */

export type TestStatus = "pending" | "in progress" | "passed" | "failed" | "retest";
export type WitnessStatus = "" | "witnessed" | "accepted" | "rejected";

export const TEST_STATUSES: TestStatus[] = ["pending", "in progress", "passed", "failed", "retest"];
export const TEST_STATUS_META: Record<TestStatus, { label: string; chip: string; bar: string }> = {
  pending: { label: "Pending", chip: "bg-slate-200/70 text-slate-600", bar: "bg-slate-300" },
  "in progress": { label: "In progress", chip: "bg-sky-100 text-sky-700", bar: "bg-sky-500" },
  passed: { label: "Passed", chip: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" },
  failed: { label: "Failed", chip: "bg-rose-100 text-rose-700", bar: "bg-rose-500" },
  retest: { label: "Retest", chip: "bg-amber-100 text-amber-800", bar: "bg-amber-500" },
};
export const WITNESS_META: Record<Exclude<WitnessStatus, "">, { label: string; chip: string }> = {
  witnessed: { label: "Witnessed", chip: "bg-violet-100 text-violet-700" },
  accepted: { label: "Accepted", chip: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", chip: "bg-rose-100 text-rose-700" },
};

export type TestItem = {
  id: string;
  key?: string;
  title: string;
  group: string;
  status: TestStatus;
  notes: string;
  testedBy: string;
  sessionId?: string;
  witness: WitnessStatus;
  witnessRemarks: string;
  displayOrder: number;
  updatedAt: string;
};

export function mapTest(row: TestRow): TestItem {
  return {
    id: row.id,
    key: row.test_key ?? undefined,
    title: row.title,
    group: row.test_group,
    status: row.status as TestStatus,
    notes: row.result_notes,
    testedBy: row.tested_by,
    sessionId: row.session_id ?? undefined,
    witness: row.witness_status as WitnessStatus,
    witnessRemarks: row.witness_remarks,
    displayOrder: row.display_order,
    updatedAt: row.updated_at,
  };
}

/* ---------- MoM points ---------- */

export type PointType =
  | "test_result"
  | "problem"
  | "client_request"
  | "client_concern"
  | "decision"
  | "note";

export const POINT_META: Record<PointType, { label: string; chip: string; accent: string }> = {
  test_result: { label: "Test result", chip: "bg-primary/10 text-primary", accent: "bg-primary" },
  problem: { label: "Problem found", chip: "bg-rose-100 text-rose-700", accent: "bg-rose-500" },
  client_request: {
    label: "Client request / change",
    chip: "bg-violet-100 text-violet-700",
    accent: "bg-violet-500",
  },
  client_concern: {
    label: "Client concern / dislike",
    chip: "bg-amber-100 text-amber-800",
    accent: "bg-amber-500",
  },
  decision: {
    label: "Decision / approved",
    chip: "bg-emerald-100 text-emerald-700",
    accent: "bg-emerald-500",
  },
  note: { label: "Note", chip: "bg-slate-200/70 text-slate-600", accent: "bg-slate-400" },
};
export const POINT_TYPES = Object.keys(POINT_META) as PointType[];

export type MomPoint = {
  id: string;
  sessionId: string;
  type: PointType;
  description: string;
  cause: string;
  action: string;
  owner: string;
  dueDate?: string;
  status: "open" | "closed";
  closedAt?: string;
  displayOrder: number;
  createdAt: string;
};

export function mapPoint(row: PointRow): MomPoint {
  return {
    id: row.id,
    sessionId: row.session_id,
    type: row.point_type as PointType,
    description: row.description,
    cause: row.cause,
    action: row.action,
    owner: row.owner,
    dueDate: row.due_date ?? undefined,
    status: row.status === "closed" ? "closed" : "open",
    closedAt: row.closed_at ?? undefined,
    displayOrder: row.display_order,
    createdAt: row.created_at,
  };
}

/* ---------- Inspection outcome ---------- */

export type Outcome = "" | "accepted" | "accepted_with_remarks" | "rejected";
export const OUTCOME_META: Record<Exclude<Outcome, "">, { label: string; chip: string }> = {
  accepted: { label: "Accepted", chip: "bg-emerald-100 text-emerald-700" },
  accepted_with_remarks: { label: "Accepted with remarks", chip: "bg-teal-100 text-teal-700" },
  rejected: { label: "Rejected / re-inspection", chip: "bg-rose-100 text-rose-700" },
};

/* ---------- Dispatch ---------- */

export type Milestone = "planned" | "packed" | "loaded" | "in transit" | "delivered";
export const MILESTONES: { key: Milestone; label: string; hint: string }[] = [
  { key: "planned", label: "Planned", hint: "Date and in-charge fixed" },
  { key: "packed", label: "Packed", hint: "Crated, marked and checked" },
  { key: "loaded", label: "Loaded", hint: "On the vehicle, documents handed over" },
  { key: "in transit", label: "In transit", hint: "Left the factory" },
  { key: "delivered", label: "Delivered", hint: "Received at site" },
];

export const PACKING_TYPES = [
  "Wooden crate (seaworthy)",
  "Wooden crate",
  "Wooden skid / pallet",
  "Shrink-wrap on skid",
  "Corrugated box",
  "Unpacked (tarpaulin covered)",
];
export const TRANSPORT_MODES = [
  "Road: closed container truck",
  "Road: open truck / trailer",
  "Road: low-bed / hydraulic trailer",
  "Customer pickup (ex-works)",
  "Courier / part load",
  "Rail",
  "Sea freight",
  "Air freight",
];
export const LOADING_METHODS = [
  "EOT crane",
  "Mobile crane / hydra",
  "Forklift",
  "Manual (light items)",
];

// What goes along with a test bench shipment.
export const DISPATCH_CHECKLIST: { key: string; label: string }[] = [
  { key: "packing_list", label: "Packing list with box-wise contents" },
  { key: "test_certificates", label: "Test certificates / FAT report" },
  { key: "calibration", label: "Instrument calibration certificates" },
  { key: "manuals", label: "Operation & maintenance manuals" },
  { key: "drawings", label: "As-built drawings (SLD, GA, wiring)" },
  { key: "software", label: "Software, licence keys and backup" },
  { key: "accessories", label: "Test leads, cables and accessories" },
  { key: "spares", label: "Spares kit" },
  { key: "invoice", label: "Tax invoice and e-way bill" },
  { key: "insurance", label: "Transit insurance cover" },
  { key: "markings", label: "Crate markings: this side up, fragile, CG" },
  { key: "photos", label: "Packing photos taken" },
];

/* ---------- Stage helpers ---------- */

export async function setStageStatusByName(
  inwardOrderId: string,
  stageName: string,
  status: StageStatus,
) {
  const { error } = await supabase
    .from("project_stages")
    .update({ status })
    .eq("inward_order_id", inwardOrderId)
    .eq("stage_name", stageName);
  return !error;
}

export function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function formatLongDate(value?: string) {
  if (!value) return "Date not set";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

export function relativeDay(value?: string, today = todayIso()) {
  if (!value) return "";
  const days = Math.round(
    (new Date(`${value}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000,
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
}
