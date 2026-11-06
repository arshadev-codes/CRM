import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  KeyRound, Lock, Pencil, Plus, Search, ShieldCheck, Trash2, UserCheck, UserX, UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatTile } from "@/components/StatTile";
import { initials } from "@/lib/initials";
import {
  useAuthMode, useAuthStore, useCurrentUser, type AppUser, type UserInput,
} from "@/store/authStore";
import { useProposalStore } from "@/store/proposalStore";
import {
  PERMISSION_GROUPS, permissionLabel, VIEW_PERMISSIONS, viewLabel, type Permission,
} from "@/lib/permissions";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users & access — Electrosoft Proposal Engine" }] }),
  component: UsersPage,
});

const EMPTY: UserInput = {
  name: "",
  username: "",
  password: "",
  isAdmin: false,
  permissions: [],
  viewPermissions: ["view_all"],
  active: true,
};

function UsersPage() {
  const me = useCurrentUser();
  const users = useAuthStore((s) => s.users);
  const deleteUser = useAuthStore((s) => s.deleteUser);
  const updateUser = useAuthStore((s) => s.updateUser);
  const mode = useAuthMode();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AppUser | "new" | null>(null);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users
      .filter((u) => !needle || u.name.toLowerCase().includes(needle) || u.username.includes(needle))
      .sort((a, b) => Number(b.isAdmin) - Number(a.isAdmin) || a.name.localeCompare(b.name));
  }, [users, query]);

  if (!me?.isAdmin) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-6">
        <div className="neo-surface max-w-sm rounded-3xl p-10 text-center">
          <Lock className="mx-auto h-10 w-10 text-slate-400" />
          <h1 className="mt-4 text-lg font-bold text-slate-800">Admins only</h1>
          <p className="mt-1 text-sm text-slate-500">Only an admin can manage users and access.</p>
          <Link to="/" className="mt-6 inline-block text-sm font-semibold text-indigo-600">Go home</Link>
        </div>
      </div>
    );
  }

  const seedPasswordInUse =
    mode === "local" && users.some((u) => u.id === "admin" && u.salt === "es-seed-admin");

  async function toggleActive(u: AppUser) {
    const err = await updateUser(u.id, { ...u, password: undefined, active: !u.active });
    if (err) toast.error(err);
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Users &amp; access</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tick what each person can see and change. Field staff (no "All orders") see only
            their own orders, panels and tasks, in the phone app.
          </p>
        </div>
        <Button onClick={() => setEditing("new")} className="rounded-xl">
          <Plus className="h-4 w-4" /> Add user
        </Button>
      </div>

      {mode === "local" && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <Lock className="h-4 w-4 shrink-0" />
          These logins are saved only in this browser, so they won't work on other phones or
          computers. They move to the cloud once cloud login is set up.
        </div>
      )}

      {seedPasswordInUse && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <KeyRound className="h-4 w-4 shrink-0" />
          The admin account still uses the default password. Edit it and set a new one.
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={UsersRound} label="Users" value={users.length} tone="text-indigo-600 bg-indigo-50" />
        <StatTile icon={ShieldCheck} label="Admins" value={users.filter((u) => u.isAdmin).length} tone="text-violet-600 bg-violet-50" />
        <StatTile icon={UserCheck} label="Active" value={users.filter((u) => u.active).length} tone="text-emerald-600 bg-emerald-50" />
        <StatTile icon={UserX} label="Switched off" value={users.filter((u) => !u.active).length} tone="text-slate-600 bg-slate-100" />
      </div>

      <div className="mb-5 neo-inset flex items-center gap-2 px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          data-no-neo
          className="w-full bg-transparent text-sm outline-none"
          placeholder="Search name or username"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((u) => (
          <div key={u.id} className={`neo-surface relative overflow-hidden rounded-2xl p-5 ${u.active ? "" : "opacity-60"}`}>
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${u.isAdmin ? "from-violet-500 to-indigo-500" : "from-sky-400 to-indigo-400"}`} />
            <div className="flex items-start gap-3">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${u.isAdmin ? "from-violet-500 to-indigo-600" : "from-sky-500 to-indigo-500"}`}>
                {initials(u.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-slate-800">
                  {u.name} {u.id === me.id && <span className="text-xs font-normal text-slate-400">(you)</span>}
                </div>
                <div className="truncate text-xs text-slate-500">@{u.username}</div>
              </div>
              <Switch
                checked={u.active}
                onCheckedChange={() => toggleActive(u)}
                aria-label={u.active ? "Switch off account" : "Switch on account"}
              />
            </div>

            <div className="mt-4 flex min-h-[3.25rem] flex-wrap content-start gap-1.5">
              {u.isAdmin ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                  <ShieldCheck className="h-3 w-3" /> Admin · full access
                </span>
              ) : (
                <>
                  {!u.viewPermissions.includes("view_all") && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                      Field · own work only
                    </span>
                  )}
                  {u.viewPermissions
                    .filter((v) => v !== "view_all")
                    .map((v) => (
                      <span key={v} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Sees {viewLabel(v).toLowerCase()}
                      </span>
                    ))}
                  {u.permissions.length === 0 ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">View only</span>
                  ) : (
                    u.permissions.map((p) => (
                      <span key={p} className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                        {permissionLabel(p)}
                      </span>
                    ))
                  )}
                </>
              )}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setEditing(u)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              {u.id !== me.id && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={async () => {
                    if (!confirm(`Delete ${u.name}? They won't be able to sign in.`)) return;
                    const err = await deleteUser(u.id);
                    if (err) toast.error(err);
                    else toast.success(`${u.name} deleted`);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <UserDialog user={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function UserDialog({ user, onClose }: { user: AppUser | null; onClose: () => void }) {
  const addUser = useAuthStore((s) => s.addUser);
  const updateUser = useAuthStore((s) => s.updateUser);
  const employees = useProposalStore((s) => s.employees);
  const [form, setForm] = useState<UserInput>(
    user
      ? { name: user.name, username: user.username, password: "", employeeId: user.employeeId, isAdmin: user.isAdmin, permissions: user.permissions, viewPermissions: user.viewPermissions, active: user.active }
      : EMPTY,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<UserInput>) => setForm((f) => ({ ...f, ...patch }));
  const toggle = (p: Permission, on: boolean) =>
    set({ permissions: on ? [...form.permissions, p] : form.permissions.filter((x) => x !== p) });
  const views = form.viewPermissions ?? [];
  const toggleView = (v: string, on: boolean) =>
    set({ viewPermissions: on ? [...views, v] : views.filter((x) => x !== v) });

  async function save() {
    setSaving(true);
    const input = { ...form, password: form.password || undefined };
    const err = user ? await updateUser(user.id, input) : await addUser(input);
    setSaving(false);
    if (err) return setError(err);
    toast.success(user ? "User updated" : "User added");
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{user ? `Edit ${user.name}` : "Add user"}</DialogTitle>
          <DialogDescription>Give them a username and password, then tick what they can change.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="u-name">Name</Label>
            <Input
              id="u-name"
              list="u-employees"
              value={form.name}
              placeholder="Pick an employee or type a name"
              onChange={(e) => {
                const match = employees.find((emp) => emp.name === e.target.value);
                set({ name: e.target.value, employeeId: match?.id });
              }}
            />
            <datalist id="u-employees">
              {employees.map((e) => <option key={e.id} value={e.name} />)}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-username">Username</Label>
            <Input id="u-username" autoComplete="off" value={form.username} onChange={(e) => set({ username: e.target.value })} placeholder="e.g. rahul" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-password">{user ? "New password" : "Password"}</Label>
            <Input
              id="u-password"
              type="text"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => set({ password: e.target.value })}
              placeholder={user ? "Leave empty to keep" : "At least 6 characters"}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-violet-50/70 px-4 py-3">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-violet-800">
              <ShieldCheck className="h-4 w-4" /> Admin
            </div>
            <div className="text-xs text-violet-700/80">Can change everything and manage users.</div>
          </div>
          <Switch checked={form.isAdmin} onCheckedChange={(v) => set({ isAdmin: v })} />
        </div>

        {!form.isAdmin && (
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Can see</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {VIEW_PERMISSIONS.map((item) => {
                const on = views.includes(item.key);
                return (
                  <label
                    key={item.key}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${on ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-slate-50/70 hover:bg-slate-100/70"}`}
                  >
                    <Checkbox checked={on} onCheckedChange={(v) => toggleView(item.key, v === true)} className="mt-0.5" />
                    <span>
                      <span className="block text-sm font-medium text-slate-800">{item.label}</span>
                      <span className="block text-xs text-slate-500">{item.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {!form.isAdmin && (
          <div className="space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Can change</div>
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.title}>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.title}</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.items.map((item) => {
                    const on = form.permissions.includes(item.key);
                    return (
                      <label
                        key={item.key}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${on ? "bg-sky-50 ring-1 ring-sky-200" : "bg-slate-50/70 hover:bg-slate-100/70"}`}
                      >
                        <Checkbox checked={on} onCheckedChange={(v) => toggle(item.key, v === true)} className="mt-0.5" />
                        <span>
                          <span className="block text-sm font-medium text-slate-800">{item.label}</span>
                          <span className="block text-xs text-slate-500">{item.hint}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <Switch checked={form.active} onCheckedChange={(v) => set({ active: v })} /> Account is on (can sign in)
        </label>

        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{user ? "Save changes" : "Add user"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
