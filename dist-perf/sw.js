const CACHE_NAME = 'linkarium-v3-shell'
const PRECACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.webmanifest',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)

  // Only handle http and https requests (ignore chrome-extension://, etc.)
  if (!url.protocol.startsWith('http')) return

  // Skip API calls from cache (handled via IndexedDB mirror)
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networked = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const cacheCopy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy)).catch(() => {})
          }
          return response
        })
        .catch(async () => {
          if (cached) return cached
          if (event.request.mode === 'navigate') {
            const fallback = await caches.match('/index.html')
            if (fallback) return fallback
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
        })

      return cached || networked
    })
  )
})
