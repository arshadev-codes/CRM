import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, ChevronRight, ClipboardList, LayoutList, RefreshCw } from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";
import { AppNotifications } from "@/components/app/AppNotifications";
import { AppTabBar } from "@/components/app/AppTabBar";
import { loadMyWork, type MyOrder } from "@/lib/myWork";
import { isLate, taskPercent } from "@/lib/production";
import { todayIso } from "@/lib/procurement";
import { useCurrentUser } from "@/store/authStore";

export const Route = createFileRoute("/my/")({
  head: () => ({ meta: [{ title: "My work — Electrosoft" }] }),
  component: MyWorkPage,
});

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function MyWorkPage() {
  const user = useCurrentUser();
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [error, setError] = useState(false);
  const today = todayIso();

  async function load() {
    if (!user) return;
    setError(false);
    try {
      setOrders(await loadMyWork(user));
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const openTasks =
    orders?.reduce((n, o) => n + o.tasks.filter((t) => t.status !== "done").length, 0) ?? 0;
  const lateTasks =
    orders?.reduce((n, o) => n + o.tasks.filter((t) => isLate(t, today)).length, 0) ?? 0;

  return (
    <div className="min-h-svh bg-slate-50 pb-24">
      <AppHeader
        title={`Assalamualaikum, ${user?.name.split(" ")[0] ?? ""}`}
        subtitle="Your assigned work"
      />

      <div className="mx-auto max-w-xl space-y-4 px-4 py-4">
        {user && <AppNotifications userId={user.id} />}

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Orders" value={orders?.length ?? "–"} />
          <Stat label="Open tasks" value={orders ? openTasks : "–"} />
          <Stat
            label="Late"
            value={orders ? lateTasks : "–"}
            tone={lateTasks ? "text-rose-600" : undefined}
          />
        </div>

        {error && (
          <button
            type="button"
            onClick={() => void load()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
          >
            <RefreshCw className="h-4 w-4" /> Could not load. Tap to try again.
          </button>
        )}

        {!orders && !error && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        )}

        {orders && orders.length === 0 && (
          <div className="rounded-3xl bg-white px-6 py-14 text-center shadow-sm">
            <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
            <div className="mt-3 font-semibold text-slate-700">No work assigned yet</div>
            <div className="mt-1 text-sm text-slate-500">
              When a panel or task is assigned to you, it will show here.
            </div>
          </div>
        )}

        {orders?.map(({ order, panels, tasks, stages }) => {
          const open = tasks.filter((t) => t.status !== "done").length;
          const late = tasks.filter((t) => isLate(t, today)).length;
          const percent = taskPercent(tasks);
          const next = tasks
            .filter((t) => t.status !== "done" && t.endDate)
            .map((t) => t.endDate!)
            .sort()[0];
          return (
            <Link
              key={order.id}
              to="/my/$orderId"
              params={{ orderId: order.id }}
              className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 active:scale-[0.99]"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-indigo-600">
                    {order.project_number}
                  </div>
                  <div className="truncate text-base font-bold text-slate-800">
                    {order.customer_name || order.project_name || "Order"}
                  </div>
                  {order.project_name && order.customer_name && (
                    <div className="truncate text-xs text-slate-500">{order.project_name}</div>
                  )}
                </div>
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {panels.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700"
                  >
                    <LayoutList className="h-3 w-3" /> {p.panelType}
                  </span>
                ))}
                {stages.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                  >
                    {s}
                  </span>
                ))}
              </div>
              {tasks.length > 0 && (
                <>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span>
                      {open} open of {tasks.length}
                    </span>
                    {late > 0 && <span className="font-semibold text-rose-600">{late} late</span>}
                    {next && (
                      <span className="ml-auto inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" /> Next due {formatDate(next)}
                      </span>
                    )}
                  </div>
                </>
              )}
            </Link>
          );
        })}
      </div>
      <AppTabBar />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3 text-center shadow-sm ring-1 ring-slate-200/70">
      <div className={`text-2xl font-bold ${tone ?? "text-slate-800"}`}>{value}</div>
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
    </div>
  );
}
