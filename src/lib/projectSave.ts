import { create } from "zustand";

/**
 * Saving quotations to the cloud.
 *
 * Every change to a quotation used to send the whole quotation straight away,
 * several times a second while typing. Those uploads could finish in any order,
 * so an older copy could land last and overwrite newer work, and a failed
 * upload was only written to the browser console.
 *
 * Now each quotation has one queue:
 *   - changes are collected for a moment and only the newest copy is sent
 *   - only one upload per quotation runs at a time, so an older copy never
 *     lands after a newer one
 *   - a failed upload is retried until it works
 *   - useSaveStatus tells the screen what is happening ("Saving…", "Saved",
 *     "Not saved")
 */

export type SaveState = "pending" | "saving" | "saved" | "error";
export interface SaveStatus {
  state: SaveState;
  /** When the last successful save finished. */
  at?: number;
  error?: string;
}

export const useSaveStatus = create<{ byId: Record<string, SaveStatus> }>(() => ({ byId: {} }));

const setStatus = (id: string, patch: SaveStatus) =>
  useSaveStatus.setState((s) => ({ byId: { ...s.byId, [id]: { ...s.byId[id], ...patch } } }));

const DEBOUNCE_MS = 800;
const RETRY_MS = 5000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createSaveQueue<T extends { id: string }>(push: (item: T) => Promise<void>) {
  const latest = new Map<string, T>(); // newest copy not sent yet
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const busy = new Set<string>(); // an upload is running

  const clearTimer = (id: string) => {
    clearTimeout(timers.get(id));
    timers.delete(id);
  };
  const schedule = (id: string, ms: number) => {
    clearTimer(id);
    timers.set(id, setTimeout(() => void send(id), ms));
  };

  async function send(id: string): Promise<void> {
    clearTimer(id);
    if (busy.has(id)) return; // the running upload sends the newest copy when it ends
    const item = latest.get(id);
    if (!item) return;
    latest.delete(id);
    busy.add(id);
    setStatus(id, { state: "saving" });
    try {
      await push(item);
      busy.delete(id);
      if (latest.has(id)) void send(id);
      else setStatus(id, { state: "saved", at: Date.now(), error: undefined });
    } catch (e) {
      busy.delete(id);
      if (!latest.has(id)) latest.set(id, item); // retry this copy unless a newer one is waiting
      setStatus(id, { state: "error", error: e instanceof Error ? e.message : String(e) });
      schedule(id, RETRY_MS);
    }
  }

  return {
    /** Save this copy soon (after `delay` ms, default 0.8 s). */
    queue(item: T, delay = DEBOUNCE_MS) {
      latest.set(item.id, item);
      if (!busy.has(item.id)) setStatus(item.id, { state: "pending" });
      schedule(item.id, delay);
    },
    /** Save now and wait for it. Resolves false when the save failed. */
    async flush(id: string): Promise<boolean> {
      for (let i = 0; i < 200; i++) {
        if (busy.has(id)) {
          await sleep(100);
          continue;
        }
        if (!latest.has(id)) break;
        await send(id);
        if (useSaveStatus.getState().byId[id]?.state === "error") return false;
      }
      return useSaveStatus.getState().byId[id]?.state !== "error";
    },
    /** Forget a deleted quotation. */
    cancel(id: string) {
      clearTimer(id);
      latest.delete(id);
    },
    /** Changes not saved to the cloud yet (for the "leave page?" warning). */
    hasUnsaved: () => latest.size > 0 || busy.size > 0,
  };
}
