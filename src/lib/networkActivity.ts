import { useSyncExternalStore } from "react";

// Counts database changes (saves, deletes, uploads) that are on their way, so
// the app can show "Working…" while one takes a moment. Reads are not counted,
// and neither is the quotation autosave (the wizard shows its own status).

let inFlight = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export function trackRequest<T>(p: Promise<T>): Promise<T> {
  inFlight++;
  emit();
  return p.finally(() => {
    inFlight = Math.max(0, inFlight - 1);
    emit();
  });
}

/** True for requests that change data and should show the activity indicator. */
export function isTrackedRequest(method: string, url: string): boolean {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return false;
  // Quotation autosave (upsert) runs in the background on every edit.
  if (url.includes("/rest/v1/projects") && m !== "DELETE") return false;
  // Sign-in token refreshes and push registrations aren't user actions.
  if (url.includes("/auth/v1/token") || url.includes("push_subscriptions")) return false;
  return true;
}

export function useBusy(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => inFlight > 0,
    () => false,
  );
}
