import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Bell, CheckCheck, FileSpreadsheet, Info, PackageCheck, PenTool } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { timeAgo } from "@/components/stages/shared";
import { useCurrentUser } from "@/store/authStore";
import { useProposalStore } from "@/store/proposalStore";
import {
  notify, useNotificationStore, visibleTo, type NotificationKind,
} from "@/store/notificationStore";
import { supabase } from "@/lib/db";
import { mapProcurement, qtyToProcure, todayIso } from "@/lib/procurement";

const KIND_META: Record<NotificationKind, { icon: typeof Bell; tone: string; label: string }> = {
  material: { icon: PackageCheck, tone: "bg-amber-50 text-amber-600", label: "Material" },
  design: { icon: PenTool, tone: "bg-violet-50 text-violet-600", label: "Design" },
  bom: { icon: FileSpreadsheet, tone: "bg-emerald-50 text-emerald-600", label: "BOM" },
  info: { icon: Info, tone: "bg-sky-50 text-sky-600", label: "Info" },
};

/**
 * Once a day per browser: one notice per order with materials expected today
 * that haven't fully arrived. Goes to procurement and production people.
 */
async function checkMaterialsArrivingToday() {
  const today = todayIso();
  const { data, error } = await supabase.from("procurement_items").select("*").eq("expected_date", today);
  if (error || !data?.length) return;
  const orders = useProposalStore.getState().inwardOrders;
  const byOrder = new Map<string, string[]>();
  for (const row of data) {
    const item = mapProcurement(row);
    if (qtyToProcure(item) === 0) continue;
    byOrder.set(row.inward_order_id, [...(byOrder.get(row.inward_order_id) ?? []), item.itemName]);
  }
  for (const [orderId, names] of byOrder) {
    const order = orders.find((o) => o.id === orderId);
    notify({
      kind: "material",
      title: `${names.length} material${names.length === 1 ? "" : "s"} arriving today`,
      body: `${order?.projectNumber ?? "An order"}: ${names.slice(0, 3).join(", ")}${names.length > 3 ? ` and ${names.length - 3} more` : ""}`,
      link: `/inward-orders/${orderId}/stages/procurement`,
      audience: ["procurement", "production"],
      dedupeKey: `material:${orderId}:${today}`,
    });
  }
}

export function NotificationBell() {
  const user = useCurrentUser();
  const router = useRouter();
  const items = useNotificationStore((s) => s.items);
  const markRead = useNotificationStore((s) => s.markRead);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) void checkMaterialsArrivingToday();
  }, [user]);

  const mine = useMemo(() => items.filter((n) => visibleTo(user, n)), [items, user]);
  if (!user) return null;
  const unread = mine.filter((n) => !n.readBy.includes(user.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative grid h-9 w-9 place-items-center rounded-xl neo-pop text-slate-600 outline-none"
        aria-label={unread.length ? `${unread.length} unread notifications` : "Notifications"}
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow ring-2 ring-white es-pop-in">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(380px,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <div>
            <div className="text-sm font-bold text-slate-800">Notifications</div>
            <div className="text-xs text-slate-500">
              {unread.length ? `${unread.length} new` : "You're all caught up"}
            </div>
          </div>
          {unread.length > 0 && (
            <button
              type="button"
              onClick={() => markRead(unread.map((n) => n.id), user.id)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-2 pb-2">
          {mine.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Nothing yet.</p>
              <p className="text-xs text-slate-400">Material arrivals and design changes for your work show up here.</p>
            </div>
          ) : (
            mine.slice(0, 50).map((n) => {
              const meta = KIND_META[n.kind];
              const isNew = !n.readBy.includes(user.id);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    markRead([n.id], user.id);
                    setOpen(false);
                    if (n.link) router.history.push(n.link);
                  }}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/70 ${isNew ? "bg-indigo-50/60" : ""}`}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${meta.tone}`}>
                    <meta.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-800">{n.title}</span>
                      {isNew && <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
                    </span>
                    <span className="line-clamp-2 block text-xs text-slate-500">{n.body}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">
                      {meta.label} · {timeAgo(new Date(n.createdAt).toISOString())}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
