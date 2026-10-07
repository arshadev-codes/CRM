// Sends one notification to every phone of its person (web push), called by the database
// right after the notification row is written. Secrets:
//   PUSH_SECRET        shared with the database (Vault "push_secret")
//   VAPID_PUBLIC_KEY   / VAPID_PRIVATE_KEY / VAPID_SUBJECT (mailto:...)
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply({ error: "POST only" }, 405);
  if (req.headers.get("x-push-secret") !== Deno.env.get("PUSH_SECRET"))
    return reply({ error: "Not allowed" }, 401);

  const { notification_id: id } = (await req.json().catch(() => ({}))) as {
    notification_id?: string;
  };
  if (!id) return reply({ error: "notification_id is required" }, 400);

  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  const { data: note } = await db.from("notifications").select("*").eq("id", id).maybeSingle();
  if (!note) return reply({ error: "Unknown notification" }, 404);
  const { data: devices } = await db
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", note.user_id);

  const payload = JSON.stringify({
    id: note.id,
    title: note.title,
    body: note.body,
    link: note.link,
  });
  let sent = 0;
  for (const device of devices ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
        payload,
        { TTL: 60 * 60 * 24, urgency: "high" },
      );
      sent++;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      // The phone unsubscribed or the app was removed: forget this device.
      if (status === 404 || status === 410)
        await db.from("push_subscriptions").delete().eq("id", device.id);
    }
  }
  return reply({ ok: true, sent });
});
