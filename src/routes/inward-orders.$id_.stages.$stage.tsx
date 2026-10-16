import { isWorkshopPerson } from "@/data/employeesData";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useProposalStore } from "@/store/proposalStore";
import { supabase } from "@/lib/db";
import type { Database } from "@/integrations/supabase/types";
import {
  loadStages,
  mapStage,
  stageProgress,
  STAGE_NAMES,
  LAST_ORDER_KEY,
  STAGE_PAGES,
  type Stage,
  type StagePageSlug,
  type StageStatus,
} from "@/lib/stages";
import { STAGE_THEME } from "@/lib/stageTheme";
import { Button } from "@/components/ui/button";
import { OrderSwitcher } from "@/components/stages/OrderSwitcher";
import { EASE, ProgressRing, StatusPicker, useStageAuthor } from "@/components/stages/shared";
import type { StageBodyProps } from "@/components/stages/DesignStage";
import { ListSkeleton, StagePageSkeleton } from "@/components/stages/StageSkeleton";
import { StageAccessProvider } from "@/components/stages/stageAccess";
import { ViewOnlyBadge } from "@/components/auth/Can";
import { useCan } from "@/store/authStore";
import { STAGE_PERMISSION } from "@/lib/permissions";

// Each stage's code is downloaded only when that stage is opened.
const DesignStage = lazy(() =>
  import("@/components/stages/DesignStage").then((m) => ({ default: m.DesignStage })),
);
const ProcurementStage = lazy(() =>
  import("@/components/stages/ProcurementStage").then((m) => ({ default: m.ProcurementStage })),
);
const TestingStage = lazy(() =>
  import("@/components/stages/TestingStage").then((m) => ({ default: m.TestingStage })),
);
const InspectionStage = lazy(() =>
  import("@/components/stages/InspectionStage").then((m) => ({ default: m.InspectionStage })),
);
const DispatchStage = lazy(() =>
  import("@/components/stages/DispatchStage").then((m) => ({ default: m.DispatchStage })),
);
const FabricationStage = lazy(() =>
  import("@/components/stages/FabricationStage").then((m) => ({ default: m.FabricationStage })),
);
const ProductionStage = lazy(() =>
  import("@/components/stages/ProductionStage").then((m) => ({ default: m.ProductionStage })),
);
const CommissioningStage = lazy(() =>
  import("@/components/stages/CommissioningStage").then((m) => ({
    default: m.CommissioningStage,
  })),
);

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

function StagePage() {
  const { id, stage: slug } = Route.useParams();
  const pageSlug = slug as StagePageSlug;
  const page = STAGE_PAGES[pageSlug];
  const perm = STAGE_PERMISSION[pageSlug] ?? "design_docs";
  const canEdit = useCan(perm);
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
    // Sidebar stage links reopen the order you were last working on.
    try {
      localStorage.setItem(LAST_ORDER_KEY, id);
    } catch {
      /* storage unavailable */
    }
  }, [id]);

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

  if (!order && loading) return <StagePageSkeleton />;
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
  const theme = STAGE_THEME[pageSlug];
  const Icon = theme.icon;
  const body: StageBodyProps = {
    orderId: id,
    slug,
    stageName: page.name,
    stage,
    setStageStatus,
    author,
    employees: employees
      .filter((employee) => isWorkshopPerson(employee) && employee.active !== false)
      .map((employee) => employee.name),
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
              <span className={theme.text}>
                Stage {stageIndex + 1} of {STAGE_NAMES.length}
              </span>
            </div>
            <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold text-foreground sm:text-3xl">
              <span
                className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md ${theme.gradient}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              {page.name}
              <ViewOnlyBadge perm={perm} />
            </h1>
            <OrderSwitcher orderId={id} slug={pageSlug} />
          </div>
          <StatusPicker
            status={stage?.status}
            readOnly={!canEdit}
            onChange={(status) => void setStageStatus(status)}
          />
          <ProgressRing value={progress} caption={`${doneCount}/${STAGE_NAMES.length} stages`} />
        </motion.header>

        {/* Keyed by order so switching orders starts each page fresh. */}
        <StageAccessProvider canEdit={canEdit}>
        <Suspense fallback={<ListSkeleton sections={2} rows={4} />}>
        <div key={id}>
          {pageSlug === "design" && (
            <DesignStage {...body} drawingLabel="SLD" drawingTitle="Single Line Diagram" />
          )}
          {pageSlug === "fabrication" && <FabricationStage {...body} />}
          {pageSlug === "production" && <ProductionStage {...body} />}
          {/* Remarks and updates feed under the trackers. */}
          {(pageSlug === "fabrication" || pageSlug === "production") && (
            <div className="mt-8">
              <DesignStage {...body} showDrawing={false} />
            </div>
          )}
          {pageSlug === "procurement" && <ProcurementStage {...body} />}
          {pageSlug === "testing" && <TestingStage {...body} />}
          {pageSlug === "inspection" && <InspectionStage {...body} />}
          {pageSlug === "dispatch" && <DispatchStage {...body} />}
          {pageSlug === "commissioning" && <CommissioningStage {...body} />}
        </div>
        </Suspense>
        </StageAccessProvider>
      </div>
    </MotionConfig>
  );
}
