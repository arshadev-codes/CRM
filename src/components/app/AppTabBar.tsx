import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarCheck, ClipboardList, TrendingUp } from "lucide-react";

const TABS = [
  { to: "/my", label: "My Work", icon: ClipboardList },
  { to: "/my/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/my/performance", label: "Performance", icon: TrendingUp },
] as const;

// Bottom navigation of the phone app. Pages that show it need bottom padding (pb-24).
export function AppTabBar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname.replace(/\/$/, "") });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto grid max-w-xl grid-cols-3">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${active ? "text-indigo-600" : "text-slate-500"}`}
            >
              <span
                className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${active ? "bg-indigo-100" : ""}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
