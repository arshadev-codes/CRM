import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const STAGE_NAMES = [
  "Design",
  "Fabrication",
  "Material Procurement",
  "Production",
  "Testing",
  "Inspection",
  "Dispatch",
] as const;
export type StageStatus = "not started" | "in progress" | "done";
export const STAGE_STATUSES: StageStatus[] = ["not started", "in progress", "done"];
export type Stage = {
  id: string;
  inwardOrderId: string;
  stageName: string;
  status: StageStatus;
  assignedTo: string;
  remarks: string;
  expectedDate?: string;
  displayOrder: number;
};

// Stages that have their own page, keyed by URL slug.
export const STAGE_PAGES = {
  design: { name: "Design", summary: "SLD drawing, remarks and progress" },
  procurement: {
    name: "Material Procurement",
    summary: "Material requirements, stock check, enquiries and deliveries",
  },
} as const;
export type StagePageSlug = keyof typeof STAGE_PAGES;
export function stagePageSlug(stageName: string): StagePageSlug | undefined {
  return (Object.keys(STAGE_PAGES) as StagePageSlug[]).find(
    (slug) => STAGE_PAGES[slug].name === stageName,
  );
}

export function mapStage(row: Database["public"]["Tables"]["project_stages"]["Row"]): Stage {
  return {
    id: row.id,
    inwardOrderId: row.inward_order_id,
    stageName: row.stage_name,
    status: row.status as StageStatus,
    assignedTo: row.assigned_to,
    remarks: row.remarks,
    expectedDate: row.expected_date ?? undefined,
    displayOrder: row.display_order,
  };
}

// Creates the seven default stages if missing, then returns them in order.
export async function loadStages(inwardOrderId: string) {
  const defaultRows = STAGE_NAMES.map((stageName, index) => ({
    inward_order_id: inwardOrderId,
    stage_name: stageName,
    display_order: index + 1,
  }));
  await supabase
    .from("project_stages")
    .upsert(defaultRows, { onConflict: "inward_order_id,stage_name", ignoreDuplicates: true });
  const result = await supabase
    .from("project_stages")
    .select("*")
    .eq("inward_order_id", inwardOrderId)
    .order("display_order");
  return { stages: (result.data ?? []).map(mapStage), error: result.error };
}

// Not started = 0, in progress = 0.5, done = 1, over all seven stages.
export function stageProgress(stages: Stage[]) {
  const score = stages.reduce(
    (total, stage) =>
      total + (stage.status === "done" ? 1 : stage.status === "in progress" ? 0.5 : 0),
    0,
  );
  return Math.round((score / STAGE_NAMES.length) * 100);
}
