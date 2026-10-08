// Sends one notification to every phone of its person (web push), called by the database
// right after the notification row is written. Secrets:
//   PUSH_SECRET        shared with the database (Vault "push_secret")
//   VAPID_PUBLIC_KEY   / VAPID_PRIVATE_KEY / VAPID_SUBJECT (mailto:...)
//   FCM_SERVICE_ACCOUNT  Firebase service account JSON, base64-encoded (for the Android app)
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

function base64url(bytes: Uint8Array | string) {
  const raw = typeof bytes === "string" ? bytes : String.fromCharCode(...bytes);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// A short-lived Google access token for FCM, signed with the service account's key.
async function fcmAccessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const pem = account.private_key.replace(/-----[^-]+-----|\s/g, "");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(`${header}.${claims}`),
    ),
  );
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${base64url(signature)}`,
    }),
  });
  if (!res.ok) throw new Error(`Google token: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

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
  const [{ data: devices }, { data: apps }] = await Promise.all([
    db.from("push_subscriptions").select("*").eq("user_id", note.user_id),
    db.from("device_tokens").select("*").eq("user_id", note.user_id),
  ]);

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

  // Phones with the Android app: straight to the app through Firebase.
  let appSent = 0;
  const errors: string[] = [];
  const accountJson = Deno.env.get("FCM_SERVICE_ACCOUNT");
  if (apps?.length && accountJson) {
    try {
      const account = JSON.parse(atob(accountJson)) as ServiceAccount;
      const accessToken = await fcmAccessToken(account);
      const link = note.link || "/my";
      for (const app of apps) {
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              message: {
                token: app.token,
                notification: { title: note.title, body: note.body },
                data: { id: note.id, link },
                android: {
                  priority: "HIGH",
                  ttl: "86400s",
                  notification: { channel_id: "work", tag: note.id, icon: "ic_notification_icon" },
                },
              },
            }),
          },
        );
        if (res.ok) {
          appSent++;
          continue;
        }
        const detail = await res.text();
        // The app was removed or its token replaced: forget this phone.
        if (res.status === 404 || detail.includes("UNREGISTERED"))
          await db.from("device_tokens").delete().eq("id", app.id);
        else errors.push(`${res.status} ${detail.slice(0, 200)}`);
      }
    } catch (error) {
      errors.push(String(error).slice(0, 300));
    }
  }
  return reply({ ok: true, sent, appSent, ...(errors.length ? { errors } : {}) });
});
