import type { Database } from "@/integrations/supabase/types";

export type FabricationRow = Database["public"]["Tables"]["fabrication_jobs"]["Row"];

// Fabrication happens in two steps, in this order.
export const PHASES = [
  {
    key: "fabrication",
    label: "Fabrication",
    step: 1,
    hint: "Sheet metal and enclosure work given to the fabricator",
  },
  {
    key: "powder_coating",
    label: "Powder Coating",
    step: 2,
    hint: "Fabricated parts sent for powder coating once they are back",
  },
] as const;
export type Phase = (typeof PHASES)[number]["key"];

export type FabricationJob = {
  id: string;
  phase: Phase;
  description: string;
  vendor: string;
  contact: string;
  givenBy: string;
  givenOn?: string;
  expectedOn?: string;
  receivedOn?: string;
  receivedBy: string;
  remarks: string;
  displayOrder: number;
  createdAt: string;
};

export function mapFabrication(row: FabricationRow): FabricationJob {
  return {
    id: row.id,
    phase: row.phase === "powder_coating" ? "powder_coating" : "fabrication",
    description: row.description,
    vendor: row.vendor,
    contact: row.contact,
    givenBy: row.given_by,
    givenOn: row.given_on ?? undefined,
    expectedOn: row.expected_on ?? undefined,
    receivedOn: row.received_on ?? undefined,
    receivedBy: row.received_by,
    remarks: row.remarks,
    displayOrder: row.display_order,
    createdAt: row.created_at,
  };
}

export type JobState = "draft" | "at vendor" | "overdue" | "received";
export const JOB_META: Record<
  JobState,
  { label: string; dot: string; chip: string; accent: string }
> = {
  draft: {
    label: "Not given yet",
    dot: "bg-slate-400",
    chip: "bg-slate-100 text-slate-600",
    accent: "from-slate-300 to-slate-400",
  },
  "at vendor": {
    label: "At vendor",
    dot: "bg-sky-500",
    chip: "bg-sky-100 text-sky-700",
    accent: "from-sky-400 to-blue-500",
  },
  overdue: {
    label: "Overdue",
    dot: "bg-rose-500",
    chip: "bg-rose-100 text-rose-700",
    accent: "from-rose-400 to-red-500",
  },
  received: {
    label: "Received",
    dot: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-700",
    accent: "from-emerald-400 to-green-500",
  },
};

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function jobState(job: FabricationJob, today = todayIso()): JobState {
  if (job.receivedOn) return "received";
  if (!job.givenOn) return "draft";
  if (job.expectedOn && job.expectedOn < today) return "overdue";
  return "at vendor";
}

// A phase is done when it has work and all of it has come back.
export function phaseDone(jobs: FabricationJob[], phase: Phase) {
  const list = jobs.filter((j) => j.phase === phase);
  return list.length > 0 && list.every((j) => j.receivedOn);
}

// 0–100: each phase counts half; within a phase, given = half credit, received = full.
export function fabricationPercent(
  jobs: Pick<FabricationJob, "phase" | "givenOn" | "receivedOn">[],
) {
  let total = 0;
  for (const { key } of PHASES) {
    const list = jobs.filter((j) => j.phase === key);
    if (!list.length) continue;
    const score = list.reduce((s, j) => s + (j.receivedOn ? 1 : j.givenOn ? 0.5 : 0), 0);
    total += (score / list.length) * 50;
  }
  return Math.round(total);
}

export function formatDay(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(
    new Date(`${value}T00:00:00`),
  );
}

// Whole days from a to b (b later = positive).
export function daysBetween(a: string, b: string) {
  return Math.round(
    (new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000,
  );
}
