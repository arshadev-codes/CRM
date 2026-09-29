import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { STAGE_STATUSES, type StageStatus } from "@/lib/stages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const EASE = [0.22, 1, 0.36, 1] as const;
const AUTHOR_KEY = "stage_update_author";

// The person posting on stage pages; remembered per browser until the app has user accounts.
export function useStageAuthor() {
  const [author, setAuthor] = useState("");
  useEffect(() => {
    try {
      setAuthor(localStorage.getItem(AUTHOR_KEY) ?? "");
    } catch {
      /* storage unavailable */
    }
  }, []);
  const chooseAuthor = (name: string) => {
    setAuthor(name);
    try {
      localStorage.setItem(AUTHOR_KEY, name);
    } catch {
      /* storage unavailable */
    }
  };
  return [author, chooseAuthor] as const;
}

export const STATUS_LABEL: Record<StageStatus, string> = {
  "not started": "Not started",
  "in progress": "In progress",
  done: "Done",
};
export const STATUS_TONE: Record<StageStatus, string> = {
  "not started": "bg-muted text-muted-foreground",
  "in progress": "bg-primary/12 text-primary",
  done: "bg-emerald-100 text-emerald-700",
};
export const STATUS_DOT: Record<StageStatus, string> = {
  "not started": "bg-muted-foreground/50",
  "in progress": "bg-primary",
  done: "bg-emerald-500",
};

export function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}
export function initials(name: string) {
  return (
    name
      .split(/[\s.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}
export function formatSize(bytes: number) {
  if (!bytes) return "";
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
export function formatStamp(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
export function timeAgo(value: string) {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  return formatStamp(value);
}

export function ProgressRing({ value, caption }: { value: number; caption: string }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      className="neo-surface flex items-center gap-3 rounded-2xl px-4 py-2.5"
      role="img"
      aria-label={`Project ${value}% complete, ${caption}`}
    >
      <svg viewBox="0 0 64 64" className="h-14 w-14 -rotate-90">
        <circle cx="32" cy="32" r={radius} fill="none" strokeWidth="7" className="stroke-muted" />
        <motion.circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          stroke="url(#ring-gradient)"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - value / 100) }}
          transition={{ duration: 1.1, ease: EASE }}
        />
        <defs>
          <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--chart-2)" />
          </linearGradient>
        </defs>
      </svg>
      <div>
        <motion.div
          key={value}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-bold leading-none text-primary"
        >
          {value}%
        </motion.div>
        <div className="mt-1 text-[11px] font-medium text-muted-foreground">{caption}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </div>
      </div>
    </div>
  );
}

export function StatusPicker({
  status,
  onChange,
}: {
  status?: StageStatus;
  onChange: (status: StageStatus) => void;
}) {
  return (
    <div className="neo-surface flex items-center gap-3 rounded-2xl px-4 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Stage status
      </div>
      <Select
        value={status}
        onValueChange={(value) => onChange(value as StageStatus)}
        disabled={!status}
      >
        <SelectTrigger className="h-9 w-[150px]" aria-label="Stage status">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {STAGE_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[value]}`} />
                {STATUS_LABEL[value]}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
