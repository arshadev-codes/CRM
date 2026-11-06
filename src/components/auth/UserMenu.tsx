import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldCheck, UsersRound } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore, useCurrentUser } from "@/store/authStore";
import { permissionLabel } from "@/lib/permissions";
import { initials } from "@/lib/initials";

export function UserMenu() {
  const user = useCurrentUser();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 neo-pop outline-none"
        aria-label="Account menu"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[11px] font-bold text-white">
          {initials(user.name)}
        </span>
        <span className="hidden max-w-[140px] truncate text-xs font-semibold text-slate-700 sm:inline">
          {user.name}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-1.5">
          <div className="text-sm font-semibold text-slate-800">{user.name}</div>
          <div className="text-xs font-normal text-slate-500">@{user.username}</div>
          <div className="flex flex-wrap gap-1 pt-1">
            {user.isAdmin ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                <ShieldCheck className="h-3 w-3" /> Admin · full access
              </span>
            ) : user.permissions.length === 0 ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                View only
              </span>
            ) : (
              user.permissions.map((p) => (
                <span key={p} className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                  {permissionLabel(p)}
                </span>
              ))
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin/users" className="cursor-pointer">
              <UsersRound className="h-4 w-4" /> Users &amp; access
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="cursor-pointer text-rose-600 focus:text-rose-600"
          onSelect={() => {
            void logout().then(() => navigate({ to: "/login" }));
          }}
        >
          <LogOut className="h-4 w-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
