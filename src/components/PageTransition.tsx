import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

// A quick CSS fade on each new page. The new page shows at once; nothing waits for the
// old one to animate out, and no blur filter is animated over the whole page.
export function PageTransition({ children }: { children: ReactNode }) {
  const key = useRouterState({ select: (r) => r.location.pathname });
  return (
    <div key={key} className="es-page-in min-h-full">
      {children}
    </div>
  );
}
