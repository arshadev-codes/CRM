import { useNotificationStore } from "@/store/notificationStore";
import { useProposalStore } from "@/store/proposalStore";

/*
 * The app moved to a new, empty database. Browsers that used the old one still hold its
 * test data (quotations, orders, demo-mode tables and files, notifications). This clears
 * it once per browser so everyone starts from zero. Settings (companies, templates,
 * employees) are kept.
 */
const EPOCH_KEY = "es_data_epoch";
const EPOCH = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "own-supabase";

export function freshStart() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(EPOCH_KEY) === EPOCH) return;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("electrosoft-demo:")) localStorage.removeItem(key);
    }
    indexedDB.deleteDatabase("electrosoft-demo-files");
    useProposalStore.setState({ projects: [], inwardOrders: [], ratings: [] });
    useNotificationStore.setState({ items: [] });
    localStorage.setItem(EPOCH_KEY, EPOCH);
  } catch {
    /* storage blocked: nothing stored to clear */
  }
}
