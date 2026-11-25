import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useBusy } from "@/lib/networkActivity";

/** Shown after this long, so quick saves don't flash it. */
const SHOW_AFTER_MS = 300;

/**
 * App-wide "Working…" indicator: a bar at the top of the window and a small
 * label at the bottom while a save, delete or upload is on its way to the
 * database (see src/lib/networkActivity.ts). Tells the user the click was
 * taken, so they don't press the button again.
 */
export function BusyIndicator() {
  const busy = useBusy();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!busy) { setVisible(false); return; }
    const t = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [busy]);
  if (!visible) return null;
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-indigo-100" role="progressbar" aria-label="Working">
        <div className="h-full w-1/3 animate-[busybar_1.1s_ease-in-out_infinite] bg-indigo-500" />
      </div>
      <div className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-2 text-xs font-medium text-white shadow-lg" role="status">
        <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Working… please wait</span>
      </div>
      <style>{`@keyframes busybar { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
    </>
  );
}
