import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LoaderCircle, PackageCheck } from "lucide-react";
import { useProposalStore } from "@/store/proposalStore";
import { LAST_ORDER_KEY, STAGE_PAGES, type StagePageSlug } from "@/lib/stages";
import { loadStageStatuses } from "@/lib/stageProgress";
import { Button } from "@/components/ui/button";

// Sidebar entry for a stage: opens the most relevant order on that stage with the
// order switcher open, so the user can pick another order straight away.
export const Route = createFileRoute("/stages/$stage")({
  beforeLoad: ({ params }) => {
    if (!(params.stage in STAGE_PAGES)) throw notFound();
  },
  head: ({ params }) => ({
    meta: [
      {
        title: `${STAGE_PAGES[params.stage as StagePageSlug]?.name ?? "Stage"} — Electrosoft Proposal Engine`,
      },
      { name: "description", content: "Choose an inward order to open at this stage." },
    ],
  }),
  component: StageEntry,
});

function StageEntry() {
  const { stage } = Route.useParams();
  const slug = stage as StagePageSlug;
  const navigate = useNavigate();
  const hydrate = useProposalStore((s) => s.hydrateInwardOrders);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    let active = true;
    async function resolve() {
      await hydrate();
      const statuses = await loadStageStatuses(STAGE_PAGES[slug].name);
      if (!active) return;
      const orders = useProposalStore.getState().inwardOrders;
      if (!orders.length) {
        setEmpty(true);
        return;
      }
      let last: string | null = null;
      try {
        last = localStorage.getItem(LAST_ORDER_KEY);
      } catch {
        /* storage unavailable */
      }
      const target =
        orders.find((o) => o.id === last) ??
        orders.find((o) => statuses.get(o.id) === "in progress") ??
        orders.find((o) => o.status !== "Completed") ??
        orders[0];
      void navigate({
        to: "/inward-orders/$id/stages/$stage",
        params: { id: target.id, stage: slug },
        search: { pick: 1 },
        replace: true,
      });
    }
    void resolve();
    return () => {
      active = false;
    };
  }, [slug, hydrate, navigate]);

  if (empty)
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <div className="neo-surface rounded-2xl p-10">
          <PackageCheck className="mx-auto h-10 w-10 text-primary/50" />
          <h1 className="mt-3 text-xl font-semibold">No inward orders yet</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Move a completed quotation to Inward Orders to start tracking its stages.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link to="/inward-orders">Go to Inward Orders</Link>
          </Button>
        </div>
      </div>
    );
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <LoaderCircle className="h-7 w-7 animate-spin text-primary" />
    </div>
  );
}
