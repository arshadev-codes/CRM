import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Permission } from "@/lib/permissions";
import { userCan, type AppUser } from "@/store/authStore";

// Phase 1 notification center: notices live in this browser and are shown to
// everyone whose access matches the notice's audience. Phase 2 moves them to a
// Supabase table so they reach every device.

export type NotificationKind = "material" | "design" | "bom" | "info";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** App path to open when the notice is clicked. */
  link?: string;
  /** Who should see it: anyone holding one of these permissions (admins see all). */
  audience: Permission[];
  /** Same key = same event; a second notify() with it is ignored. */
  dedupeKey?: string;
  createdAt: number;
  readBy: string[];
};

type NotifyInput = Omit<AppNotification, "id" | "createdAt" | "readBy">;

type NotificationStore = {
  items: AppNotification[];
  notify: (input: NotifyInput) => void;
  markRead: (ids: string[], userId: string) => void;
  clearAll: () => void;
};

const KEEP = 200;

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      items: [],
      notify: (input) => {
        if (input.dedupeKey && get().items.some((n) => n.dedupeKey === input.dedupeKey)) return;
        const item: AppNotification = {
          ...input,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          readBy: [],
        };
        set({ items: [item, ...get().items].slice(0, KEEP) });
      },
      markRead: (ids, userId) =>
        set({
          items: get().items.map((n) =>
            ids.includes(n.id) && !n.readBy.includes(userId)
              ? { ...n, readBy: [...n.readBy, userId] }
              : n,
          ),
        }),
      clearAll: () => set({ items: [] }),
    }),
    { name: "electrosoft-notifications-v1", version: 1 },
  ),
);

export function visibleTo(user: AppUser | null, n: AppNotification): boolean {
  return !!user && (user.isAdmin || n.audience.some((p) => userCan(user, p)));
}

/** Fire-and-forget helper for event sites (uploads, saves). */
export function notify(input: NotifyInput) {
  useNotificationStore.getState().notify(input);
}
