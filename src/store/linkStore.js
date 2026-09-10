import { create } from 'zustand'
import { linksApi, collectionsApi, tagsApi, analyticsApi } from '../api/endpoints'

const PAGE_SIZE = 50

export const useLinkStore = create((set, get) => {
  // Monotonic request id so stale pagination responses are ignored
  let requestId = 0

  return {
    links: [],
    total: 0,
    hasMore: false,
    loading: false,
    loadingMore: false,
    error: null,
    collections: [],
    tags: [],
    summary: null,
    lastParams: null,
    // Full set of the user's bookmarks for the 3D map view.
    mapLinks: [],
    mapLoaded: false,
    mapError: null,

    // Trash state
    trashLinks: [],
    trashTotal: 0,
    trashLoading: false,
    trashError: null,

    // Collections + tags + summary counts stay accurate regardless of which
    // page of links is currently loaded.
    async fetchMeta() {
      const [collections, tags, summary] = await Promise.all([
        collectionsApi.list(),
        tagsApi.list(),
        analyticsApi.summary(),
      ])
      set({ collections, tags, summary })
    },

    // Load the FULL set of bookmarks for the 3D map.
    async fetchAllLinks(reload = false) {
      if (get().mapLoaded && !reload) return
      try {
        const { links } = await linksApi.list({ sort: 'newest', limit: 1000 })
        set({ mapLinks: links, mapLoaded: true, mapError: null })
      } catch (err) {
        set({ mapError: err.message })
      }
    },

    async refreshTags() {
      try {
        const tags = await tagsApi.list()
        set({ tags })
      } catch {
        /* ignore */
      }
    },

    async refreshSummary() {
      try {
        const summary = await analyticsApi.summary()
        set({ summary })
      } catch {
        /* ignore */
      }
    },

    async fetchLinks(params = {}, { reset = true } = {}) {
      const id = ++requestId
      set({ loading: reset, loadingMore: !reset, error: null })

      const skip = reset ? 0 : get().links.length
      const limit = params.limit || PAGE_SIZE

      try {
        const { links, total } = await linksApi.list({ ...params, skip, limit })
        if (id !== requestId) return
        set((s) => {
          const merged = reset ? links : [...s.links, ...links]
          return {
            links: merged,
            total,
            hasMore: merged.length < total,
            loading: false,
            loadingMore: false,
            lastParams: params,
          }
        })
      } catch (err) {
        if (id !== requestId) return
        set({ loading: false, loadingMore: false, error: err.message })
      }
    },

    async loadMore() {
      const s = get()
      if (!s.hasMore || s.loading || s.loadingMore || !s.lastParams) return
      await get().fetchLinks(s.lastParams, { reset: false })
    },

    async addLink(payload) {
      const link = await linksApi.create(payload)
      set((s) => ({
        links: [link, ...s.links],
        mapLinks: s.mapLoaded ? [link, ...s.mapLinks] : s.mapLinks,
        total: s.total + 1,
      }))
      get().refreshTags()
      get().refreshSummary()
      return link
    },

    async updateLink(id, payload) {
      const updated = await linksApi.update(id, payload)
      set((s) => ({
        links: s.links.map((l) => (l._id === id ? updated : l)),
        mapLinks: s.mapLoaded ? s.mapLinks.map((l) => (l._id === id ? updated : l)) : s.mapLinks,
      }))
      get().refreshTags()
      return updated
    },

    async removeLink(id) {
      await linksApi.remove(id)
      set((s) => ({
        links: s.links.filter((l) => l._id !== id),
        mapLinks: s.mapLoaded ? s.mapLinks.filter((l) => l._id !== id) : s.mapLinks,
        total: Math.max(s.total - 1, 0),
      }))
      get().refreshTags()
      get().refreshSummary()
    },

    async bulkDelete(ids) {
      await linksApi.bulkDelete(ids)
      const idSet = new Set(ids)
      set((s) => ({
        links: s.links.filter((l) => !idSet.has(l._id)),
        mapLinks: s.mapLoaded ? s.mapLinks.filter((l) => !idSet.has(l._id)) : s.mapLinks,
        total: Math.max(s.total - ids.length, 0),
      }))
      get().refreshTags()
      get().refreshSummary()
    },

    async bulkMove(ids, collectionId) {
      await linksApi.bulkMove(ids, collectionId)
      const idSet = new Set(ids)
      set((s) => ({
        links: s.links.map((l) => (idSet.has(l._id) ? { ...l, collectionId } : l)),
        mapLinks: s.mapLoaded
          ? s.mapLinks.map((l) => (idSet.has(l._id) ? { ...l, collectionId } : l))
          : s.mapLinks,
      }))
      get().refreshSummary()
    },

    async fetchTrash(params = {}) {
      set({ trashLoading: true, trashError: null })
      try {
        const { links, total } = await linksApi.trash(params)
        set({ trashLinks: links, trashTotal: total, trashLoading: false })
      } catch (err) {
        set({ trashLoading: false, trashError: err.message })
      }
    },

    async restoreLink(id) {
      await linksApi.restore(id)
      set((s) => ({
        trashLinks: s.trashLinks.filter((l) => l._id !== id),
        trashTotal: Math.max(s.trashTotal - 1, 0),
      }))
      get().refreshSummary()
    },

    async deleteForever(id) {
      await linksApi.permanentDelete(id)
      set((s) => ({
        trashLinks: s.trashLinks.filter((l) => l._id !== id),
        trashTotal: Math.max(s.trashTotal - 1, 0),
      }))
      get().refreshSummary()
    },

    async bulkRestore(ids) {
      await linksApi.bulkRestore(ids)
      const idSet = new Set(ids)
      set((s) => ({
        trashLinks: s.trashLinks.filter((l) => !idSet.has(l._id)),
        trashTotal: Math.max(s.trashTotal - ids.length, 0),
      }))
      get().refreshSummary()
    },

    async bulkPermanentDelete(ids) {
      await linksApi.bulkPermanentDelete(ids)
      const idSet = new Set(ids)
      set((s) => ({
        trashLinks: s.trashLinks.filter((l) => !idSet.has(l._id)),
        trashTotal: Math.max(s.trashTotal - ids.length, 0),
      }))
      get().refreshSummary()
    },

    async emptyTrash() {
      await linksApi.emptyTrash()
      set({ trashLinks: [], trashTotal: 0 })
      get().refreshSummary()
    },

    async toggleFavorite(link) {
      const next = !link.favorite
      const patch = (arr) => arr.map((l) => (l._id === link._id ? { ...l, favorite: next } : l))
      set((s) => ({
        links: patch(s.links),
        mapLinks: s.mapLoaded ? patch(s.mapLinks) : s.mapLinks,
      }))
      try {
        const updated = await linksApi.update(link._id, { favorite: next })
        const applyUpdate = (arr) => arr.map((l) => (l._id === link._id ? updated : l))
        set((s) => ({
          links: applyUpdate(s.links),
          mapLinks: s.mapLoaded ? applyUpdate(s.mapLinks) : s.mapLinks,
        }))
      } catch {
        const revert = (arr) => arr.map((l) => (l._id === link._id ? link : l))
        set((s) => ({
          links: revert(s.links),
          mapLinks: s.mapLoaded ? revert(s.mapLinks) : s.mapLinks,
        }))
      }
      get().refreshSummary()
    },

    recordVisit(link) {
      const now = new Date().toISOString()
      const bump = (arr) =>
        arr.map((l) =>
          l._id === link._id ? { ...l, visits: l.visits + 1, lastVisitedAt: now } : l
        )
      set((s) => ({
        links: bump(s.links),
        mapLinks: s.mapLoaded ? bump(s.mapLinks) : s.mapLinks,
      }))
      linksApi.visit(link._id).catch(() => {})
    },

    async addCollection(name, color) {
      const collection = await collectionsApi.create({ name, color })
      set((s) => ({ collections: [...s.collections, collection] }))
      return collection
    },

    async updateCollection(id, payload) {
      const updated = await collectionsApi.update(id, payload)
      set((s) => ({
        collections: s.collections.map((c) => (c.id === id ? updated : c)),
      }))
      return updated
    },

    async removeCollection(id) {
      await collectionsApi.remove(id)
      set((s) => ({
        collections: s.collections.filter((c) => c.id !== id),
        links: s.links.map((l) => (l.collectionId === id ? { ...l, collectionId: null } : l)),
        mapLinks: s.mapLoaded
          ? s.mapLinks.map((l) => (l.collectionId === id ? { ...l, collectionId: null } : l))
          : s.mapLinks,
      }))
    },
  }
})