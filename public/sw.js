/*
 * Service worker de FulBot: solo avisos al celular (Web Push).
 * No cachea nada: la app sigue funcionando igual que sin él.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "FulBot", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "FulBot";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/pwa/icon-192.png",
      badge: "/pwa/badge-96.png",
      tag: data.tag,
      renotify: Boolean(data.tag),
      lang: "es-AR",
      data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/abrir" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/abrir", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (existing) {
        try {
          const focused = await existing.focus();
          await focused.navigate(url);
          return;
        } catch {
          // Ventana que el service worker no controla: se abre una nueva.
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});

