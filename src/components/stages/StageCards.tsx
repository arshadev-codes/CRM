import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { STAGE_PAGES, STAGE_SLUGS, type Stage, type StagePageSlug } from "@/lib/stages";
import { STAGE_THEME } from "@/lib/stageTheme";
import { loadStageProgress, type StageProgress } from "@/lib/stageProgress";
import { EASE } from "./shared";

const STATUS_CHIP = {
  "not started": "bg-slate-200/70 text-slate-600",
  "in progress": "bg-sky-100 text-sky-700",
  done: "bg-emerald-100 text-emerald-700",
} as const;
const STATUS_LABEL = {
  "not started": "Not started",
  "in progress": "In progress",
  done: "Done",
} as const;

export function StageCards({ orderId, stages }: { orderId: string; stages: Stage[] }) {
  const [progress, setProgress] = useState<Partial<Record<StagePageSlug, StageProgress>>>({});

  useEffect(() => {
    if (!stages.length) return;
    let active = true;
    void loadStageProgress(orderId, stages).then((result) => active && setProgress(result));
    return () => {
      active = false;
    };
  }, [orderId, stages]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {STAGE_SLUGS.map((slug, index) => {
        const page = STAGE_PAGES[slug];
        const theme = STAGE_THEME[slug];
        const stage = stages.find((s) => s.stageName === page.name);
        const status = stage?.status ?? "not started";
        const info = progress[slug];
        const percent = info?.percent ?? (status === "done" ? 100 : 0);
        const Icon = theme.icon;
        return (
          <motion.div
            key={slug}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: EASE, delay: index * 0.05 }}
            whileHover={{ y: -5 }}
          >
            <Link
              to="/inward-orders/$id/stages/$stage"
              params={{ id: orderId, stage: slug }}
              className={`group relative flex h-full flex-col overflow-hidden rounded-2xl p-4 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${status === "in progress" ? `neo-pop ring-2 ${theme.ring}` : "neo-pop"}`}
            >
              <span
                className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${theme.gradient} ${status === "not started" ? "opacity-40" : ""}`}
              />
              <span
                className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full ${theme.soft} opacity-70 transition-transform duration-500 group-hover:scale-125`}
              />

              <div className="relative flex items-start justify-between gap-2">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md ${theme.gradient} ${status === "not started" ? "opacity-60 saturate-50" : ""}`}
                >
                  {status === "done" ? (
                    <Check className="h-5 w-5" strokeWidth={3} />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_CHIP[status]}`}
                >
                  {STATUS_LABEL[status]}
                </span>
              </div>

              <div className="relative mt-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Stage {index + 1}
                </div>
                <div
                  className={`text-base font-bold ${status === "not started" ? "text-foreground/70" : "text-foreground"}`}
                >
                  {page.name}
                </div>
              </div>

              <div className="relative mt-4 flex items-end justify-between">
                <span
                  className={`text-2xl font-bold ${status === "not started" ? "text-muted-foreground" : theme.text}`}
                >
                  {percent}%
                </span>
                <ArrowRight
                  className={`h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 ${theme.text}`}
                />
              </div>
              <div className="neo-inset relative mt-1.5 h-2 overflow-hidden rounded-full">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${theme.bar}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 1, ease: EASE, delay: 0.2 + index * 0.05 }}
                />
              </div>
              <div className="relative mt-2 min-h-[1rem] truncate text-xs text-muted-foreground">
                {info?.detail ?? " "}
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
