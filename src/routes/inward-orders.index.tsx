import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { PackageCheck, CalendarCheck, User } from "lucide-react";
import { useProposalStore } from "@/store/proposalStore";

export const Route = createFileRoute("/inward-orders/")({
  head: () => ({
    meta: [
      { title: "Inward Orders — Electrosoft Proposal Engine" },
      { name: "description", content: "Works orders created from won transformer testing system quotations." },
      { property: "og:title", content: "Inward Orders — Electrosoft Proposal Engine" },
      { property: "og:description", content: "Works orders created from won transformer testing system quotations." },
    ],
  }),
  component: InwardOrders,
});

const STATUS_CHIP: Record<string, string> = {
  Open: "bg-indigo-50 text-indigo-600",
  "In Progress": "bg-amber-50 text-amber-700",
  Completed: "bg-emerald-50 text-emerald-700",
};

function InwardOrders() {
  const orders = useProposalStore((s) => s.inwardOrders);
  const hydrate = useProposalStore((s) => s.hydrateInwardOrders);

  useEffect(() => { void hydrate(); }, [hydrate]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Inward Orders</h1>
        <p className="text-sm text-slate-500 mt-1">Won quotations moved into execution.</p>
      </div>

      {orders.length === 0 ? (
        <div className="neo-surface rounded-2xl py-20 text-center text-slate-400">
          <PackageCheck className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-slate-500">No inward orders yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map((o) => (
            <Link
              key={o.id}
              to="/inward-orders/$id"
              params={{ id: o.id }}
              className="neo-surface block p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-mono font-semibold text-sm truncate text-slate-800" title={o.projectNumber}>
                  {o.projectNumber}
                </div>
                <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full
                                  ${STATUS_CHIP[o.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {o.status}
                </span>
              </div>
              <p className="text-sm text-slate-700 truncate">{o.projectName || "Untitled project"}</p>
              <p className="text-xs text-slate-500 mt-1 truncate">{o.customerName || "No customer"}</p>
              <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  Supervisor: <span className="text-slate-700">{o.supervisor || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-3.5 w-3.5 text-slate-400" />
                  Readiness: <span className="text-slate-700">{o.readinessDate || "—"}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
