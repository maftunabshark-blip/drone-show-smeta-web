/* Drone Show Smeta SW — GitHub Pages friendly (no API caching) */
const VERSION = "v1.0.6";                 // <= keyingi commitlarda oshiring
const STATIC_CACHE = `static-${VERSION}`;
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./apple-touch-icon.png",
  "./apple-touch-icon.ico",
  "./icons/geo_logo.png"
];

// Hech qachon keshga tushmasin (CBU API):
const NEVER_CACHE_HOSTS = ["cbu.uz"];

// Tez aktiv bo'lsin
self.addEventListener("install", (evt) => {
  self.skipWaiting();
  evt.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(STATIC_ASSETS)).catch(()=>{})
  );
});

self.addEventListener("activate", (evt) => {
  self.clients.claim();
  evt.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k)))
    )
  );
});

function shouldNeverCache(req){
  try { return NEVER_CACHE_HOSTS.includes(new URL(req.url).hostname); }
  catch { return false; }
}

self.addEventListener("fetch", (evt) => {
  const req = evt.request;
  if (req.method !== "GET") return;

  // CBU API — faqat tarmoqdan, kesh yo‘q
  if (shouldNeverCache(req)) {
    evt.respondWith(
      fetch(req, { cache: "no-store" }).catch(() =>
        new Response(JSON.stringify({ error: "offline" }), {
          status: 503, headers: { "Content-Type": "application/json" }
        })
      )
    );
    return;
  }

  // Statik resurslar — cache-first, so'ng network
  const dest = req.destination; // "document" | "script" | "style" | "image" | ...
  const isStatic = ["", "document", "script", "style", "image", "font"].includes(dest);

  if (isStatic) {
    evt.respondWith(
      caches.match(req, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const clone = res.clone();
          if (res.ok) caches.open(STATIC_CACHE).then((c) => c.put(req, clone)).catch(()=>{});
          return res;
        }).catch(() => caches.match("./index.html"));
      })
    );
  }
});
