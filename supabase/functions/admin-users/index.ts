// Creates, edits and removes staff logins. Only an active admin may call it, except for
// "bootstrap", which makes the very first admin while no profile exists yet.
// Staff sign in with a username; Supabase Auth stores it as <username>@staff.local.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMAIL_DOMAIN = "staff.local";
// Switched-off accounts are banned for ~100 years, which also stops token refresh.
const OFF = "876000h";

type UserInput = {
  id?: string;
  name?: string;
  username?: string;
  password?: string;
  employeeId?: string | null;
  isAdmin?: boolean;
  permissions?: string[];
  viewPermissions?: string[];
  active?: boolean;
};

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
const fail = (error: string, status = 400) => reply({ error }, status);

const normalise = (username: string) => username.trim().toLowerCase();
const emailFor = (username: string) => `${normalise(username)}@${EMAIL_DOMAIN}`;
const strings = (value: unknown) =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

function checkUsername(username: string | undefined) {
  if (!username?.trim()) return "Username is required.";
  if (!/^[a-z0-9._-]{2,32}$/.test(normalise(username)))
    return "Username can use letters, numbers, dot, dash and underscore (2 to 32 characters).";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("POST only", 405);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  let body: { action?: string; user?: UserInput; id?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Bad request");
  }
  const input = body.user ?? {};

  function profileRow(id: string, user: UserInput) {
    return {
      id,
      username: normalise(user.username!),
      name: user.name?.trim() || user.username!.trim(),
      employee_id: user.employeeId || null,
      is_admin: Boolean(user.isAdmin),
      permissions: strings(user.permissions),
      view_permissions: strings(user.viewPermissions),
      active: user.active !== false,
    };
  }

  // The admin keeps a readable copy of every password (see the password_register migration).
  async function rememberPassword(id: string, username: string, password: string) {
    const { error } = await db.from("password_register").upsert(
      { user_id: id, username: normalise(username), password, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    if (error) console.warn("password register:", error.message);
  }

  async function createLogin(user: UserInput) {
    const bad = checkUsername(user.username);
    if (bad) return fail(bad);
    if (!user.password || user.password.length < 6)
      return fail("Password needs at least 6 characters.");
    const { data: taken } = await db
      .from("profiles")
      .select("id")
      .eq("username", normalise(user.username!))
      .maybeSingle();
    if (taken) return fail("That username is already used.");

    const { data: created, error } = await db.auth.admin.createUser({
      email: emailFor(user.username!),
      password: user.password,
      email_confirm: true,
      ban_duration: user.active === false ? OFF : "none",
    });
    if (error || !created.user) return fail(error?.message ?? "Could not create the login.", 500);
    const { error: rowError } = await db.from("profiles").insert(profileRow(created.user.id, user));
    if (rowError) {
      await db.auth.admin.deleteUser(created.user.id);
      return fail(rowError.message, 500);
    }
    await rememberPassword(created.user.id, user.username!, user.password);
    return reply({ ok: true, id: created.user.id });
  }

  // First admin: allowed only while nobody has an account yet.
  if (body.action === "bootstrap") {
    const { count } = await db.from("profiles").select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) return fail("Setup is already done. Sign in instead.", 403);
    return createLogin({ ...input, isAdmin: true, active: true });
  }

  // Everything else needs a signed-in, active admin.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: caller } = token ? await db.auth.getUser(token) : { data: { user: null } };
  if (!caller?.user) return fail("Please sign in again.", 401);
  const { data: me } = await db.from("profiles").select("*").eq("id", caller.user.id).maybeSingle();
  if (!me?.active || !me.is_admin) return fail("Only an admin can manage users.", 403);

  // Rejects changes that would leave nobody able to manage users.
  async function keepsAnAdmin(changedId: string, stillAdmin: boolean) {
    if (stillAdmin) return true;
    const { count } = await db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_admin", true)
      .eq("active", true)
      .neq("id", changedId);
    return (count ?? 0) > 0;
  }

  if (body.action === "create") return createLogin(input);

  if (body.action === "update") {
    const id = input.id;
    if (!id) return fail("Missing user id.");
    const bad = checkUsername(input.username);
    if (bad) return fail(bad);
    if (input.password && input.password.length < 6)
      return fail("Password needs at least 6 characters.");
    if (id === me.id && input.active === false)
      return fail("You can't switch off your own account.");
    const { data: clash } = await db
      .from("profiles")
      .select("id")
      .eq("username", normalise(input.username!))
      .neq("id", id)
      .maybeSingle();
    if (clash) return fail("That username is already used.");
    if (!(await keepsAnAdmin(id, Boolean(input.isAdmin) && input.active !== false)))
      return fail("At least one active admin is needed.");

    const { error } = await db.auth.admin.updateUserById(id, {
      email: emailFor(input.username!),
      email_confirm: true,
      ban_duration: input.active === false ? OFF : "none",
      ...(input.password ? { password: input.password } : {}),
    });
    if (error) return fail(error.message, 500);
    const row = profileRow(id, input);
    const { error: rowError } = await db.from("profiles").update(row).eq("id", id);
    if (rowError) return fail(rowError.message, 500);
    if (input.password) await rememberPassword(id, input.username!, input.password);
    else await db.from("password_register").update({ username: row.username }).eq("user_id", id);
    return reply({ ok: true });
  }

  if (body.action === "delete") {
    const id = body.id;
    if (!id) return fail("Missing user id.");
    if (id === me.id) return fail("You can't delete your own account.");
    if (!(await keepsAnAdmin(id, false))) return fail("At least one active admin is needed.");
    const { error } = await db.auth.admin.deleteUser(id);
    if (error) return fail(error.message, 500);
    return reply({ ok: true });
  }

  return fail("Unknown action");
});
