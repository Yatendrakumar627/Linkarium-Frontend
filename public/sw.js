const CACHE_NAME = 'linkarium-v4-shell'
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

  // Navigation requests (HTML): Network-First.
  // Ensures returning users always receive the freshest index.html referencing
  // current build chunks, avoiding chunk mismatch blank screens.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const cacheCopy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy)).catch(() => {})
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(event.request)
          if (cached) return cached
          const fallback = await caches.match('/index.html')
          if (fallback) return fallback
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
        })
    )
    return
  }

  // Static assets (hashed JS/CSS/images/fonts): Cache-First with network fallback.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
            const cacheCopy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy)).catch(() => {})
          }
          return response
        })
        .catch(() => {
          // Do NOT return a synthetic 503 for missing script chunks — allow the fetch failure to reject
          // cleanly so RootErrorBoundary can detect ChunkLoadError and reload smoothly.
          return new Response('Asset unavailable offline', { status: 404, statusText: 'Not Found' })
        })
    })
  )
})
