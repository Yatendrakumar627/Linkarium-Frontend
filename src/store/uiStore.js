import { create } from 'zustand'

export const useUiStore = create((set, get) => ({
  view: { type: 'dashboard' },
  search: '',
  sort: 'newest',
  visualMode: false,
  sidebarCollapsed: typeof localStorage !== 'undefined' ? localStorage.getItem('linkarium.sidebarCollapsed') === '1' : false,
  editorOpen: false,
  editingLink: null,
  profileOpen: false,
  collectionEditor: null,

  // Multi-select state
  selectionMode: false,
  selectedIds: new Set(),

  setView: (view) => set({ view, selectionMode: false, selectedIds: new Set() }),
  toggleSidebar: () =>
    set((s) => {
      const next = !s.sidebarCollapsed
      localStorage.setItem('linkarium.sidebarCollapsed', next ? '1' : '0')
      return { sidebarCollapsed: next }
    }),
  setSearch: (search) => set({ search }),
  setSort: (sort) => set({ sort }),
  toggleVisual: () => set((s) => ({ visualMode: !s.visualMode })),
  openEditor: (link = null) => set({ editorOpen: true, editingLink: link }),
  closeEditor: () => set({ editorOpen: false, editingLink: null }),
  openProfile: () => set({ profileOpen: true }),
  closeProfile: () => set({ profileOpen: false }),
  openCollectionEditor: (mode) => set({ collectionEditor: mode }),
  closeCollectionEditor: () => set({ collectionEditor: null }),

  enterSelectionMode: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds)
      if (id) next.add(id)
      return { selectionMode: true, selectedIds: next }
    }),
  toggleSelect: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      if (next.size === 0) return { selectionMode: false, selectedIds: next }
      return { selectedIds: next }
    }),
  selectAll: (ids) =>
    set(() => {
      const next = new Set(ids)
      return { selectionMode: true, selectedIds: next }
    }),
  deselectAll: () => set({ selectionMode: false, selectedIds: new Set() }),
  exitSelectionMode: () => set({ selectionMode: false, selectedIds: new Set() }),
}))