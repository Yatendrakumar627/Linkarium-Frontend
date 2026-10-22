import { lazy, Suspense, useEffect, useState } from 'react'
import { notifications } from '@mantine/notifications'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Hub from '../views/Hub'
import AddEditLinkModal from '../links/AddEditLinkModal'
import CollectionEditorModal from '../collections/CollectionEditorModal'
import ProfileModal from '../profile/ProfileModal'
import CommandPalette from '../common/CommandPalette'
import SmartTriageModal from '../collections/SmartTriageModal'
import ShortcutsModal from '../common/ShortcutsModal'
import ClipboardSniffer from '../common/ClipboardSniffer'
import SavedViewEditor from '../savedViews/SavedViewEditor'
import RuleEditor from '../rules/RuleEditor'
import ReaderModal from '../links/ReaderModal'
import SessionsModal from '../profile/SessionsModal'
import ApiKeysModal from '../profile/ApiKeysModal'
import InstallPrompt from './InstallPrompt'
import './AppShell.css'

const Background3D = lazy(() => import('../Background3D'))
const VisualView = lazy(() => import('../visual/VisualView'))

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

  useEffect(() => {
    fetchMeta().catch((err) => notifications.show({ message: err.message, color: 'red' }))
  }, [fetchMeta])

  // A deep link like `/?q=tag:ai` opens the app already filtered. The weekly
  // digest uses it, so an emailed link lands on the right view.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (!q) return
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
      <Suspense fallback={null}>
        <Background3D />
      </Suspense>
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

      <AddEditLinkModal />
      <CollectionEditorModal />
      <ProfileModal />
      <SavedViewEditor />
      <RuleEditor />
      <ReaderModal />
      <SessionsModal />
      <ApiKeysModal />

      {/* Pro Features */}
      <CommandPalette />
      <SmartTriageModal />
      <ShortcutsModal />
      <ClipboardSniffer />
      <InstallPrompt />
    </>
  )
}