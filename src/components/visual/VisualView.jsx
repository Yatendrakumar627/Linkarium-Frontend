import React, { useEffect, useState, Suspense, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  IconMenu2, 
  IconLayoutGrid, 
  IconSearch, 
  IconAdjustmentsHorizontal, 
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
  IconSettings
} from '@tabler/icons-react'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import SpaceScene from './SpaceScene'
import './VisualView.css'

export default function VisualView() {
  const mapLinks = useLinkStore((s) => s.mapLinks)
  const mapLoaded = useLinkStore((s) => s.mapLoaded)
  const collections = useLinkStore((s) => s.collections)
  const fetchAllLinks = useLinkStore((s) => s.fetchAllLinks)
  
  const search = useUiStore((s) => s.search)
  const setSearch = useUiStore((s) => s.setSearch)
  const toggleVisual = useUiStore((s) => s.toggleVisual)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
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
    }
  }

  const handleZoomIn = () => {
    if (controlsRef.current) {
      const target = controlsRef.current.target
      const camera = controlsRef.current.object
      camera.position.lerp(target, 0.2) // move 20% closer
      controlsRef.current.update()
    }
  }

  const handleZoomOut = () => {
    if (controlsRef.current) {
      const target = controlsRef.current.target
      const camera = controlsRef.current.object
      // Move camera away from target
      const dir = camera.position.clone().sub(target)
      camera.position.add(dir.multiplyScalar(0.2)) // move 20% further
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

  if (!mapLoaded) {
    return <div style={{ color: '#fff', padding: 20 }}>Loading universe...</div>
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
          />
        </Suspense>
      </div>

      {/* 2D UI Overlay Layer */}
      <div className="space-ui-layer">
        
        {/* Header */}
        <header className="space-header">
          <div className="space-header-left">
            <button className="space-menu-btn" onClick={toggleSidebar}>
              <IconMenu2 size={24} />
            </button>
            <div className="space-header-titles">
              <h1 className="space-title">3D View</h1>
              <p className="space-subtitle">Explore your links by collections</p>
            </div>
          </div>
          <button className="space-toggle-btn" onClick={toggleVisual}>
            <IconLayoutGrid size={16} />
            List View
          </button>
        </header>

        {/* Top Controls: Search and Stats */}
        <div className="space-top-controls">
          <div className="space-search-row">
            <div className="space-search-box">
              <IconSearch size={18} color="#6b7280" />
              <input 
                type="text" 
                placeholder="Search links, tags, collections..." 
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
              />
            </div>
            <button className="space-filter-btn" title="Filters coming soon">
              <IconAdjustmentsHorizontal size={20} />
            </button>
          </div>
          
          <div className="space-stats-row">
            <div className="space-stats-cards">
              <div className="space-stat-card">
                <div className="space-stat-icon links">
                  <IconLink size={18} />
                </div>
                <div className="space-stat-text">
                  <span className="space-stat-value">{mapLinks.length}</span>
                  <span className="space-stat-label">Links</span>
                </div>
              </div>
              <div className="space-stat-card">
                <div className="space-stat-icon collections">
                  <IconFolder size={18} />
                </div>
                <div className="space-stat-text">
                  <span className="space-stat-value">{collections.length}</span>
                  <span className="space-stat-label">Collections</span>
                </div>
              </div>
            </div>
            
            <div className="space-cluster-dropdown">
              Clusters <IconChevronDown size={14} />
            </div>
          </div>
        </div>

        {/* Floating Controls (Right) */}
        <div className="space-floating-controls">
          <button className="space-control-btn" title="Recenter" onClick={handleRecenter}>
            <IconFocusCentered size={20} />
          </button>
          <div className="space-control-sep" />
          <button className="space-control-btn" title="Zoom In" onClick={handleZoomIn}>
            <IconPlus size={20} />
          </button>
          <button className="space-control-btn" title="Zoom Out" onClick={handleZoomOut}>
            <IconMinus size={20} />
          </button>
        </div>

        {/* Bottom Sheet Drawer */}
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
                      <IconFolder size={24} />
                    </div>
                    <div>
                      <h2 className="space-sheet-title">{activeCluster.name}</h2>
                      <p className="space-sheet-subtitle">{activeClusterLinks.length} links</p>
                    </div>
                  </div>
                  <button className="space-sheet-close" onClick={() => setActiveClusterId(null)}>
                    <IconX size={20} />
                  </button>
                </div>
                
                <div className="space-sheet-grid">
                  {activeClusterLinks.map((link, idx) => {
                    const host = link.url ? new URL(link.url).hostname.replace('www.', '') : 'link'
                    const isDarkIcon = host.includes('github') || host.includes('notion')
                    const initial = host[0].toUpperCase()
                    
                    return (
                      <a 
                        key={link._id || idx} 
                        className="space-app-card" 
                        href={link.url} 
                        target="_blank" 
                        rel="noreferrer"
                        title={link.title || link.url}
                      >
                        <div className={`space-app-icon ${isDarkIcon ? 'dark' : ''}`}>
                          {initial}
                        </div>
                        <span>{host.split('.')[0]}</span>
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

        {/* Bottom Navigation */}
        <nav className="space-bottom-nav">
          <button 
            className="space-nav-item" 
            onClick={() => {
              toggleVisual();
              setView({ type: 'dashboard' });
            }}
          >
            <div className="space-nav-icon-wrap">
              <IconHome size={22} />
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
              <IconGridDots size={22} />
            </div>
            <span>Collections</span>
          </button>
          <button className="space-nav-item active">
            <div className="space-nav-icon-wrap">
              <IconCube size={26} />
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
              <IconSettings size={22} />
            </div>
            <span>Settings</span>
          </button>
        </nav>

      </div>
    </div>
  )
}
