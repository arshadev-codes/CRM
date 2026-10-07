import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

// Top bar of the phone app: logo (or back) on the brand gradient.
export function AppHeader({
  title,
  subtitle,
  back,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
}) {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-20 bg-gradient-to-br from-indigo-600 to-violet-600 px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] text-white shadow-lg shadow-indigo-600/20">
      <div className="flex items-center gap-3">
        {back ? (
          <Link
            to="/my"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/15"
            aria-label="Back"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
          </Link>
        ) : (
          <img src="/icons/logo-white.png" alt="Electrosoft" className="h-8 w-auto" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-bold leading-tight">{title}</div>
          {subtitle && <div className="truncate text-xs text-white/75">{subtitle}</div>}
        </div>
        {!back && (
          <button
            type="button"
            onClick={() => void logout().then(() => navigate({ to: "/login" }))}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/15"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
}
