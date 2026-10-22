import {
  putRecords,
  getAllRecords,
  enqueueOutbox,
  getOutboxItems,
  removeOutboxItem,
  deleteRecord,
} from './db'

export async function cacheLinks(links) {
  if (Array.isArray(links) && links.length) {
    await putRecords('links', links)
  }
}

export async function cacheCollections(collections) {
  if (Array.isArray(collections) && collections.length) {
    await putRecords('collections', collections)
  }
}

export async function cacheTags(tags) {
  if (Array.isArray(tags) && tags.length) {
    await putRecords('tags', tags)
  }
}

export async function getCachedLinks() {
  return getAllRecords('links')
}

export async function getCachedCollections() {
  return getAllRecords('collections')
}

export async function getCachedTags() {
  return getAllRecords('tags')
}

export async function removeCachedLinks(ids) {
  if (!Array.isArray(ids)) return
  await Promise.all(ids.map((id) => deleteRecord('links', id)))
}

export async function clearOutbox() {
  const db = await openDb()
  if (!db) return
  return new Promise((resolve, reject) => {
    const tx = db.transaction('outbox', 'readwrite')
    tx.objectStore('outbox').clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function queueMutation(method, path, body) {
  return enqueueOutbox(method, path, body)
}

let isReplaying = false

export async function replayOutbox(apiClient, onReplay) {
  if (isReplaying || (typeof navigator !== 'undefined' && !navigator.onLine)) return
  isReplaying = true
  let changed = false
  try {
    const items = await getOutboxItems()
    for (const item of items) {
      try {
        if (apiClient) {
          if (item.method === 'POST') await apiClient.post(item.path, item.body)
          else if (item.method === 'PATCH') await apiClient.patch(item.path, item.body)
          else if (item.method === 'DELETE') await apiClient.del(item.path)
        }
        await removeOutboxItem(item.id)
        changed = true
      } catch (err) {
        // If server says 4xx, discard; if network failed, stop replay until next online
        if (err.status && err.status >= 400 && err.status < 500) {
          await removeOutboxItem(item.id)
          changed = true
        } else {
          break
        }
      }
    }
  } finally {
    isReplaying = false
    // Let the caller reconcile the optimistic local state with the server
    // (offline-created links have temporary ids, so a refetch is the simplest
    // correct merge).
    if (changed && typeof onReplay === 'function') {
      try {
        await onReplay()
      } catch {
        /* the caller's refresh is best-effort */
      }
    }
  }
}

export function initOfflineSync(apiClient, onReplay) {
  if (typeof window === 'undefined') return
  window.addEventListener('online', () => {
    replayOutbox(apiClient, onReplay)
  })
  setInterval(() => {
    if (navigator.onLine) {
      replayOutbox(apiClient, onReplay)
    }
  }, 60000)
  // Replay anything left over from a previous session immediately.
  if (navigator.onLine) replayOutbox(apiClient, onReplay)
}
