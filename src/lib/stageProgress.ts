import { supabase } from "@/lib/db";
import { MILESTONES, OUTCOME_META, type Milestone, type Outcome } from "@/lib/qa";
import { fabricationPercent } from "@/lib/fabrication";
import { taskPercent, type TaskStatus } from "@/lib/production";
import { sitePercent, type SiteStatus } from "@/lib/commissioning";
import { STAGE_PAGES, type Stage, type StagePageSlug, type StageStatus } from "@/lib/stages";

export type StageProgress = { percent: number; detail: string };

function fromStatus(status: StageStatus) {
  return status === "done" ? 100 : status === "in progress" ? 50 : 0;
}

// Real progress for each stage of one order, from the work recorded on its page.
// Falls back to the stage status when a stage has nothing recorded yet.
export async function loadStageProgress(
  orderId: string,
  stages: Stage[],
): Promise<Partial<Record<StagePageSlug, StageProgress>>> {
  const [updates, items, tests, outcome, dispatch, fabrication, production, site] =
    await Promise.all([
      supabase.from("stage_updates").select("stage_name, kind").eq("inward_order_id", orderId),
      supabase
        .from("procurement_items")
        .select("qty_required, qty_in_stock, qty_received")
        .eq("inward_order_id", orderId),
      supabase.from("test_items").select("status, witness_status").eq("inward_order_id", orderId),
      supabase
        .from("inspection_outcomes")
        .select("outcome")
        .eq("inward_order_id", orderId)
        .maybeSingle(),
      supabase
        .from("dispatch_details")
        .select("milestone")
        .eq("inward_order_id", orderId)
        .maybeSingle(),
      supabase
        .from("fabrication_jobs")
        .select("phase, given_on, received_on")
        .eq("inward_order_id", orderId),
      supabase.from("production_tasks").select("status").eq("inward_order_id", orderId),
      supabase.from("commissioning_tasks").select("status").eq("inward_order_id", orderId),
    ]);
  const siteRows = site.data ?? [];
  const fabRows = fabrication.data ?? [];
  const taskRows = production.data ?? [];
  const updateRows = updates.data ?? [];
  const itemRows = items.data ?? [];
  const testRows = tests.data ?? [];
  const status = (name: string) =>
    stages.find((s) => s.stageName === name)?.status ?? ("not started" as StageStatus);
  const updatesFor = (name: string) => updateRows.filter((u) => u.stage_name === name).length;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const result: Partial<Record<StagePageSlug, StageProgress>> = {};
  for (const slug of Object.keys(STAGE_PAGES) as StagePageSlug[]) {
    const name = STAGE_PAGES[slug].name;
    const st = status(name);
    let percent = fromStatus(st);
    let detail = "";
    switch (slug) {
      case "design": {
        const slds = updateRows.filter((u) => u.stage_name === name && u.kind === "sld").length;
        detail = slds
          ? `SLD R${slds - 1} · ${plural(updatesFor(name), "update")}`
          : "No SLD uploaded yet";
        break;
      }
      case "fabrication": {
        if (fabRows.length) {
          percent = fabricationPercent(
            fabRows.map((r) => ({
              phase:
                r.phase === "powder_coating"
                  ? ("powder_coating" as const)
                  : ("fabrication" as const),
              givenOn: r.given_on ?? undefined,
              receivedOn: r.received_on ?? undefined,
            })),
          );
          const out = fabRows.filter((r) => r.given_on && !r.received_on);
          const coating = fabRows.some((r) => r.phase === "powder_coating");
          detail = out.length
            ? `${out.length} ${out.length === 1 ? "batch" : "batches"} at vendor`
            : coating
              ? "Powder coating"
              : "Fabrication";
        } else detail = updatesFor(name) ? plural(updatesFor(name), "update") : "Not given yet";
        break;
      }
      case "production": {
        if (taskRows.length) {
          percent = taskPercent(taskRows.map((t) => ({ status: t.status as TaskStatus })));
          const done = taskRows.filter((t) => t.status === "done").length;
          detail = `${done}/${taskRows.length} work items done`;
        } else detail = updatesFor(name) ? plural(updatesFor(name), "update") : "No panels yet";
        break;
      }
      case "procurement": {
        if (itemRows.length) {
          const ready = itemRows.filter(
            (i) =>
              (Number(i.qty_in_stock) || 0) + (Number(i.qty_received) || 0) >=
              Number(i.qty_required),
          ).length;
          percent = Math.round((ready / itemRows.length) * 100);
          detail = `${ready}/${itemRows.length} items available`;
        } else detail = "No material list yet";
        break;
      }
      case "testing": {
        if (testRows.length) {
          const passed = testRows.filter((t) => t.status === "passed").length;
          const failed = testRows.filter((t) => t.status === "failed").length;
          percent = Math.round((passed / testRows.length) * 100);
          detail = `${passed}/${testRows.length} tests passed${failed ? ` · ${failed} failed` : ""}`;
        } else detail = "No tests yet";
        break;
      }
      case "inspection": {
        const decided = (outcome.data?.outcome ?? "") as Outcome;
        if (decided === "accepted" || decided === "accepted_with_remarks") {
          percent = 100;
          detail = OUTCOME_META[decided].label;
        } else if (testRows.length) {
          const seen = testRows.filter(
            (t) => t.witness_status === "witnessed" || t.witness_status === "accepted",
          ).length;
          percent = Math.round((seen / testRows.length) * 100);
          detail =
            decided === "rejected"
              ? "Rejected, re-inspection needed"
              : `${seen}/${testRows.length} witnessed`;
        } else detail = "Not inspected yet";
        break;
      }
      case "dispatch": {
        const milestone = dispatch.data?.milestone as Milestone | undefined;
        if (milestone) {
          const step = MILESTONES.findIndex((m) => m.key === milestone);
          percent = Math.round((step / (MILESTONES.length - 1)) * 100);
          detail = MILESTONES[step]?.label ?? "Planned";
        } else detail = "Not planned yet";
        break;
      }
      case "commissioning": {
        if (siteRows.length) {
          percent = sitePercent(siteRows.map((t) => ({ status: t.status as SiteStatus })));
          const done = siteRows.filter((t) => t.status === "done").length;
          const notDone = siteRows.filter((t) => t.status === "not done").length;
          detail = `${done}/${siteRows.length} site tasks done${notDone ? ` · ${notDone} not done` : ""}`;
        } else detail = "No site work assigned yet";
        break;
      }
    }
    if (st === "done") percent = 100;
    result[slug] = { percent, detail };
  }
  return result;
}

// How many orders are currently at each stage (status "in progress"), for the sidebar.
export async function loadActiveStageCounts() {
  const { data } = await supabase
    .from("project_stages")
    .select("stage_name")
    .eq("status", "in progress");
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.stage_name] = (counts[row.stage_name] ?? 0) + 1;
  return counts;
}

// Each order's status at one stage, for the order switcher.
export async function loadStageStatuses(stageName: string) {
  const { data } = await supabase
    .from("project_stages")
    .select("inward_order_id, status")
    .eq("stage_name", stageName);
  return new Map((data ?? []).map((row) => [row.inward_order_id, row.status as StageStatus]));
}
