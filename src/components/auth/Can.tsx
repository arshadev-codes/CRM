import type { ReactNode } from "react";
import { Eye } from "lucide-react";
import { useCan } from "@/store/authStore";
import type { Permission } from "@/lib/permissions";

/** Renders its children only when the signed-in user has `perm`. */
export function Can({
  perm,
  children,
  fallback = null,
}: {
  perm: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return useCan(perm) ? <>{children}</> : <>{fallback}</>;
}

/** Small "View only" chip, shown where the user can look but not change. */
export function ViewOnlyBadge({ perm }: { perm: Permission }) {
  if (useCan(perm)) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
      title="You can see this, but your account can't change it. Ask your admin for access."
    >
      <Eye className="h-3 w-3" /> View only
    </span>
  );
}
