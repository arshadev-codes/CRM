import { LAST_ORDER_KEY } from "@/lib/stages";
import { useNotificationStore } from "@/store/notificationStore";
import { useProposalStore } from "@/store/proposalStore";

/*
 * Each browser keeps its own copy of quotations, orders and notifications. When the
 * database is emptied (moving to a new one, or clearing the test data before going live),
 * that copy must go too, or old entries show up again and can be saved back. This clears
 * it once per browser whenever EPOCH changes. Settings (companies, templates, employees)
 * are kept.
 */
const EPOCH_KEY = "es_data_epoch";
// Change the date part whenever the database is emptied again.
const EPOCH = `${import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "own-supabase"}:live-2026-10-17`;

export function freshStart() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(EPOCH_KEY) === EPOCH) return;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("electrosoft-demo:")) localStorage.removeItem(key);
    }
    localStorage.removeItem(LAST_ORDER_KEY);
    indexedDB.deleteDatabase("electrosoft-demo-files");
    useProposalStore.setState({ projects: [], inwardOrders: [], ratings: [] });
    useNotificationStore.setState({ items: [] });
    localStorage.setItem(EPOCH_KEY, EPOCH);
  } catch {
    /* storage blocked: nothing stored to clear */
  }
}
