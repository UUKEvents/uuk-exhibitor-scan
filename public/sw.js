const CACHE_NAME = "uuk-scan-v8";
const ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/script.js",
  "/favicon.ico",
  "/manifest.json",
  "/UUK_White_RGB.svg",
  "/session/",
  "/session/index.html",
  "https://unpkg.com/html5-qrcode/html5-qrcode.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Bypass SW for Vercel Insights to avoid promise rejections/CORS issues
  if (event.request.url.includes("_vercel/insights")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).catch((err) => {
          console.warn("Fetch failed for:", event.request.url, err);
          // Return a network error response if both cache and network fail
          return new Response("Network error", { status: 408 });
        })
      );
    }),
  );
});
