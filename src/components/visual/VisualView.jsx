import { useEffect, useState, Suspense, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu } from '@mantine/core'
import { 
  IconLayoutGrid, 
  IconLink, 
  IconFolder, 
  IconChevronDown, 
  IconFocusCentered, 
  IconPlus, 
  IconMinus, 
  IconX,
  IconHome,
  IconGridDots,
  IconCube,
  IconSettings,
  IconExternalLink
} from '@tabler/icons-react'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import { safeUrl, hostOf, faviconUrl } from '../../utils'
import ErrorState from '../common/ErrorState'
import SpaceScene from './SpaceScene'
import './VisualView.css'

export default function VisualView() {
  const mapLinks = useLinkStore((s) => s.mapLinks)
  const mapLoaded = useLinkStore((s) => s.mapLoaded)
  const mapError = useLinkStore((s) => s.mapError)
  const collections = useLinkStore((s) => s.collections)
  const fetchAllLinks = useLinkStore((s) => s.fetchAllLinks)
  
  const search = useUiStore((s) => s.search)
  const setSearch = useUiStore((s) => s.setSearch)
  const toggleVisual = useUiStore((s) => s.toggleVisual)
  const setView = useUiStore((s) => s.setView)
  const openProfile = useUiStore((s) => s.openProfile)

  const [activeClusterId, setActiveClusterId] = useState(null)
  
  const controlsRef = useRef(null)

  useEffect(() => {
    fetchAllLinks()
  }, [fetchAllLinks])

  const handleRecenter = () => {
    if (controlsRef.current) {
      controlsRef.current.reset()
      setActiveClusterId(null)
    }
  }

  const handleZoomIn = () => {
    if (controlsRef.current) {
      const target = controlsRef.current.target
      const camera = controlsRef.current.object
      camera.position.lerp(target, 0.25)
      controlsRef.current.update()
    }
  }

  const handleZoomOut = () => {
    if (controlsRef.current) {
      const target = controlsRef.current.target
      const camera = controlsRef.current.object
      const dir = camera.position.clone().sub(target)
      camera.position.add(dir.multiplyScalar(0.25))
      controlsRef.current.update()
    }
  }

  // Get active cluster details for the bottom sheet
  const activeCluster = activeClusterId 
    ? collections.find(c => c.id === activeClusterId) || { id: 'uncategorized', name: 'Uncategorized', color: '#6b7280' }
    : null

  const activeClusterLinks = activeClusterId
    ? mapLinks.filter(l => l.collectionId === activeClusterId || (activeClusterId === 'uncategorized' && !l.collectionId))
    : []

  if (mapError) {
    return <ErrorState message={mapError} onRetry={() => fetchAllLinks(true)} />
  }

  if (!mapLoaded) {
    return (
      <div className="space-loading-universe">
        <div className="space-loading-spinner" />
        <span>Synthesizing your knowledge universe…</span>
      </div>
    )
  }

  return (
    <div className="space-view-container">
      {/* 3D Background layer */}
      <div className="space-canvas-wrapper">
        <Suspense fallback={null}>
          <SpaceScene 
            mapLinks={mapLinks} 
            collections={collections}
            activeCluster={activeClusterId}
            setActiveCluster={setActiveClusterId}
            controlsRef={controlsRef}
            search={search}
          />
        </Suspense>
      </div>

      {/* 2D UI Overlay Layer */}
      <div className="space-ui-layer">
        
        {/* Floating Top HUD Bar */}
        <div className="space-hud-top">
          <div className="space-hud-left">
            <div className="space-hud-chip stats-chip">
              <IconLink size={15} />
              <span>{mapLinks.length} Links</span>
              <span className="hud-sep">·</span>
              <IconFolder size={15} />
              <span>{collections.length + 1} Clusters</span>
              {search && (
                <>
                  <span className="hud-sep">·</span>
                  <span className="hud-match-count">
                    Filter: "{search}"
                  </span>
                  <button 
                    className="hud-clear-search" 
                    onClick={() => setSearch('')}
                    title="Clear filter"
                    aria-label="Clear filter"
                  >
                    <IconX size={12} />
                  </button>
                </>
              )}
            </div>

            {/* Functional Cluster Selector Menu */}
            <Menu shadow="md" width={220} position="bottom-start">
              <Menu.Target>
                <button className="space-hud-chip cluster-select-btn" aria-label="Select collection cluster">
                  <span 
                    className="cluster-color-pip" 
                    style={{ background: activeCluster ? activeCluster.color : '#8b5cf6' }} 
                  />
                  <span>{activeCluster ? activeCluster.name : 'All Clusters'}</span>
                  <IconChevronDown size={14} />
                </button>
              </Menu.Target>

              <Menu.Dropdown className="space-menu-dropdown">
                <Menu.Item
                  onClick={() => setActiveClusterId(null)}
                  leftSection={<span className="cluster-color-pip" style={{ background: '#8b5cf6' }} />}
                >
                  All Clusters ({mapLinks.length})
                </Menu.Item>
                <Menu.Divider />
                {collections.map(c => (
                  <Menu.Item
                    key={c.id}
                    onClick={() => setActiveClusterId(c.id)}
                    leftSection={<span className="cluster-color-pip" style={{ background: c.color || '#3b82f6' }} />}
                  >
                    {c.name} ({c.count || mapLinks.filter(l => l.collectionId === c.id).length})
                  </Menu.Item>
                ))}
                <Menu.Item
                  onClick={() => setActiveClusterId('uncategorized')}
                  leftSection={<span className="cluster-color-pip" style={{ background: '#6b7280' }} />}
                >
                  Uncategorized ({mapLinks.filter(l => !l.collectionId).length})
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>

          <div className="space-hud-right">
            <button className="space-hud-btn" onClick={toggleVisual} title="Return to list view (Esc)">
              <IconLayoutGrid size={15} />
              <span>List View</span>
            </button>
          </div>
        </div>

        {/* Floating Camera Controls (Right) */}
        <div className="space-floating-controls">
          <button className="space-control-btn" title="Recenter universe" onClick={handleRecenter}>
            <IconFocusCentered size={19} />
          </button>
          <div className="space-control-sep" />
          <button className="space-control-btn" title="Zoom in" onClick={handleZoomIn}>
            <IconPlus size={19} />
          </button>
          <button className="space-control-btn" title="Zoom out" onClick={handleZoomOut}>
            <IconMinus size={19} />
          </button>
        </div>

        {/* Bottom Sheet Drawer for Selected Cluster */}
        <AnimatePresence>
          {activeCluster && (
            <>
              <motion.div 
                className="space-bottom-sheet-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveClusterId(null)}
              />
              <motion.div 
                className="space-bottom-sheet"
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              >
                <div className="space-sheet-handle" />
                <div className="space-sheet-header">
                  <div className="space-sheet-title-area">
                    <div className="space-sheet-icon" style={{ backgroundColor: `${activeCluster.color}33`, color: activeCluster.color }}>
                      <IconFolder size={22} />
                    </div>
                    <div>
                      <h2 className="space-sheet-title">{activeCluster.name}</h2>
                      <p className="space-sheet-subtitle">{activeClusterLinks.length} links in cluster</p>
                    </div>
                  </div>
                  <button className="space-sheet-close" onClick={() => setActiveClusterId(null)} aria-label="Close drawer">
                    <IconX size={20} />
                  </button>
                </div>
                
                <div className="space-sheet-grid">
                  {activeClusterLinks.map((link, idx) => {
                    const target = safeUrl(link.url)
                    const host = hostOf(link.url) || 'link'
                    const initial = (link.title || host || 'L')[0].toUpperCase()
                    const icon = faviconUrl(link.url)
                    
                    return (
                      <a 
                        key={link._id || idx} 
                        className="space-app-card" 
                        href={target || undefined} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        title={link.title || link.url}
                      >
                        <div className="space-app-icon" style={{ borderColor: `${activeCluster.color}44` }}>
                          {icon ? (
                            <img 
                              src={icon} 
                              alt="" 
                              loading="lazy" 
                              onError={(e) => { e.currentTarget.style.display = 'none' }} 
                            />
                          ) : null}
                          <span className="app-icon-fallback" style={{ background: activeCluster.color || '#8b5cf6' }}>
                            {initial}
                          </span>
                        </div>
                        <span className="app-card-title">{link.title || host.split('.')[0]}</span>
                        <IconExternalLink size={12} className="app-card-ext" />
                      </a>
                    )
                  })}
                  {activeClusterLinks.length === 0 && (
                    <div style={{ color: '#a0a5cc', fontSize: 13, padding: '20px 0' }}>No links in this collection.</div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Mobile-Only Bottom Navigation */}
        <nav className="space-bottom-nav">
          <button 
            className="space-nav-item" 
            onClick={() => {
              toggleVisual();
              setView({ type: 'dashboard' });
            }}
          >
            <div className="space-nav-icon-wrap">
              <IconHome size={20} />
            </div>
            <span>Home</span>
          </button>
          <button 
            className="space-nav-item"
            onClick={() => {
              toggleVisual();
              setView({ type: 'all' });
            }}
          >
            <div className="space-nav-icon-wrap">
              <IconGridDots size={20} />
            </div>
            <span>Collections</span>
          </button>
          <button className="space-nav-item active">
            <div className="space-nav-icon-wrap">
              <IconCube size={22} />
            </div>
            <span>3D View</span>
          </button>
          <button 
            className="space-nav-item"
            onClick={() => {
              toggleVisual();
              openProfile();
            }}
          >
            <div className="space-nav-icon-wrap">
              <IconSettings size={20} />
            </div>
            <span>Settings</span>
          </button>
        </nav>

      </div>
    </div>
  )
}
