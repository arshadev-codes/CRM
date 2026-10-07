import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronsUpDown } from "lucide-react";
import { useProposalStore } from "@/store/proposalStore";
import { STAGE_PAGES, type StagePageSlug, type StageStatus } from "@/lib/stages";
import { STAGE_THEME } from "@/lib/stageTheme";
import { loadStageStatuses } from "@/lib/stageProgress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const GROUPS: { status: StageStatus; title: string }[] = [
  { status: "in progress", title: "At this stage now" },
  { status: "not started", title: "Not started yet" },
  { status: "done", title: "Completed this stage" },
];
const DOT: Record<StageStatus, string> = {
  "in progress": "bg-sky-500",
  "not started": "bg-slate-300",
  done: "bg-emerald-500",
};

// Switch between inward orders without leaving the current stage.
export function OrderSwitcher({
  orderId,
  slug,
}: {
  orderId: string;
  slug: StagePageSlug;
}) {
  const navigate = useNavigate();
  const orders = useProposalStore((s) => s.inwardOrders);
  const [open, setOpen] = useState(false);
  const [statuses, setStatuses] = useState<Map<string, StageStatus>>(new Map());
  const page = STAGE_PAGES[slug];
  const theme = STAGE_THEME[slug];
  const current = orders.find((o) => o.id === orderId);

  useEffect(() => {
    void loadStageStatuses(page.name).then(setStatuses);
  }, [page.name, open]);

  const grouped = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        orders: orders.filter((o) => (statuses.get(o.id) ?? "not started") === group.status),
      })).filter((group) => group.orders.length),
    [orders, statuses],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Switch order"
          className={`group mt-1.5 flex max-w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left transition-all neo-pop hover:ring-2 ${theme.ring} ${open ? "ring-2" : ""}`}
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${theme.solid}`} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {current?.projectNumber || "Choose an order"}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {[current?.customerName, current?.projectName].filter(Boolean).join(" · ") ||
                `${orders.length} orders`}
            </span>
          </span>
          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:scale-110" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(380px,calc(100vw-2rem))] p-0">
        <Command>
          <CommandInput placeholder="Search order, customer or project…" />
          <CommandList className="max-h-[360px]">
            <CommandEmpty>No orders found.</CommandEmpty>
            {grouped.map((group) => (
              <CommandGroup key={group.status} heading={group.title}>
                {group.orders.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={`${o.projectNumber} ${o.customerName} ${o.projectName}`}
                    onSelect={() => {
                      setOpen(false);
                      if (o.id !== orderId)
                        void navigate({
                          to: "/inward-orders/$id/stages/$stage",
                          params: { id: o.id, stage: slug },
                        });
                    }}
                    className="flex items-center gap-3 py-2"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[group.status]}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {o.projectNumber || "Untitled order"}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[o.customerName, o.projectName].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    {o.id === orderId && <Check className={`h-4 w-4 ${theme.text}`} />}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
