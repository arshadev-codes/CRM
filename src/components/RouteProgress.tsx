import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

// Thin bar along the top while a page is loading. Shown only if loading takes
// longer than a moment, so quick navigations don't flash it.
export function RouteProgress() {
  const pending = useRouterState({ select: (r) => r.status === "pending" || r.isLoading });
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!pending) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(timer);
  }, [pending]);
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {visible && (
        <div className="es-route-bar h-full w-full bg-gradient-to-r from-indigo-500 via-sky-400 to-violet-500" />
      )}
    </div>
  );
}
