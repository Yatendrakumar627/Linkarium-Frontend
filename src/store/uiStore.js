import { create } from 'zustand'

export const useUiStore = create((set) => ({
  view: { type: 'dashboard' },
  search: '',
  sort: 'newest',
  visualMode: false,
  sidebarCollapsed: typeof localStorage !== 'undefined' ? localStorage.getItem('linkarium.sidebarCollapsed') === '1' : false,
  editorOpen: false,
  editingLink: null,
  profileOpen: false,
  collectionEditor: null,
  tagEditor: null, // { tag: 'website', color: '#00e5ff', count: 37 }

  commandPaletteOpen: false,
  triageOpen: false,
  shortcutsOpen: false,
  savedViewEditor: null,
  ruleEditor: null,
  tagWebsitesModal: null, // { tag: '' }
  confirmDialog: null, // { id, title, subtitle, icon, tone, body, confirmLabel, onConfirm }
  sessionsOpen: false,
  apiKeysOpen: false,
  readerLink: null,

  // Multi-select state
  selectionMode: false,
  selectedIds: new Set(),

  // Temporary UI color mode override (for live preview or local toggle)
  colorModeOverride: null,

  // Reset transient per-user UI state (selections, open modals, current view).
  // Keeps device-level prefs (sidebarCollapsed) intact.
  reset: () =>
    set({
      view: { type: 'dashboard' },
      search: '',
      sort: 'newest',
      visualMode: false,
      editorOpen: false,
      editingLink: null,
      profileOpen: false,
      collectionEditor: null,
      tagEditor: null,
      commandPaletteOpen: false,
      triageOpen: false,
      shortcutsOpen: false,
      savedViewEditor: null,
      ruleEditor: null,
      tagWebsitesModal: null,
      confirmDialog: null,
      sessionsOpen: false,
      apiKeysOpen: false,
      readerLink: null,
      selectionMode: false,
      selectedIds: new Set(),
      colorModeOverride: null,
    }),

  setColorModeOverride: (colorModeOverride) => set({ colorModeOverride }),
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
  openTagEditor: (tag) => set({ tagEditor: tag }),
  closeTagEditor: () => set({ tagEditor: null }),

  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  openTriage: () => set({ triageOpen: true }),
  closeTriage: () => set({ triageOpen: false }),

  openShortcuts: () => set({ shortcutsOpen: true }),
  closeShortcuts: () => set({ shortcutsOpen: false }),

  openSavedViewEditor: (view = null) => set({ savedViewEditor: view || { mode: 'create' } }),
  closeSavedViewEditor: () => set({ savedViewEditor: null }),

  openRuleEditor: (rule = null) => set({ ruleEditor: rule || { mode: 'create' } }),
  closeRuleEditor: () => set({ ruleEditor: null }),

  openTagWebsitesModal: (tag = '') => set({ tagWebsitesModal: { tag: tag || '' } }),
  closeTagWebsitesModal: () => set({ tagWebsitesModal: null }),

  // Opens the themed confirm dialog. `onConfirm` may be async; if it rejects
  // the dialog stays open and the error is surfaced as a notification.
  openConfirmDialog: (config) =>
    set({ confirmDialog: { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, ...config } }),
  closeConfirmDialog: () => set({ confirmDialog: null }),

  openSessions: () => set({ sessionsOpen: true }),
  closeSessions: () => set({ sessionsOpen: false }),

  openApiKeys: () => set({ apiKeysOpen: true }),
  closeApiKeys: () => set({ apiKeysOpen: false }),

  openReader: (link) => set({ readerLink: link }),
  closeReader: () => set({ readerLink: null }),

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