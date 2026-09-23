/* Adaland service worker.
 * Sadece iki is yapar: (1) "Paylas -> Adaland" ile gelen dosyalari yakalar,
 * (2) push bildirimlerini gosterir. Sayfa onbellegi YOK: eski surum takili kalmasin.
 */
const SHARE_CACHE = "adaland-share";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Android'de galeriden "Paylas" ile gelen POST'u yakala, dosyalari Cache'e koy, sayfaya yonlendir.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "POST" && url.pathname === "/paylas-al") {
    event.respondWith(
      (async () => {
        try {
          const form = await event.request.formData();
          const files = form.getAll("media").filter((f) => f && typeof f === "object" && "size" in f);
          const cache = await caches.open(SHARE_CACHE);
          const keys = await cache.keys();
          await Promise.all(keys.map((k) => cache.delete(k)));
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            await cache.put(
              new Request(`/__share/${i}`),
              new Response(f, {
                headers: {
                  "Content-Type": f.type || "application/octet-stream",
                  "X-File-Name": encodeURIComponent(f.name || `dosya-${i}`),
                  "X-Last-Modified": String(f.lastModified || Date.now()),
                },
              }),
            );
          }
          return Response.redirect(`/paylas-al?n=${files.length}`, 303);
        } catch {
          return Response.redirect("/paylas-al?n=0", 303);
        }
      })(),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "Hatırlatma", body: "Bugün ne dedi? Bir söz eklemeye ne dersin?", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url },
      tag: "adaland-reminder",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) { c.navigate(url); return c.focus(); }
      }
      return self.clients.openWindow(url);
    }),
  );
});
