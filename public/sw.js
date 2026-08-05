const CACHE = "haccora-shell-v1";
const SHELL = ["/", "/manifest.webmanifest", "/favicon.ico", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/functions/") ||
    url.pathname.startsWith("/auth/")
  )
    return;

  const sensitiveRoute =
    url.pathname.startsWith("/app") ||
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/onboarding");
  if (sensitiveRoute) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && !response.headers.get("cache-control")?.includes("no-store")) {
            caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match("/"))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok && ["style", "script", "image", "font"].includes(request.destination)) {
            caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        }),
    ),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() };
  }
  const data = payload.data ?? {};
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Haccora", {
      body: payload.body ?? "A food-safety record needs attention.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data,
      tag: data.idempotencyKey ?? data.route ?? "haccora-alert",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const route = event.notification.data?.route ?? "/app/alerts";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing) {
        existing.navigate(route);
        return existing.focus();
      }
      return self.clients.openWindow(route);
    }),
  );
});
