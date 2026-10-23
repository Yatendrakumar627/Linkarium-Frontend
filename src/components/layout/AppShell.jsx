import { lazy, Suspense, useEffect, useState } from 'react'
import { notifications } from '@mantine/notifications'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import { useAuthStore } from '../../store/authStore'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Hub from '../views/Hub'
import ClipboardSniffer from '../common/ClipboardSniffer'
import ConfirmDialog from '../common/ConfirmDialog'
import InstallPrompt from './InstallPrompt'
import './AppShell.css'

const Background3D = lazy(() => import('../Background3D'))
const VisualView = lazy(() => import('../visual/VisualView'))
const AddEditLinkModal = lazy(() => import('../links/AddEditLinkModal'))
const CollectionEditorModal = lazy(() => import('../collections/CollectionEditorModal'))
const ProfileModal = lazy(() => import('../profile/ProfileModal'))
const CommandPalette = lazy(() => import('../common/CommandPalette'))
const SmartTriageModal = lazy(() => import('../collections/SmartTriageModal'))
const ShortcutsModal = lazy(() => import('../common/ShortcutsModal'))
const SavedViewEditor = lazy(() => import('../savedViews/SavedViewEditor'))
const RuleEditor = lazy(() => import('../rules/RuleEditor'))
const ReaderModal = lazy(() => import('../links/ReaderModal'))
const SessionsModal = lazy(() => import('../profile/SessionsModal'))
const ApiKeysModal = lazy(() => import('../profile/ApiKeysModal'))
const AddWebsitesToTagModal = lazy(() => import('../tags/AddWebsitesToTagModal'))

// The preference names and the internal view names do not match one-to-one.
const DEFAULT_VIEW_TYPES = {
  dashboard: 'dashboard',
  links: 'all',
  favorites: 'favorites',
  insights: 'analytics',
  archive: 'archived',
}

export default function AppShell() {
  const fetchMeta = useLinkStore((s) => s.fetchMeta)
  const visualMode = useUiStore((s) => s.visualMode)
  const toggleVisual = useUiStore((s) => s.toggleVisual)
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed)

  const toggleCommandPalette = useUiStore((s) => s.toggleCommandPalette)
  const commandPaletteOpen = useUiStore((s) => s.commandPaletteOpen)
  const openShortcuts = useUiStore((s) => s.openShortcuts)
  const shortcutsOpen = useUiStore((s) => s.shortcutsOpen)
  const openTriage = useUiStore((s) => s.openTriage)
  const triageOpen = useUiStore((s) => s.triageOpen)
  const openEditor = useUiStore((s) => s.openEditor)
  const editorOpen = useUiStore((s) => s.editorOpen)
  const profileOpen = useUiStore((s) => s.profileOpen)
  const collectionEditor = useUiStore((s) => s.collectionEditor)
  const setSearch = useUiStore((s) => s.setSearch)
  const setView = useUiStore((s) => s.setView)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarHover, setSidebarHover] = useState(false)
  // The 3D backdrop is purely decorative but pulls in a large three.js chunk
  // and compiles shaders on the main thread. Keep it off the critical path:
  // wait for the first paint and the initial API burst, then mount it while
  // the browser is idle. Users who ask for reduced motion, save-data, or a
  // very slow connection never pay for it at all.
  const [showBackground, setShowBackground] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const connection = navigator.connection
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    const slowConnection = /(^|-)2g$/.test(connection?.effectiveType || '')
    if (reduceMotion || connection?.saveData || slowConnection) return

    let idleId
    const start = () => setShowBackground(true)
    const timer = window.setTimeout(() => {
      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(start, { timeout: 3000 })
      } else {
        start()
      }
    }, 2500)

    return () => {
      window.clearTimeout(timer)
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId)
    }
  }, [])

  useEffect(() => {
    fetchMeta().catch((err) => notifications.show({ message: err.message, color: 'red' }))
  }, [fetchMeta])

  // A deep link like `/?q=tag:ai` opens the app already filtered. The weekly
  // digest uses it, so an emailed link lands on the right view.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (!q) {
      // No deep link: honour the user's saved "default opening view".
      const defaultView = useAuthStore.getState().user?.preferences?.defaultView
      const type = DEFAULT_VIEW_TYPES[defaultView]
      if (type) setView({ type })
      return
    }
    setSearch(q.trim())
    setView({ type: 'all' })
    // Clean the address bar so a reload does not re-apply the filter twice.
    params.delete('q')
    const rest = params.toString()
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash}`
    )
  }, [setSearch, setView])

  // Global pro keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      // 1. Command Palette: Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        toggleCommandPalette()
        return
      }

      // If typing in an interactive form control, don't trigger single-letter hotkeys
      const el = document.activeElement
      const isInput =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
      if (isInput) return

      // Keyboard shortcuts modal (?)
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        openShortcuts()
        return
      }

      // If any modal or palette is open, don't trigger view switches or triage
      const anyModalOpen =
        commandPaletteOpen || triageOpen || shortcutsOpen || editorOpen || profileOpen || collectionEditor
      if (anyModalOpen) {
        if (e.key === 'Escape' && visualMode) toggleVisual()
        return
      }

      // Focus Topbar search on "/"
      if (e.key === '/') {
        const searchInput = document.querySelector('.search-input input')
        if (searchInput) {
          e.preventDefault()
          searchInput.focus()
          return
        }
      }

      if (e.key.toLowerCase() === 't') {
        e.preventDefault()
        openTriage()
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        openEditor(null)
      } else if (e.key.toLowerCase() === 'v') {
        e.preventDefault()
        toggleVisual()
      } else if (e.key === 'Escape' && visualMode) {
        toggleVisual()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    toggleCommandPalette,
    openShortcuts,
    openTriage,
    openEditor,
    toggleVisual,
    visualMode,
    commandPaletteOpen,
    triageOpen,
    shortcutsOpen,
    editorOpen,
    profileOpen,
    collectionEditor,
  ])

  const sidebarExpanded = sidebarCollapsed ? sidebarHover : true

  return (
    <>
      {showBackground && !visualMode && (
        <Suspense fallback={null}>
          <Background3D />
        </Suspense>
      )}
      <div className="scene-underlay" />

      <div className="shell">
        {sidebarOpen && <div className="mobile-scrim" onClick={() => setSidebarOpen(false)} />}
        <Sidebar
          open={sidebarOpen}
          collapsed={sidebarCollapsed && !sidebarExpanded}
          onNavigate={() => setSidebarOpen(false)}
          onMouseEnter={() => setSidebarHover(true)}
          onMouseLeave={() => setSidebarHover(false)}
        />

        <div className="main">
          <Topbar onMenu={() => setSidebarOpen(true)} />

          <div className={`content${visualMode ? ' visual-active' : ''}`}>
            {visualMode ? (
              <Suspense fallback={null}>
                <VisualView />
              </Suspense>
            ) : (
              <Hub />
            )}
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        {editorOpen && <AddEditLinkModal />}
        {collectionEditor && <CollectionEditorModal />}
        {profileOpen && <ProfileModal />}
        <SavedViewEditor />
        <RuleEditor />
        <ReaderModal />
        <SessionsModal />
        <ApiKeysModal />
        <AddWebsitesToTagModal />

        {/* Pro Features */}
        {commandPaletteOpen && <CommandPalette />}
        {triageOpen && <SmartTriageModal />}
        {shortcutsOpen && <ShortcutsModal />}
      </Suspense>

      <ClipboardSniffer />
      {/* Destructive confirmations — kept eager so the dialog never lags. */}
      <ConfirmDialog />
      <InstallPrompt />
    </>
  )
}