// The Android app sends its Firebase token here, keyed by its random install id. The person
// signed in on that phone claims the install from the site (claim_app_install), so push-send
// knows whose notifications go to this token.
import { createClient } from "npm:@supabase/supabase-js@2";

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply({ error: "POST only" }, 405);
  const { install_id: install, token } = (await req.json().catch(() => ({}))) as {
    install_id?: string;
    token?: string;
  };
  if (!install || !UUID.test(install)) return reply({ error: "install_id is required" }, 400);
  if (!token || token.length > 4096) return reply({ error: "token is required" }, 400);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  // A token belongs to one install; drop it from any older row first.
  await db.from("device_tokens").delete().eq("token", token).neq("install_id", install);
  const { error } = await db
    .from("device_tokens")
    .upsert(
      { install_id: install, token, platform: "android", updated_at: new Date().toISOString() },
      { onConflict: "install_id" },
    );
  if (error) return reply({ error: "Could not save" }, 500);
  return reply({ ok: true });
});
