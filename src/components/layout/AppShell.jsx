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
import './AppShell.css'

const Background3D = lazy(() => import('../Background3D'))
const VisualView = lazy(() => import('../visual/VisualView'))

export default function AppShell() {
  const fetchMeta = useLinkStore((s) => s.fetchMeta)
  const visualMode = useUiStore((s) => s.visualMode)
  const toggleVisual = useUiStore((s) => s.toggleVisual)
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarHover, setSidebarHover] = useState(false)

  useEffect(() => {
    fetchMeta().catch((err) => notifications.show({ message: err.message, color: 'red' }))
  }, [fetchMeta])

  useEffect(() => {
    if (!visualMode) return
    const onKey = (e) => {
      if (e.key === 'Escape') toggleVisual()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visualMode, toggleVisual])

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
    </>
  )
}