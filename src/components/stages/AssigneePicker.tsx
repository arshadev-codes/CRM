import { useMemo, useState } from "react";
import { Check, Plus, Search, UserPlus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { initials } from "./shared";

const AVATAR_TONES = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-600",
  "bg-indigo-500",
];
function tone(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

export function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span
      title={name}
      className={`grid shrink-0 place-items-center rounded-full font-bold text-white ring-2 ring-[var(--neo-bg)] ${tone(name)} ${size === "md" ? "h-7 w-7 text-[11px]" : "h-6 w-6 text-[10px]"}`}
    >
      {initials(name)}
    </span>
  );
}

// Pick one or more people. Names not in the employee list can be typed in and added.
export function AssigneePicker({
  value,
  employees,
  onChange,
  compact = false,
  placeholder = "Assign",
  hints,
}: {
  value: string[];
  employees: string[];
  onChange: (next: string[]) => void;
  compact?: boolean;
  placeholder?: string;
  /** A short note under each name, e.g. the designation. */
  hints?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const options = useMemo(() => {
    const all = [...new Set([...employees, ...value])];
    const needle = query.trim().toLowerCase();
    return needle ? all.filter((name) => name.toLowerCase().includes(needle)) : all;
  }, [employees, value, query]);
  const typed = query.trim();
  const canAdd =
    typed.length > 1 && !options.some((name) => name.toLowerCase() === typed.toLowerCase());

  function toggle(name: string) {
    onChange(value.includes(name) ? value.filter((n) => n !== name) : [...value, name]);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group/assign flex min-h-8 min-w-0 max-w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-xs transition-colors hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={value.length ? `Assigned to ${value.join(", ")}` : placeholder}
        >
          {value.length ? (
            <>
              <span className="flex -space-x-1.5">
                {value.slice(0, 3).map((name) => (
                  <Avatar key={name} name={name} />
                ))}
              </span>
              {value.length > 3 && (
                <span className="text-[11px] font-semibold text-muted-foreground">
                  +{value.length - 3}
                </span>
              )}
              {!compact && (
                <span className="truncate font-medium text-foreground/80">
                  {value.length === 1 ? value[0] : `${value.length} people`}
                </span>
              )}
            </>
          ) : (
            <span className="flex items-center gap-1.5 text-muted-foreground group-hover/assign:text-primary">
              <span className="grid h-6 w-6 place-items-center rounded-full border border-dashed border-muted-foreground/40">
                <UserPlus className="h-3 w-3" />
              </span>
              {!compact && placeholder}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canAdd) {
                event.preventDefault();
                onChange([...value, typed]);
                setQuery("");
              }
            }}
            placeholder="Search or type a name"
            className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul className="max-h-60 overflow-y-auto p-1">
          {options.map((name) => {
            const selected = value.includes(name);
            return (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => toggle(name)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-primary/[0.07] ${selected ? "text-primary" : ""}`}
                >
                  <Avatar name={name} />
                  <span className="min-w-0 flex-1 truncate">
                    {name}
                    {hints?.[name] && (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {hints[name]}
                      </span>
                    )}
                  </span>
                  {selected && <Check className="h-4 w-4" />}
                </button>
              </li>
            );
          })}
          {canAdd && (
            <li>
              <button
                type="button"
                onClick={() => {
                  onChange([...value, typed]);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-primary hover:bg-primary/[0.07]"
              >
                <Plus className="h-4 w-4" /> Add “{typed}”
              </button>
            </li>
          )}
          {!options.length && !canAdd && (
            <li className="px-2 py-3 text-center text-xs text-muted-foreground">No one found</li>
          )}
        </ul>
        {value.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/60 px-3 py-1.5 text-xs">
            <span className="text-muted-foreground">{value.length} assigned</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex items-center gap-1 font-medium text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
