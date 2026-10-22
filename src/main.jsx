import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { BrowserRouter } from 'react-router-dom'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/charts/styles.css'
import './styles/base.css'
import './styles/shared.css'
import './styles/modal.css'

// Suppress known internal Three.js Clock deprecation warning triggered by @react-three/fiber v9
const origWarn = console.warn
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('THREE.Clock: This module has been deprecated')) {
    return
  }
  origWarn.apply(console, args)
}

import App from './App.jsx'
import { theme } from './theme'
import { initOfflineSync, getCachedLinks, removeCachedLinks } from './pwa/offline'
import { useLinkStore } from './store/linkStore'
import { api } from './api/client'

// Replay queued offline mutations, then reconcile the optimistic local state:
// offline-created links have temporary ids, so refetching the active view is
// the simplest way to pick up the real server records.
initOfflineSync(api, async () => {
  const cached = await getCachedLinks().catch(() => [])
  const tempIds = cached
    .filter((l) => l.offline || String(l._id).startsWith('offline-'))
    .map((l) => l._id)
  if (tempIds.length) await removeCachedLinks(tempIds).catch(() => {})
  const store = useLinkStore.getState()
  await Promise.allSettled([
    store.fetchLinks(store.lastParams || {}, { reset: true }),
    store.fetchMeta(),
  ])
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications position="top-right" limit={4} />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>,
)