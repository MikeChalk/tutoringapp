self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok) { const clone = res.clone(); caches.open("v1").then(c => c.put(e.request, clone)) }
      return res
    }))
  )
})
