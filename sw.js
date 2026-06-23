/* LernPilot Service Worker
   Zweck:
   - Erfüllt die Installations-Voraussetzung von Chrome/Edge (PWA).
   - App-Shell offline verfügbar (App startet auch ohne Netz).
   Bewusst minimal gehalten: Supabase, esm.sh und /api/* werden NICHT
   abgefangen, damit Auth, KI-Funktion und Daten immer live laufen. */
const CACHE = "lernpilot-shell-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Fremde Domains (Supabase, esm.sh, Fonts ...) nicht anfassen.
  if (url.origin !== self.location.origin) return;
  // Dynamische API immer live aus dem Netz.
  if (url.pathname.startsWith("/api")) return;

  // Seitenaufrufe: Netzwerk zuerst (frische App), bei Offline -> Cache.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Statische Eigen-Assets (Icons, Manifest): Cache zuerst, sonst Netz.
  event.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
    )
  );
});
