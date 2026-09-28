import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import { ArrowLeft, LoaderCircle, PackageSearch, PenTool } from "lucide-react";
import { toast } from "sonner";
import { useProposalStore } from "@/store/proposalStore";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  loadStages,
  mapStage,
  stageProgress,
  STAGE_NAMES,
  STAGE_PAGES,
  type Stage,
  type StagePageSlug,
  type StageStatus,
} from "@/lib/stages";
import { Button } from "@/components/ui/button";
import { EASE, ProgressRing, StatusPicker, useStageAuthor } from "@/components/stages/shared";
import { DesignStage, type StageBodyProps } from "@/components/stages/DesignStage";
import { ProcurementStage } from "@/components/stages/ProcurementStage";

export const Route = createFileRoute("/inward-orders/$id_/stages/$stage")({
  beforeLoad: ({ params }) => {
    if (!(params.stage in STAGE_PAGES)) throw notFound();
  },
  head: ({ params }) => {
    const page = STAGE_PAGES[params.stage as StagePageSlug];
    const title = `${page?.name ?? "Stage"} — Inward Order — Electrosoft Proposal Engine`;
    const description = `${page?.summary ?? "Stage progress"} for an inward order.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: StagePage,
});

const STAGE_ICONS: Record<StagePageSlug, typeof PenTool> = {
  design: PenTool,
  procurement: PackageSearch,
};

function StagePage() {
  const { id, stage: slug } = Route.useParams();
  const pageSlug = slug as StagePageSlug;
  const page = STAGE_PAGES[pageSlug];
  const orders = useProposalStore((s) => s.inwardOrders);
  const hydrateOrders = useProposalStore((s) => s.hydrateInwardOrders);
  const employees = useProposalStore((s) => s.employees);
  const order = orders.find((item) => item.id === id);
  const [author, chooseAuthor] = useStageAuthor();
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<Stage[]>([]);

  useEffect(() => {
    void hydrateOrders();
  }, [hydrateOrders]);

  useEffect(() => {
    let active = true;
    void loadStages(id).then((result) => {
      if (!active) return;
      if (result.error) toast.error("Could not load project stages");
      setStages(result.stages);
      setLoading(false);
    });

    // Live: stage changes made elsewhere move the progress ring without a refresh.
    const channel = supabase
      .channel(`stages-${id}-${slug}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "project_stages",
          filter: `inward_order_id=eq.${id}`,
        },
        (payload) => {
          const next = mapStage(
            payload.new as Database["public"]["Tables"]["project_stages"]["Row"],
          );
          setStages((current) => current.map((item) => (item.id === next.id ? next : item)));
        },
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [id, slug]);

  const stage = stages.find((item) => item.stageName === page.name);
  const progress = useMemo(() => stageProgress(stages), [stages]);
  const doneCount = stages.filter((item) => item.status === "done").length;

  async function setStageStatus(status: StageStatus) {
    if (!stage || stage.status === status) return;
    const previous = stage.status;
    setStages((current) =>
      current.map((item) => (item.id === stage.id ? { ...item, status } : item)),
    );
    const { error } = await supabase.from("project_stages").update({ status }).eq("id", stage.id);
    if (error) {
      setStages((current) =>
        current.map((item) => (item.id === stage.id ? { ...item, status: previous } : item)),
      );
      toast.error("Could not update the stage status");
      return false;
    }
    return true;
  }

  if (!order && loading)
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <LoaderCircle className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  if (!order)
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <div className="neo-surface rounded-2xl p-10">
          <h1 className="text-xl font-semibold">Inward order not found</h1>
          <Button asChild variant="outline" className="mt-5">
            <Link to="/inward-orders">Back to Inward Orders</Link>
          </Button>
        </div>
      </div>
    );

  const stageIndex = STAGE_NAMES.indexOf(page.name);
  const Icon = STAGE_ICONS[pageSlug];
  const body: StageBodyProps = {
    orderId: id,
    slug,
    stageName: page.name,
    stage,
    setStageStatus,
    author,
    employees: employees.map((employee) => employee.name),
    onAuthor: chooseAuthor,
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="p-4 sm:p-6 lg:p-8">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mx-auto mb-6 flex w-full max-w-[80vw] flex-wrap items-center gap-4 max-lg:max-w-full"
        >
          <Button asChild size="icon" variant="outline" aria-label="Back to inward order">
            <Link to="/inward-orders/$id" params={{ id }}>
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 text-xs font-medium text-muted-foreground">
              <Link to="/inward-orders" className="hover:text-primary">
                Inward Orders
              </Link>
              <span>/</span>
              <Link to="/inward-orders/$id" params={{ id }} className="hover:text-primary">
                {order.projectNumber || "Order"}
              </Link>
              <span>/</span>
              <span className="text-primary">
                Stage {stageIndex + 1} of {STAGE_NAMES.length}
              </span>
            </div>
            <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold text-foreground sm:text-3xl">
              <span className="neo-pop grid h-10 w-10 place-items-center rounded-xl text-primary">
                <Icon className="h-5 w-5" />
              </span>
              {page.name}
            </h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {[order.customerName, order.projectName].filter(Boolean).join(" · ")}
            </p>
          </div>
          <StatusPicker status={stage?.status} onChange={(status) => void setStageStatus(status)} />
          <ProgressRing value={progress} caption={`${doneCount}/${STAGE_NAMES.length} stages`} />
        </motion.header>

        {pageSlug === "design" ? (
          <DesignStage {...body} drawingLabel="SLD" drawingTitle="Single Line Diagram" />
        ) : (
          <ProcurementStage {...body} />
        )}
      </div>
    </MotionConfig>
  );
}
