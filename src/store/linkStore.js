import { create } from 'zustand'
import {
  linksApi,
  collectionsApi,
  tagsApi,
  analyticsApi,
  linkHealthApi,
} from '../api/endpoints'
import {
  cacheLinks,
  getCachedLinks,
  queueMutation,
  removeCachedLinks,
  clearOutbox,
} from '../pwa/offline'

const PAGE_SIZE = 50
// The trash view renders "select all" over the visible list; fetch up to the
// server's per-page maximum so the common case fits in a single page.
const TRASH_FETCH_LIMIT = 500

// The archive view is the only list that shows archived links; everywhere else
// an archived link disappears from the list.
const isArchiveView = (params) =>
  String(params?.q || '').toLowerCase().split(/\s+/).includes('is:archived')

export const useLinkStore = create((set, get) => {
  // Monotonic request id so stale pagination responses are ignored
  let requestId = 0
  // Client-side mirror of the server's visit debounce window.
  const lastVisitAt = new Map()

  // A write that fails because the network is gone is queued in IndexedDB and
  // replayed by initOfflineSync() once the browser is back online.
  const isOfflineError = (err) => {
    if (err?.status === 0) return true
    return typeof navigator !== 'undefined' && navigator.onLine === false && err?.status === undefined
  }

  const queueIfOffline = async (err, method, path, body) => {
    if (!isOfflineError(err)) return false
    await queueMutation(method, path, body)
    return true
  }

  // Temporary id for a link created while offline. It is replaced by the real
  // server record when the outbox is replayed and the list is refetched.
  const offlineLinkId = () => {
    const random =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    return `offline-${random}`
  }

  // True when the current list is narrowed by something a mutation can change
  // (a query, tag, collection or the favorites view). Mutating a link locally
  // is not enough in those views: the link may no longer belong in the list.
  const hasActiveFilter = (params) =>
    Boolean(params && (params.q || params.tag || params.collection || params.favorite !== undefined))

  const refreshActiveFilteredList = async () => {
    const { lastParams } = get()
    if (hasActiveFilter(lastParams)) {
      await get().fetchLinks(lastParams, { reset: true })
    }
  }

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
    activeParamsKey: null,
    // Structured form of the last search query (parsed by the server).
    parsed: null,
    // Full set of the user's bookmarks for the 3D map view.
    mapLinks: [],
    mapLoaded: false,
    mapError: null,
    // Link-health counters (healthy / broken / stale) for the sidebar.
    health: null,

    // Trash state
    trashLinks: [],
    trashTotal: 0,
    trashHasMore: false,
    trashLoading: false,
    trashError: null,

    // Wipe every piece of per-user data. Called on logout / account switch so a
    // second user on the same device never sees the previous user's links.
    reset() {
      requestId++ // invalidate any in-flight pagination responses
      // A queued mutation belongs to the account that was signed in when it
      // was made; never replay it into a different account.
      clearOutbox().catch(() => {})
      set({
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
        activeParamsKey: null,
        parsed: null,
        mapLinks: [],
        mapLoaded: false,
        mapError: null,
        health: null,
        trashLinks: [],
        trashTotal: 0,
        trashHasMore: false,
        trashLoading: false,
        trashError: null,
      })
    },

    // Collections + tags + summary counts stay accurate regardless of which
    // page of links is currently loaded.
    async fetchMeta() {
      const [collections, tags, summary] = await Promise.all([
        collectionsApi.list(),
        tagsApi.list(),
        analyticsApi.summary(),
      ])
      set({ collections, tags, summary })
      // The health counters live on their own endpoint — a failure there must
      // not break the whole boot.
      get().refreshHealth()
    },

    // Load the FULL set of bookmarks for the 3D map.
    async fetchAllLinks(reload = false) {
      if (get().mapLoaded && !reload) return
      try {
        // Archived links are hidden from the map and the command palette —
        // they are already "put away".
        const { links } = await linksApi.list({ sort: 'newest', limit: 1000, q: 'is:unarchived' })
        set({ mapLinks: links, mapLoaded: true, mapError: null })
      } catch (err) {
        set({ mapError: err.message })
      }
    },

    async refreshHealth() {
      try {
        const health = await linkHealthApi.summary()
        set({ health })
      } catch {
        /* ignore */
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
        const data = await linksApi.list({ ...params, skip, limit })
        const { links, total } = data
        cacheLinks(links).catch(() => {})
        if (id !== requestId) return
        set((s) => {
          // Dedupe on merge — offset pagination can re-serve an item if the list
          // shifted between requests (created/deleted link), which would also
          // produce duplicate React keys.
          const seen = new Set(reset ? [] : s.links.map((l) => l._id))
          const merged = reset ? links : [...s.links, ...links.filter((l) => !seen.has(l._id))]
          return {
            links: merged,
            total,
            hasMore: merged.length < total,
            loading: false,
            loadingMore: false,
            lastParams: params,
            // The server parses the search query; the parsed filters are
            // rendered as removable chips.
            parsed: data.parsed || null,
            // Identifies which query the loaded links belong to — lets views
            // render a skeleton instead of the previous view's links for a frame.
            activeParamsKey: JSON.stringify(params),
          }
        })
      } catch (err) {
        if (id !== requestId) return
        if (reset && (err.status === 0 || (typeof navigator !== 'undefined' && !navigator.onLine))) {
          const cached = await getCachedLinks().catch(() => [])
          if (cached.length) {
            // Serve the best local approximation of the active view and mark
            // which params it belongs to. Without this the view kept showing
            // the previous query's skeleton forever.
            let visible = cached.filter((l) => !l.deletedAt)
            if (params.favorite === 'true' || params.favorite === true) {
              visible = visible.filter((l) => l.favorite)
            }
            if (params.collection) {
              visible = visible.filter((l) => String(l.collectionId) === String(params.collection))
            }
            if (params.tag) {
              const tag = String(params.tag).toLowerCase()
              visible = visible.filter((l) =>
                (l.tags || []).some((t) => String(t).toLowerCase() === tag)
              )
            }
            set({
              links: visible,
              total: visible.length,
              hasMore: false,
              loading: false,
              loadingMore: false,
              error: null,
              lastParams: params,
              activeParamsKey: JSON.stringify(params),
              parsed: null,
            })
            return
          }
        }
        set({ loading: false, loadingMore: false, error: err.message })
      }
    },

    async loadMore() {
      const s = get()
      if (!s.hasMore || s.loading || s.loadingMore || !s.lastParams) return
      await get().fetchLinks(s.lastParams, { reset: false })
    },

    async addLink(payload) {
      let link
      let queued = false
      try {
        link = await linksApi.create(payload)
      } catch (err) {
        queued = await queueIfOffline(err, 'POST', '/links', payload)
        if (!queued) throw err
        const now = new Date().toISOString()
        link = {
          _id: offlineLinkId(),
          tags: [],
          favorite: false,
          visits: 0,
          note: '',
          ...payload,
          createdAt: now,
          updatedAt: now,
          offline: true,
        }
      }

      await cacheLinks([link]).catch(() => {})

      // Refetch through the active filter instead of blindly splicing the new
      // link in — it may not match the current view (favorites/tag/collection)
      // and would corrupt total/hasMore and the pagination offset. While
      // offline there is no server list to refetch, so show it optimistically.
      const params = get().lastParams
      if (queued) {
        set((s) => ({
          links: [link, ...s.links],
          total: s.total + 1,
          mapLinks: s.mapLoaded ? [link, ...s.mapLinks] : s.mapLinks,
        }))
      } else {
        set((s) => ({
          mapLinks: s.mapLoaded ? [link, ...s.mapLinks] : s.mapLinks,
        }))
        if (params) await get().fetchLinks(params, { reset: true })
      }
      get().refreshTags()
      get().refreshSummary()
      return link
    },

    async updateLink(id, payload) {
      let updated
      try {
        updated = await linksApi.update(id, payload)
      } catch (err) {
        if (!(await queueIfOffline(err, 'PATCH', `/links/${id}`, payload))) throw err
        const existing = get().links.find((l) => l._id === id)
        updated = { ...(existing || { _id: id }), ...payload }
      }
      await cacheLinks([updated]).catch(() => {})
      set((s) => ({
        links: s.links.map((l) => (l._id === id ? updated : l)),
        mapLinks: s.mapLoaded ? s.mapLinks.map((l) => (l._id === id ? updated : l)) : s.mapLinks,
      }))
      await refreshActiveFilteredList()
      get().refreshTags()
      return updated
    },

    async removeLink(id) {
      try {
        await linksApi.remove(id)
      } catch (err) {
        if (!(await queueIfOffline(err, 'DELETE', `/links/${id}`))) throw err
      }
      await removeCachedLinks([id]).catch(() => {})
      set((s) => ({
        links: s.links.filter((l) => l._id !== id),
        mapLinks: s.mapLoaded ? s.mapLinks.filter((l) => l._id !== id) : s.mapLinks,
        total: Math.max(s.total - 1, 0),
      }))
      get().refreshTags()
      get().refreshSummary()
    },

    async bulkDelete(ids) {
      try {
        await linksApi.bulkDelete(ids)
      } catch (err) {
        if (!(await queueIfOffline(err, 'POST', '/links/bulk-delete', { ids }))) throw err
      }
      await removeCachedLinks(ids).catch(() => {})
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
      try {
        await linksApi.bulkMove(ids, collectionId)
      } catch (err) {
        if (!(await queueIfOffline(err, 'POST', '/links/bulk-move', { ids, collectionId }))) throw err
      }
      const idSet = new Set(ids)
      const touched = get()
        .links.filter((l) => idSet.has(l._id))
        .map((l) => ({ ...l, collectionId }))
      await cacheLinks(touched).catch(() => {})
      set((s) => ({
        links: s.links.map((l) => (idSet.has(l._id) ? { ...l, collectionId } : l)),
        mapLinks: s.mapLoaded
          ? s.mapLinks.map((l) => (idSet.has(l._id) ? { ...l, collectionId } : l))
          : s.mapLinks,
      }))
      await refreshActiveFilteredList()
      get().refreshSummary()
    },

    // --- V3: link lifecycle (archive / merge / enrich / rules) ---

    async archiveLink(id) {
      const previous = get().links.find((l) => l._id === id)
      const archivedAt = new Date().toISOString()
      // Optimistic: the card disappears from every non-archive view at once.
      const patch = (arr) => arr.map((l) => (l._id === id ? { ...l, archivedAt } : l))
      set((s) => ({
        links: isArchiveView(s.lastParams) ? patch(s.links) : s.links.filter((l) => l._id !== id),
        mapLinks: s.mapLoaded ? s.mapLinks.filter((l) => l._id !== id) : s.mapLinks,
      }))

      try {
        const { link } = await linksApi.archive(id)
        set((s) => ({
          links: isArchiveView(s.lastParams)
            ? s.links.map((l) => (l._id === id ? link : l))
            : s.links,
        }))
      } catch (err) {
        // Queued for replay: the optimistic removal above is the correct local
        // state, so keep it instead of reverting.
        if (!(await queueIfOffline(err, 'POST', `/links/${id}/archive`))) {
          // Revert to the state before the optimistic update.
          if (previous) {
            set((s) => ({
              links: s.links.map((l) => (l._id === id ? previous : l)),
              mapLinks: s.mapLoaded ? s.mapLinks.map((l) => (l._id === id ? previous : l)) : s.mapLinks,
            }))
          }
          throw err
        }
      }
      get().refreshSummary()
      get().refreshHealth()
    },

    async unarchiveLink(id) {
      const previous = get().links.find((l) => l._id === id)
      set((s) => ({
        links: s.links.filter((l) => l._id !== id),
        mapLinks: s.mapLoaded ? s.mapLinks.map((l) => (l._id === id ? { ...l, archivedAt: null } : l)) : s.mapLinks,
      }))

      try {
        const { link } = await linksApi.unarchive(id)
        if (!isArchiveView(get().lastParams)) {
          set((s) => ({
            links: s.links.map((l) => (l._id === id ? link : l)),
            mapLinks: s.mapLoaded ? s.mapLinks.map((l) => (l._id === id ? link : l)) : s.mapLinks,
          }))
        }
      } catch (err) {
        if (!(await queueIfOffline(err, 'POST', `/links/${id}/unarchive`))) {
          if (previous) {
            set((s) => ({
              links: s.links.map((l) => (l._id === id ? previous : l)),
            }))
          }
          throw err
        }
      }
      get().refreshSummary()
      get().refreshHealth()
    },

    async bulkArchive(ids) {
      try {
        await linksApi.bulkArchive(ids)
      } catch (err) {
        if (!(await queueIfOffline(err, 'POST', '/links/bulk-archive', { ids }))) throw err
      }
      const idSet = new Set(ids)
      set((s) => ({
        links: isArchiveView(s.lastParams) ? s.links : s.links.filter((l) => !idSet.has(l._id)),
        mapLinks: s.mapLoaded ? s.mapLinks.filter((l) => !idSet.has(l._id)) : s.mapLinks,
      }))
      get().refreshSummary()
      get().refreshHealth()
    },

    async bulkUnarchive(ids) {
      try {
        await linksApi.bulkUnarchive(ids)
      } catch (err) {
        if (!(await queueIfOffline(err, 'POST', '/links/bulk-unarchive', { ids }))) throw err
      }
      const idSet = new Set(ids)
      set((s) => ({
        links: s.links.filter((l) => !idSet.has(l._id)),
        // Trashed links can be archived too — they keep their flag until it is
        // cleared, and the trash view shows it.
        trashLinks: s.trashLinks.map((l) =>
          idSet.has(l._id) ? { ...l, archivedAt: null } : l
        ),
        mapLinks: s.mapLoaded
          ? s.mapLinks.map((l) => (idSet.has(l._id) ? { ...l, archivedAt: null } : l))
          : s.mapLinks,
      }))
      get().refreshSummary()
      get().refreshHealth()
    },

    async bulkTag(ids, tags, mode = 'add') {
      try {
        await linksApi.bulkTag(ids, tags, mode)
      } catch (err) {
        if (!(await queueIfOffline(err, 'POST', '/links/bulk-tag', { ids, tags, mode }))) throw err
      }
      const idSet = new Set(ids)
      const apply = (arr) =>
        arr.map((l) => {
          if (!idSet.has(l._id)) return l
          const current = Array.isArray(l.tags) ? l.tags : []
          if (mode === 'remove') {
            const remove = new Set(tags.map((t) => String(t).toLowerCase()))
            return { ...l, tags: current.filter((t) => !remove.has(String(t).toLowerCase())) }
          }
          const merged = [...current]
          for (const tag of tags) {
            if (!merged.some((t) => String(t).toLowerCase() === String(tag).toLowerCase())) {
              merged.push(tag)
            }
          }
          return { ...l, tags: merged }
        })
      const touched = apply(get().links)
      await cacheLinks(touched).catch(() => {})
      set((s) => ({
        links: apply(s.links),
        mapLinks: s.mapLoaded ? apply(s.mapLinks) : s.mapLinks,
      }))
      await refreshActiveFilteredList()
      get().refreshTags()
      get().refreshSummary()
    },

    async mergeLinks(sourceId, targetId) {
      const { targetLink } = await linksApi.merge(sourceId, targetId)
      const target = targetLink
      set((s) => ({
        links: s.links
          .filter((l) => l._id !== sourceId)
          .map((l) => (l._id === targetId ? { ...l, ...target } : l)),
        mapLinks: s.mapLoaded
          ? s.mapLinks
              .filter((l) => l._id !== sourceId)
              .map((l) => (l._id === targetId ? { ...l, ...target } : l))
          : s.mapLinks,
      }))
      get().refreshSummary()
      get().refreshHealth()
      return target
    },

    async enrichLink(id) {
      const { link } = await linksApi.enrich(id)
      set((s) => ({
        links: s.links.map((l) => (l._id === id ? link : l)),
        mapLinks: s.mapLoaded ? s.mapLinks.map((l) => (l._id === id ? link : l)) : s.mapLinks,
      }))
      return link
    },

    async applyRulesToLink(id) {
      const { link } = await linksApi.applyRules(id)
      set((s) => ({
        links: s.links.map((l) => (l._id === id ? link : l)),
        mapLinks: s.mapLoaded ? s.mapLinks.map((l) => (l._id === id ? link : l)) : s.mapLinks,
      }))
      await refreshActiveFilteredList()
      get().refreshTags()
      get().refreshSummary()
      return link
    },

    // Run every enabled rule against a set of links.
    async applyRulesToLinks(ids) {
      const result = await linksApi.applyRulesBulk(ids)
      // The rules may have changed tags, so the visible links are re-fetched
      // rather than patched — the server owns the outcome.
      await get().fetchLinks(get().lastParams || {}, { reset: true })
      get().refreshTags()
      get().refreshSummary()
      get().refreshHealth()
      return result
    },

    async fetchTrash(params = {}) {
      set({ trashLoading: true, trashError: null })
      try {
        const { links, total } = await linksApi.trash({ limit: TRASH_FETCH_LIMIT, ...params })
        set({ trashLinks: links, trashTotal: total, trashHasMore: links.length < total, trashLoading: false })
      } catch (err) {
        set({ trashLoading: false, trashError: err.message })
      }
    },

    async restoreLink(id) {
      try {
        await linksApi.restore(id)
      } catch (err) {
        if (!(await queueIfOffline(err, 'POST', `/links/${id}/restore`))) throw err
      }
      set((s) => ({
        trashLinks: s.trashLinks.filter((l) => l._id !== id),
        trashTotal: Math.max(s.trashTotal - 1, 0),
      }))
      get().refreshSummary()
    },

    async deleteForever(id) {
      try {
        await linksApi.permanentDelete(id)
      } catch (err) {
        if (!(await queueIfOffline(err, 'DELETE', `/links/${id}/permanent`))) throw err
      }
      await removeCachedLinks([id]).catch(() => {})
      set((s) => ({
        trashLinks: s.trashLinks.filter((l) => l._id !== id),
        trashTotal: Math.max(s.trashTotal - 1, 0),
      }))
      get().refreshSummary()
    },

    async bulkRestore(ids) {
      try {
        await linksApi.bulkRestore(ids)
      } catch (err) {
        if (!(await queueIfOffline(err, 'POST', '/links/bulk-restore', { ids }))) throw err
      }
      const idSet = new Set(ids)
      set((s) => ({
        trashLinks: s.trashLinks.filter((l) => !idSet.has(l._id)),
        trashTotal: Math.max(s.trashTotal - ids.length, 0),
      }))
      get().refreshSummary()
    },

    async bulkPermanentDelete(ids) {
      try {
        await linksApi.bulkPermanentDelete(ids)
      } catch (err) {
        if (!(await queueIfOffline(err, 'POST', '/links/bulk-permanent-delete', { ids }))) throw err
      }
      await removeCachedLinks(ids).catch(() => {})
      const idSet = new Set(ids)
      set((s) => ({
        trashLinks: s.trashLinks.filter((l) => !idSet.has(l._id)),
        trashTotal: Math.max(s.trashTotal - ids.length, 0),
      }))
      get().refreshSummary()
    },

    async emptyTrash() {
      try {
        await linksApi.emptyTrash()
      } catch (err) {
        if (!(await queueIfOffline(err, 'POST', '/links/trash/empty'))) throw err
      }
      set({ trashLinks: [], trashTotal: 0, trashHasMore: false })
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
        await cacheLinks([updated]).catch(() => {})
        const applyUpdate = (arr) => arr.map((l) => (l._id === link._id ? updated : l))
        set((s) => ({
          links: applyUpdate(s.links),
          mapLinks: s.mapLoaded ? applyUpdate(s.mapLinks) : s.mapLinks,
        }))
      } catch (err) {
        // Offline: queue the write and keep the optimistic flag.
        if (!(await queueIfOffline(err, 'PATCH', `/links/${link._id}`, { favorite: next }))) {
          // Revert only the toggled flag — not the whole captured object, which
          // would clobber interim changes (e.g. a visit bump).
          const revert = (arr) => arr.map((l) => (l._id === link._id ? { ...l, favorite: link.favorite } : l))
          set((s) => ({
            links: revert(s.links),
            mapLinks: s.mapLoaded ? revert(s.mapLinks) : s.mapLinks,
          }))
        }
      }
      await refreshActiveFilteredList()
      get().refreshSummary()
    },

    recordVisit(link) {
      // The server debounces repeat opens of the same link within 60s and
      // answers 204 without incrementing. Mirror that here so the on-screen
      // count stays in sync with the persisted one.
      const now = new Date().toISOString()
      const key = link._id
      const last = lastVisitAt.get(key)
      if (last && Date.now() - last < 60 * 1000) return
      lastVisitAt.set(key, Date.now())

      const bump = (arr) =>
        arr.map((l) =>
          l._id === key ? { ...l, visits: (l.visits || 0) + 1, lastVisitedAt: now } : l
        )
      set((s) => ({
        links: bump(s.links),
        mapLinks: s.mapLoaded ? bump(s.mapLinks) : s.mapLinks,
      }))
      linksApi.visit(key).catch(() => {
        lastVisitAt.delete(key)
      })
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