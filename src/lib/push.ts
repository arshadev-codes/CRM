import { supabase as cloud } from "@/integrations/supabase/client";

// Web push for the phone app: ask once, then this phone gets a notification for every new
// row in "notifications" (sent by the push-send Edge Function).

const PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/* ---------- Android app (Firebase) ---------- */

// The Electrosoft Android app opens the site with "#app_install=<id>", a random id of that
// install. The app sends its Firebase token to the "app-device" function itself; the site
// only links the install to whoever signs in. Firebase works even while Chrome is asleep.
const APP_INSTALL = "electrosoft:app-install";

function readAppInstall() {
  try {
    return localStorage.getItem(APP_INSTALL);
  } catch {
    return null;
  }
}

function takeAppInstallFromUrl() {
  const match = window.location.hash.match(/app_install=([0-9a-f-]{36})/i);
  if (!match) return false;
  try {
    localStorage.setItem(APP_INSTALL, match[1]);
  } catch {
    /* storage unavailable */
  }
  history.replaceState(history.state, "", window.location.pathname + window.location.search);
  return true;
}

// Called once on page load: keep the id and take it out of the address bar. Reopening the app
// can reuse the page that is already open and only change the "#...", so watch for that too.
export function captureAppInstall() {
  if (typeof window === "undefined") return;
  takeAppInstallFromUrl();
  window.addEventListener("hashchange", () => {
    if (takeAppInstallFromUrl()) void claimAppInstall().catch(() => undefined);
  });
}

export function inAndroidApp() {
  return Boolean(readAppInstall());
}

// Links this phone's app to the signed-in person. Browser push is then switched off here,
// so the same notification doesn't arrive twice.
export async function claimAppInstall() {
  const install = readAppInstall();
  if (!install) return;
  const { error } = await cloud.rpc("claim_app_install", { p_install: install });
  if (!error) await removeBrowserPush();
}

export type PushState = "unsupported" | "needs-install" | "blocked" | "off" | "on";

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function registration() {
  if (!("serviceWorker" in navigator)) return null;
  return (
    (await navigator.serviceWorker.getRegistration("/")) ??
    navigator.serviceWorker.register("/sw.js")
  );
}

export async function pushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  if (inAndroidApp()) return "on";
  if (!PUBLIC_KEY) return "unsupported";
  // iPhones allow push only for apps added to the Home Screen.
  if (isIos() && !isInstalled()) return "needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
    return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

async function save(sub: PushSubscription) {
  const json = sub.toJSON();
  const { error } = await cloud.rpc("save_push_subscription", {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? "",
    p_auth: json.keys?.auth ?? "",
    p_agent: navigator.userAgent.slice(0, 200),
  });
  return !error;
}

export async function enablePush(): Promise<PushState> {
  if (!PUBLIC_KEY) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
  const reg = await registration();
  if (!reg) return "unsupported";
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(PUBLIC_KEY),
    }));
  return (await save(sub)) ? "on" : "off";
}

// After sign-in on a phone that already allowed notifications, link it to the new person.
export async function refreshPush() {
  if (inAndroidApp()) return claimAppInstall();
  if ((await pushState()) !== "on") return;
  const sub = await (await registration())?.pushManager.getSubscription();
  if (sub) await save(sub);
}

async function removeBrowserPush() {
  try {
    const sub = await (await registration())?.pushManager.getSubscription();
    if (!sub) return;
    await cloud.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  } catch {
    /* nothing to remove */
  }
}

// On sign-out this phone stops getting the person's notifications.
export async function disablePush() {
  const install = readAppInstall();
  if (install) await cloud.rpc("release_app_install", { p_install: install });
  await removeBrowserPush();
}
