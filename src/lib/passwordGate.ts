import { toast } from "sonner";
import { getCurrentUser, userCan } from "@/store/authStore";
import type { Permission } from "@/lib/permissions";

// Privileged actions check the signed-in user instead of asking for a
// shared password. Pass a permission to also allow non-admins who hold it.
export function requireAdminPassword(perm?: Permission): boolean {
  const user = getCurrentUser();
  if (user?.isAdmin || (perm && userCan(user, perm))) return true;
  toast.error(perm ? "Your account doesn't have access to this." : "Only an admin can do this.");
  return false;
}
