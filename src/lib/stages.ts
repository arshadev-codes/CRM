import { supabase } from "@/lib/db";
import type { Database } from "@/integrations/supabase/types";

export const STAGE_NAMES = [
  "Design",
  "Fabrication",
  "Material Procurement",
  "Production",
  "Testing",
  "Inspection",
  "Dispatch",
  "Commissioning & Installation",
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
  design: { name: "Design", summary: "Design documents, BOM, remarks and progress" },
  fabrication: { name: "Fabrication", summary: "Fabrication status, updates and remarks" },
  procurement: {
    name: "Material Procurement",
    summary: "Material requirements, stock check, enquiries and deliveries",
  },
  production: { name: "Production", summary: "Production status, updates and remarks" },
  testing: { name: "Testing", summary: "Test checklist, testing sessions and minutes of meeting" },
  inspection: {
    name: "Inspection",
    summary: "Client inspection visits, witnessed tests, minutes and outcome",
  },
  dispatch: { name: "Dispatch", summary: "Pre-dispatch inspection, packing, transport and delivery" },
  commissioning: {
    name: "Commissioning & Installation",
    summary: "Site work assigned to engineers, confirmed from their phones",
  },
} as const;
export type StagePageSlug = keyof typeof STAGE_PAGES;
// Remembers the order last opened on a stage page, for the sidebar stage links.
export const LAST_ORDER_KEY = "last_inward_order";

// Slugs in stage order, for navigation.
export const STAGE_SLUGS = Object.keys(STAGE_PAGES) as (keyof typeof STAGE_PAGES)[];
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

// Creates the default stages if missing, then returns them in order.
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

// Not started = 0, in progress = 0.5, done = 1, over all stages.
export function stageProgress(stages: Stage[]) {
  const score = stages.reduce(
    (total, stage) =>
      total + (stage.status === "done" ? 1 : stage.status === "in progress" ? 0.5 : 0),
    0,
  );
  return Math.round((score / STAGE_NAMES.length) * 100);
}

/** "all" = every stage done (order finished). */
export type CurrentStage = (typeof STAGE_NAMES)[number] | "all";

/**
 * Puts an order at one stage: the stages before it done, it in progress, the rest not started.
 * Used to bring orders already running in the workshop into the app at the right place.
 * Retries for a few seconds while a just-created order is still being saved.
 */
export async function setCurrentStage(inwardOrderId: string, current: CurrentStage) {
  const at = current === "all" ? STAGE_NAMES.length : STAGE_NAMES.indexOf(current);
  const rows = STAGE_NAMES.map((stageName, index) => ({
    inward_order_id: inwardOrderId,
    stage_name: stageName,
    display_order: index + 1,
    status: (index < at ? "done" : index === at ? "in progress" : "not started") as StageStatus,
  }));
  for (let attempt = 0; ; attempt++) {
    const { error } = await supabase
      .from("project_stages")
      .upsert(rows, { onConflict: "inward_order_id,stage_name" });
    if (!error) return true;
    if (error.code !== "23503" || attempt >= 8) return false;
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
}
