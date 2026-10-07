import type { LucideIcon } from "lucide-react";

/** Summary number with an icon chip, used at the top of list pages. */
export function StatTile({
  icon: Icon,
  label,
  value,
  tone,
  active = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  /** Icon chip colours, e.g. "text-indigo-600 bg-indigo-50". */
  tone: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold leading-none text-slate-800">{value}</span>
        <span className="mt-1 block truncate text-xs text-slate-500">{label}</span>
      </span>
    </>
  );
  const cls = `neo-surface flex items-center gap-3 rounded-2xl p-4 text-left transition-all ${active ? "ring-2 ring-indigo-300" : ""}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} hover:-translate-y-0.5`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}
