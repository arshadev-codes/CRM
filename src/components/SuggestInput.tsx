import * as React from "react";
import { useMemo, useState } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MAX_SHOWN = 8;

// Text box that lists matching earlier values while typing; click one (or use the
// arrow keys and Enter) to fill it in. Free text is still allowed.
export function SuggestInput({
  value,
  onValueChange,
  suggestions,
  onKeyDown,
  onBlur,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  suggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const needle = value.trim().toLowerCase();
    const seen = new Set<string>();
    const starts: string[] = [];
    const contains: string[] = [];
    for (const raw of suggestions) {
      const option = raw.trim();
      const lower = option.toLowerCase();
      if (!option || seen.has(lower) || lower === needle) continue;
      seen.add(lower);
      if (!needle || lower.startsWith(needle)) starts.push(option);
      else if (lower.includes(needle)) contains.push(option);
    }
    const byName = (a: string, b: string) => a.localeCompare(b);
    return [...starts.sort(byName), ...contains.sort(byName)].slice(0, MAX_SHOWN);
  }, [value, suggestions]);

  const showing = open && matches.length > 0;

  function pick(option: string) {
    onValueChange(option);
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <Popover open={showing} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          {...props}
          ref={inputRef}
          value={value}
          autoComplete="off"
          className={className}
          onFocus={(event) => {
            setOpen(true);
            props.onFocus?.(event);
          }}
          onChange={(event) => {
            onValueChange(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onBlur={(event) => {
            setOpen(false);
            onBlur?.(event);
          }}
          onKeyDown={(event) => {
            if (showing) {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const step = event.key === "ArrowDown" ? 1 : -1;
                setActive((current) => (current + step + matches.length) % matches.length);
                return;
              }
              if (event.key === "Enter" && matches[active]) {
                event.preventDefault();
                event.stopPropagation();
                pick(matches[active]);
                return;
              }
              if (event.key === "Escape") {
                event.stopPropagation();
                setOpen(false);
                return;
              }
            }
            onKeyDown?.(event);
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-44 p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (event.target === inputRef.current) event.preventDefault();
        }}
      >
        <ul role="listbox" className="max-h-64 overflow-auto">
          {matches.map((option, index) => (
            <li
              key={option}
              role="option"
              aria-selected={index === active}
              // mousedown keeps focus in the input so its blur does not close the list first
              onMouseDown={(event) => {
                event.preventDefault();
                pick(option);
              }}
              onMouseEnter={() => setActive(index)}
              className={cn(
                "cursor-pointer truncate rounded-md px-2.5 py-1.5 text-sm",
                index === active ? "bg-primary/10 text-primary" : "text-foreground",
              )}
            >
              {option}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
