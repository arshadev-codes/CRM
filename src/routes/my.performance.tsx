import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlarmClock, CheckCircle2, Clock3, RefreshCw, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";
import { AppTabBar } from "@/components/app/AppTabBar";
import { POINTS } from "@/lib/employeeScore";
import { loadMyPerformance, type MyPerformance, type ScoredItem } from "@/lib/myPerformance";
import { useCurrentUser } from "@/store/authStore";

export const Route = createFileRoute("/my/performance")({
  head: () => ({ meta: [{ title: "Performance — Electrosoft" }] }),
  component: PerformancePage,
});

// Earned and deducted points: two hues checked for colour-blind separation.
const EARNED = "#4f46e5";
const DEDUCTED = "#e11d48";

const RESULT = {
  "on-time": { label: "On time", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
  late: { label: "Finished late", icon: Clock3, tone: "bg-amber-50 text-amber-700" },
  overdue: { label: "Overdue", icon: AlarmClock, tone: "bg-rose-50 text-rose-700" },
} as const;

function formatDate(iso?: string) {
  if (!iso) return "No date";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

function PerformancePage() {
  const user = useCurrentUser();
  const [data, setData] = useState<MyPerformance | null>(null);
  const [error, setError] = useState(false);

  async function load() {
    if (!user) return;
    setError(false);
    try {
      setData(await loadMyPerformance(user));
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <div className="min-h-svh bg-slate-50 pb-24">
      <AppHeader title="Performance" subtitle="Your points from finished work" />

      <div className="mx-auto max-w-xl space-y-4 px-4 py-4">
        {error && (
          <button
            type="button"
            onClick={() => void load()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
          >
            <RefreshCw className="h-4 w-4" /> Could not load. Tap to try again.
          </button>
        )}

        {!data && !error && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        )}

        {data && (
          <>
            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
              <div className="text-xs font-semibold text-slate-500">Total points</div>
              <div className="mt-1 flex items-end gap-3">
                <span className="text-4xl font-bold text-slate-900">{data.total}</span>
                <span className="mb-1 text-sm text-slate-500">
                  <span className="font-semibold text-slate-700">{signed(data.earned)}</span> earned
                  · <span className="font-semibold text-slate-700">{data.deducted}</span> deducted
                </span>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                <Count label="On time" value={data.onTime} />
                <Count label="Late" value={data.late} />
                <Count label="Overdue" value={data.overdue} />
                <Count label="In progress" value={data.open} />
              </div>
            </section>

            <MonthChart data={data} />
            <ProjectChart data={data} />
            <PastWork items={data.items} />

            <p className="px-1 text-xs text-slate-500">
              Points: finished on time {signed(POINTS.onTime)}, finished late {signed(POINTS.late)},
              overdue and still open {POINTS.overdue}.
            </p>
          </>
        )}
      </div>
      <AppTabBar />
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-1 py-2">
      <div className="text-lg font-bold text-slate-800">{value}</div>
      <div className="text-[10px] font-medium text-slate-500">{label}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-slate-200">
      <div className="mb-1 font-semibold text-slate-800">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold text-slate-800">{signed(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function MonthChart({ data }: { data: MyPerformance }) {
  const empty = data.months.every((m) => !m.earned && !m.deducted);
  return (
    <Card title="Month wise">
      <div className="mt-2 flex gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: EARNED }} /> Earned
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: DEDUCTED }} /> Deducted
        </span>
      </div>
      {empty ? (
        <Empty text="No points in the last 6 months yet." />
      ) : (
        <div className="mt-2 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.months}
              stackOffset="sign"
              margin={{ top: 8, right: 4, left: -24, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                allowDecimals={false}
              />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
              <Bar
                dataKey="earned"
                name="Earned"
                stackId="points"
                fill={EARNED}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="deducted"
                name="Deducted"
                stackId="points"
                fill={DEDUCTED}
                radius={[0, 0, 4, 4]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function ProjectChart({ data }: { data: MyPerformance }) {
  const rows = data.projects.slice(0, 8);
  return (
    <Card title="Project wise">
      {rows.length === 0 ? (
        <Empty text="Points show here once you finish work on a project." />
      ) : (
        <div className="mt-2" style={{ height: rows.length * 40 + 16 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 0, right: 36, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="project"
                width={120}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#475569" }}
                tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
              <ReferenceLine x={0} stroke="#94a3b8" />
              <Bar dataKey="points" name="Points" radius={4} maxBarSize={20}>
                {rows.map((row) => (
                  <Cell key={row.orderId} fill={row.points < 0 ? DEDUCTED : EARNED} />
                ))}
                <LabelList
                  dataKey="points"
                  position="right"
                  formatter={(v: number) => signed(v)}
                  style={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function PastWork({ items }: { items: ScoredItem[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 10);
  return (
    <Card title="Past work">
      {items.length === 0 ? (
        <Empty text="Finished work and its points will be listed here." />
      ) : (
        <>
          <ul className="mt-2 divide-y divide-slate-100">
            {shown.map((item) => {
              const result = RESULT[item.result];
              const Icon = result.icon;
              return (
                <li key={item.key} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">
                      {item.title}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {item.project} · {item.context}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px]">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${result.tone}`}
                      >
                        <Icon className="h-3 w-3" /> {result.label}
                      </span>
                      <span className="text-slate-400">{formatDate(item.date)}</span>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-slate-800">
                    {signed(item.points)}
                  </span>
                </li>
              );
            })}
          </ul>
          {items.length > 10 && (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="mt-1 w-full rounded-xl py-2 text-xs font-semibold text-indigo-600"
            >
              {all ? "Show less" : `Show all ${items.length}`}
            </button>
          )}
        </>
      )}
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-6 text-sm text-slate-500">
      <TrendingUp className="h-4 w-4 shrink-0 text-slate-400" /> {text}
    </div>
  );
}
