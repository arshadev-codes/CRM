import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase as cloud } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { callFunction } from "@/lib/edgeFunction";
import type { Permission } from "@/lib/permissions";

/*
 * Staff sign-in.
 *
 * "cloud": Supabase Auth. Accounts work on every device and the admin manages them through
 *          the "admin-users" Edge Function. Used as soon as the profiles table exists.
 * "local": the older browser-only accounts, kept as a fallback until the cloud setup
 *          (migration 20261007120000_profiles_auth.sql) is applied.
 */

export type AppUser = {
  id: string;
  name: string;
  username: string;
  salt: string;
  passwordHash: string;
  employeeId?: string;
  isAdmin: boolean;
  permissions: Permission[];
  viewPermissions: string[];
  active: boolean;
  createdAt: string;
};

export type UserInput = {
  name: string;
  username: string;
  password?: string;
  employeeId?: string;
  isAdmin: boolean;
  permissions: Permission[];
  viewPermissions?: string[];
  active: boolean;
};

export type AuthMode = "checking" | "cloud" | "local";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

const SESSION_KEY = "es_session_user";
// "Keep me signed in" off: the cloud session ends when the browser is closed.
const NO_REMEMBER_KEY = "es_no_remember";
const ALIVE_KEY = "es_session_alive";
const EMAIL_DOMAIN = "staff.local";

// Default local admin: username "admin", password "electrosoft@2025".
const SEED_ADMIN: AppUser = {
  id: "admin",
  name: "Administrator",
  username: "admin",
  salt: "es-seed-admin",
  passwordHash: "f3a8326752bb326b4967d5af331f70b7e23a2a548999c5ac4a79b4bda938b3f7",
  isAdmin: true,
  permissions: [],
  viewPermissions: [],
  active: true,
  createdAt: "2026-10-06T00:00:00.000Z",
};

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

function readSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSession(userId: string | null, remember: boolean) {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    if (userId) (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, userId);
  } catch {
    /* storage blocked: session lasts until reload */
  }
}

function writeRemember(remember: boolean) {
  try {
    if (remember) localStorage.removeItem(NO_REMEMBER_KEY);
    else localStorage.setItem(NO_REMEMBER_KEY, "1");
    sessionStorage.setItem(ALIVE_KEY, "1");
  } catch {
    /* storage blocked */
  }
}

// True when the last sign-in asked not to be remembered and this is a new browser session.
function sessionExpired() {
  try {
    return localStorage.getItem(NO_REMEMBER_KEY) === "1" && !sessionStorage.getItem(ALIVE_KEY);
  } catch {
    return false;
  }
}

const normalise = (username: string) => username.trim().toLowerCase();

function fromProfile(row: ProfileRow): AppUser {
  return {
    id: row.id,
    name: row.name || row.username,
    username: row.username,
    salt: "",
    passwordHash: "",
    employeeId: row.employee_id ?? undefined,
    isAdmin: row.is_admin,
    permissions: row.permissions as Permission[],
    viewPermissions: row.view_permissions,
    active: row.active,
    createdAt: row.created_at,
  };
}

function toPayload(input: UserInput, id?: string) {
  return {
    id,
    name: input.name,
    username: input.username,
    password: input.password || undefined,
    employeeId: input.employeeId ?? null,
    isAdmin: input.isAdmin,
    permissions: input.permissions,
    viewPermissions: input.viewPermissions ?? [],
    active: input.active,
  };
}

type AuthStore = {
  mode: AuthMode;
  /** Cloud only: no account exists yet, so the login page offers first-time setup. */
  setupNeeded: boolean;
  /** Everyone an admin can manage (cloud: just yourself unless you are an admin). */
  users: AppUser[];
  /** Browser-only accounts, used in "local" mode. */
  localUsers: AppUser[];
  currentUserId: string | null;
  init: () => Promise<void>;
  login: (username: string, password: string, remember: boolean) => Promise<string | null>;
  setupFirstAdmin: (name: string, username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  addUser: (input: UserInput) => Promise<string | null>;
  updateUser: (id: string, input: UserInput) => Promise<string | null>;
  deleteUser: (id: string) => Promise<string | null>;
};

let started: Promise<void> | null = null;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => {
      // Local mode: rejects changes that would leave nobody able to manage users.
      const adminGuard = (users: AppUser[]) =>
        users.some((u) => u.isAdmin && u.active) ? null : "At least one active admin is needed.";

      const usernameTaken = (username: string, exceptId?: string) =>
        get().localUsers.some((u) => u.username === normalise(username) && u.id !== exceptId);

      const setLocal = (localUsers: AppUser[]) => set({ localUsers, users: localUsers });

      // Cloud: load the signed-in person's profile (and everyone's, for admins).
      async function loadSignedIn(userId: string): Promise<string | null> {
        const { data: me, error } = await cloud
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (error) return "Could not load your account. Check the internet and try again.";
        if (!me) {
          await cloud.auth.signOut();
          return "This login has no account. Ask your admin.";
        }
        if (!me.active) {
          await cloud.auth.signOut();
          return "This account is switched off. Ask your admin.";
        }
        const self = fromProfile(me);
        set({ currentUserId: self.id, users: [self] });
        if (self.isAdmin) await get().refreshUsers();
        return null;
      }

      async function manage(body: Record<string, unknown>) {
        const result = await callFunction<{ ok: boolean }>("admin-users", body);
        if (!result.ok) return result.error;
        await get().refreshUsers();
        return null;
      }

      return {
        mode: "checking",
        setupNeeded: false,
        users: [],
        localUsers: [SEED_ADMIN],
        currentUserId: null,

        init: () => {
          if (typeof window === "undefined") return Promise.resolve();
          started ??= (async () => {
            let setupNeeded: boolean | null = null;
            try {
              const { data, error } = await cloud.rpc("auth_setup_needed");
              if (!error && typeof data === "boolean") setupNeeded = data;
            } catch {
              /* cloud unreachable */
            }
            if (setupNeeded === null) {
              set({ mode: "local", users: get().localUsers, currentUserId: readSession() });
              return;
            }
            if (sessionExpired()) await cloud.auth.signOut().catch(() => undefined);
            const { data } = await cloud.auth.getSession();
            if (data.session) await loadSignedIn(data.session.user.id);
            set({ mode: "cloud", setupNeeded });
            cloud.auth.onAuthStateChange((event) => {
              if (event === "SIGNED_OUT") set({ currentUserId: null, users: [] });
            });
          })();
          return started;
        },

        login: async (username, password, remember) => {
          if (get().mode === "cloud") {
            const { data, error } = await cloud.auth.signInWithPassword({
              email: `${normalise(username)}@${EMAIL_DOMAIN}`,
              password,
            });
            if (error || !data.user) {
              return error?.message.toLowerCase().includes("banned")
                ? "This account is switched off. Ask your admin."
                : "Wrong username or password.";
            }
            writeRemember(remember);
            return loadSignedIn(data.user.id);
          }
          const user = get().localUsers.find((u) => u.username === normalise(username));
          if (!user || (await sha256(user.salt + ":" + password)) !== user.passwordHash) {
            return "Wrong username or password.";
          }
          if (!user.active) return "This account is switched off. Ask your admin.";
          writeSession(user.id, remember);
          set({ currentUserId: user.id });
          return null;
        },

        setupFirstAdmin: async (name, username, password) => {
          const result = await callFunction<{ ok: boolean }>("admin-users", {
            action: "bootstrap",
            user: { name, username, password },
          });
          if (!result.ok) return result.error;
          set({ setupNeeded: false });
          return get().login(username, password, true);
        },

        logout: async () => {
          if (get().mode === "cloud") await cloud.auth.signOut().catch(() => undefined);
          writeSession(null, false);
          set({ currentUserId: null, users: get().mode === "local" ? get().localUsers : [] });
        },

        refreshUsers: async () => {
          if (get().mode === "local") return;
          const { data } = await cloud.from("profiles").select("*").order("name");
          if (data) set({ users: data.map(fromProfile) });
        },

        addUser: async (input) => {
          if (get().mode === "cloud") return manage({ action: "create", user: toPayload(input) });
          if (!input.username.trim()) return "Username is required.";
          if (usernameTaken(input.username)) return "That username is already used.";
          if (!input.password || input.password.length < 6) {
            return "Password needs at least 6 characters.";
          }
          const salt = crypto.randomUUID();
          const user: AppUser = {
            id: crypto.randomUUID(),
            name: input.name.trim() || input.username.trim(),
            username: normalise(input.username),
            salt,
            passwordHash: await sha256(salt + ":" + input.password),
            employeeId: input.employeeId,
            isAdmin: input.isAdmin,
            permissions: input.permissions,
            viewPermissions: input.viewPermissions ?? [],
            active: input.active,
            createdAt: new Date().toISOString(),
          };
          setLocal([...get().localUsers, user]);
          return null;
        },

        updateUser: async (id, input) => {
          if (get().mode === "cloud")
            return manage({ action: "update", user: toPayload(input, id) });
          if (!input.username.trim()) return "Username is required.";
          if (usernameTaken(input.username, id)) return "That username is already used.";
          if (input.password && input.password.length < 6) {
            return "Password needs at least 6 characters.";
          }
          if (id === get().currentUserId && !input.active) {
            return "You can't switch off your own account.";
          }
          let passwordFields = {};
          if (input.password) {
            const salt = crypto.randomUUID();
            passwordFields = { salt, passwordHash: await sha256(salt + ":" + input.password) };
          }
          const users = get().localUsers.map((u) =>
            u.id === id
              ? {
                  ...u,
                  ...passwordFields,
                  name: input.name.trim() || input.username.trim(),
                  username: normalise(input.username),
                  employeeId: input.employeeId,
                  isAdmin: input.isAdmin,
                  permissions: input.permissions,
                  viewPermissions: input.viewPermissions ?? u.viewPermissions ?? [],
                  active: input.active,
                }
              : u,
          );
          const blocked = adminGuard(users);
          if (blocked) return blocked;
          setLocal(users);
          return null;
        },

        deleteUser: async (id) => {
          if (id === get().currentUserId) return "You can't delete your own account.";
          if (get().mode === "cloud") return manage({ action: "delete", id });
          const users = get().localUsers.filter((u) => u.id !== id);
          const blocked = adminGuard(users);
          if (blocked) return blocked;
          setLocal(users);
          return null;
        },
      };
    },
    {
      name: "electrosoft-auth-v1",
      version: 2,
      partialize: (s) => ({ localUsers: s.localUsers }),
      // Version 1 kept the browser accounts under "users".
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as { users?: AppUser[]; localUsers?: AppUser[] };
        const list = version < 2 ? state.users : state.localUsers;
        return {
          localUsers: (list ?? [SEED_ADMIN]).map((u) => ({
            ...u,
            viewPermissions: u.viewPermissions ?? [],
          })),
        };
      },
    },
  ),
);

function activeUser(s: Pick<AuthStore, "users" | "currentUserId">): AppUser | null {
  const user = s.users.find((u) => u.id === s.currentUserId);
  return user && user.active ? user : null;
}

export function useCurrentUser(): AppUser | null {
  return useAuthStore(activeUser);
}

export function useAuthMode(): AuthMode {
  return useAuthStore((s) => s.mode);
}

export function userCan(user: AppUser | null, perm: Permission): boolean {
  return !!user && (user.isAdmin || user.permissions.includes(perm));
}

export function useCan(perm: Permission): boolean {
  return userCan(useCurrentUser(), perm);
}

export function useIsAdmin(): boolean {
  return useCurrentUser()?.isAdmin ?? false;
}

/** Current user, read outside React (event handlers, plain functions). */
export function getCurrentUser(): AppUser | null {
  return activeUser(useAuthStore.getState());
}
