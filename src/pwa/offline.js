import {
  putRecords,
  getAllRecords,
  enqueueOutbox,
  getOutboxItems,
  removeOutboxItem,
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

export async function queueMutation(method, path, body) {
  return enqueueOutbox(method, path, body)
}

let isReplaying = false

export async function replayOutbox(apiClient) {
  if (isReplaying || (typeof navigator !== 'undefined' && !navigator.onLine)) return
  isReplaying = true
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
      } catch (err) {
        // If server says 4xx, discard; if network failed, stop replay until next online
        if (err.status && err.status >= 400 && err.status < 500) {
          await removeOutboxItem(item.id)
        } else {
          break
        }
      }
    }
  } finally {
    isReplaying = false
  }
}

export function initOfflineSync(apiClient) {
  if (typeof window === 'undefined') return
  window.addEventListener('online', () => {
    replayOutbox(apiClient)
  })
  setInterval(() => {
    if (navigator.onLine) {
      replayOutbox(apiClient)
    }
  }, 60000)
}
