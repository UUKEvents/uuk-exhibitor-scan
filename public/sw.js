const CACHE_NAME = "uuk-scan-v2";
const ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/script.js",
  "/favicon.ico",
  "/UUK_White_RGB.svg",
  "/session/index.html",
  "/session/script.js",
  "https://unpkg.com/html5-qrcode",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
