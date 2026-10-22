// IndexedDB client for Linkarium offline mirror and mutation outbox.
const DB_NAME = 'linkarium_offline'
const DB_VERSION = 1

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return resolve(null)
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('links')) {
        const linkStore = db.createObjectStore('links', { keyPath: '_id' })
        linkStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        linkStore.createIndex('favorite', 'favorite', { unique: false })
      }
      if (!db.objectStoreNames.contains('collections')) {
        db.createObjectStore('collections', { keyPath: '_id' })
      }
      if (!db.objectStoreNames.contains('tags')) {
        db.createObjectStore('tags', { keyPath: 'name' })
      }
      if (!db.objectStoreNames.contains('outbox')) {
        db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

export async function putRecords(storeName, records) {
  const db = await openDb()
  if (!db) return
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const list = Array.isArray(records) ? records : [records]
    for (const item of list) {
      if (item && typeof item === 'object') {
        store.put(item)
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAllRecords(storeName) {
  const db = await openDb()
  if (!db) return []
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

export async function deleteRecord(storeName, key) {
  const db = await openDb()
  if (!db) return
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function enqueueOutbox(method, path, body) {
  const db = await openDb()
  if (!db) return null
  return new Promise((resolve, reject) => {
    const tx = db.transaction('outbox', 'readwrite')
    const store = tx.objectStore('outbox')
    const req = store.add({
      method,
      path,
      body,
      createdAt: new Date().toISOString(),
    })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getOutboxItems() {
  return getAllRecords('outbox')
}

export async function removeOutboxItem(id) {
  return deleteRecord('outbox', id)
}
