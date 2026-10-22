import { create } from 'zustand'
import { savedViewsApi } from '../api/endpoints'

// Saved views and automation rules.
//
// Both live in the same collection on the server (one document per entry, a
// `kind` discriminator) and are therefore kept in the same store here — the
// UI shows them in two different places, but they are one list.
export const useSavedViewStore = create((set, get) => ({
  views: [],
  rules: [],
  loading: false,
  error: null,

  async fetch() {
    set({ loading: true, error: null })
    try {
      const data = await savedViewsApi.list()
      set({
        views: data?.views || [],
        rules: data?.rules || [],
        loading: false,
      })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  async create(payload) {
    const { view } = await savedViewsApi.create(payload)
    set((s) =>
      view.kind === 'rule'
        ? { rules: [...s.rules, view] }
        : { views: [...s.views, view] },
    )
    return view
  },

  async update(id, payload) {
    const { view } = await savedViewsApi.update(id, payload)
    set((s) => ({
      views: s.views.map((v) => (v._id === id ? view : v)),
      rules: s.rules.map((v) => (v._id === id ? view : v)),
    }))
    return view
  },

  async remove(id) {
    await savedViewsApi.remove(id)
    set((s) => ({
      views: s.views.filter((v) => v._id !== id),
      rules: s.rules.filter((v) => v._id !== id),
    }))
  },

  // Persist a new order for the saved views.
  async reorder(views) {
    const order = views.map((v, index) => ({ id: v._id, index }))
    // Optimistic: the list is already in its new order locally.
    set({ views: views.map((v, index) => ({ ...v, order: index })) })
    try {
      await savedViewsApi.reorder(order)
    } catch (err) {
      // Fall back to the server's order.
      get().fetch()
      throw err
    }
  },

  // Run a rule now (dry run by default when the user is just previewing).
  async run(id, dryRun = false) {
    return savedViewsApi.run(id, dryRun)
  },

  // How many links would this query match?
  async preview(query) {
    return savedViewsApi.preview(query)
  },

  reset: () => set({ views: [], rules: [], loading: false, error: null }),
}))
