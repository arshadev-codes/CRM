// Makes the site installable as an app. Pages always come from the network (data must be
// fresh); only the app icons are kept for offline use.
const CACHE = "electrosoft-shell-v2";
const SHELL = ["/icons/icon-192.png", "/icons/icon-512.png", "/icons/logo-white.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));
  }
});

// A notification from the server: show it with the app logo.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Electrosoft", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Electrosoft", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/favicon-48.png",
      tag: data.id,
      data: { link: data.link || "/my" },
    }),
  );
});

// Tapping it opens the app on the right order (reusing an open window if there is one).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/my";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ("focus" in client) {
          client.navigate(link).catch(() => undefined);
          return client.focus();
        }
      }
      return self.clients.openWindow(link);
    }),
  );
});
