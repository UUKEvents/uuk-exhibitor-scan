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
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
