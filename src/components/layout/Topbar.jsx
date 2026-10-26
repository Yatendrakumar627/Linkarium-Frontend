import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Menu, Select } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconBox, IconDownload, IconDotsVertical, IconLayoutGrid, IconMenu2, IconPlus, IconUpload, IconCrown } from '@tabler/icons-react'
import { useUiStore } from '../../store/uiStore'
import { useAuthStore } from '../../store/authStore'
import { linksApi } from '../../api/endpoints'
import { downloadBlob } from '../../utils'
import ProfileDropdown from '../profile/ProfileDropdown'
import ImportLinksModal from '../ImportLinksModal'
import QuickSave from './QuickSave'
import SearchBox from '../common/SearchBox'
import ColorModeSelector from '../common/ColorModeSelector'
import './Topbar.css'

// Determines if we are on a mobile-sized viewport
function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth < 768
}

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'visits', label: 'Most visited' },
  { value: 'favorite', label: 'Favorites first' },
  { value: 'name', label: 'Name (A–Z)' },
]

function viewTitle(view, visualMode) {
  if (visualMode) {
    return { title: '3D Universe', subtitle: 'Spatial view of your links & collections' }
  }
  switch (view.type) {
    case 'dashboard':
      return { title: 'Dashboard', subtitle: 'Your digital space is organized.' }
    case 'favorites':
      return { title: 'Favorites', subtitle: 'Hand-picked highlights' }
    case 'collection':
      return { title: view.label || 'Collection', subtitle: 'Links in this collection' }
    case 'tag':
      return { title: `#${view.label}`, subtitle: 'Links with this tag' }
    case 'recentadded':
      return { title: 'Recently Added', subtitle: 'Your newest saves' }
    case 'recentvisited':
      return { title: 'Recently Visited', subtitle: 'Where you’ve been lately' }
    case 'analytics':
      return { title: 'Analytics', subtitle: 'Insights on your universe' }
    case 'trash':
      return { title: 'Trash', subtitle: 'Links are permanently deleted after 7 days' }
    case 'archived':
      return { title: 'Archive', subtitle: 'Links you put away — hidden from every other view' }
    case 'broken':
      return { title: 'Broken Links', subtitle: 'Links that no longer answer' }
    case 'stale':
      return { title: 'Stale Links', subtitle: 'Not checked in the last 30 days' }
    case 'readable':
      return { title: 'Readable', subtitle: 'Links whose text could be extracted' }
    case 'savedview':
      return { title: view.label || 'Saved View', subtitle: 'A saved search' }
    case 'duplicates':
      return { title: 'Duplicates', subtitle: 'Links that point at the same thing' }
    case 'resurface':
      return { title: 'Resurface', subtitle: 'Worth looking at again' }
    default:
      return { title: 'All Links', subtitle: 'Everything you’ve saved' }
  }
}

export default function Topbar({ onMenu }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const view = useUiStore((s) => s.view)
  const sort = useUiStore((s) => s.sort)
  const setSort = useUiStore((s) => s.setSort)
  const visualMode = useUiStore((s) => s.visualMode)
  const toggleVisual = useUiStore((s) => s.toggleVisual)
  const openEditor = useUiStore((s) => s.openEditor)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)

  const [importOpened, setImportOpened] = useState(false)

  // On mobile: open the overlay drawer via onMenu prop
  // On desktop: toggle the sidebar collapsed state via the store
  const handleMenuClick = () => {
    if (isMobile()) {
      onMenu?.()
    } else {
      toggleSidebar()
    }
  }

  const handleExport = async (format) => {
    try {
      const { blob, filename } = await linksApi.export(format)
      downloadBlob(blob, filename)
    } catch (err) {
      notifications.show({ message: err.message || 'Export failed', color: 'red' })
    }
  }

  const { title, subtitle } = viewTitle(view, visualMode)
  const showListControls = !['analytics', 'recentvisited', 'trash', 'duplicates', 'resurface'].includes(view.type)
  const showSort = !visualMode && !['analytics', 'recentvisited', 'recentadded', 'trash', 'duplicates', 'resurface'].includes(view.type)

  return (
    <header className="topbar">
      <button className="action-btn menu-btn" onClick={handleMenuClick} aria-label="Toggle menu">
        <IconMenu2 size={20} />
      </button>

      <div className="topbar-title">
        <h1 className="page-title">{title}</h1>
        {subtitle && !['dashboard', 'all'].includes(view.type) && !visualMode && (
          <div className="page-subtitle">{subtitle}</div>
        )}
      </div>

      {showListControls && (
        <div className="topbar-controls">
          <SearchBox placeholder={visualMode ? 'Search 3D universe…' : 'Search links, tags…'} />
          <ColorModeSelector />
          {showSort && (
            <Select
              className="topbar-sort"
              data={SORTS}
              value={sort}
              onChange={(v) => v && setSort(v)}
              aria-label="Sort"
            />
          )}
        </div>
      )}

      <QuickSave />

      <div className="topbar-spacer" />

      {/* Desktop: visual toggle */}
      <button 
        className={`visual-toggle topbar-visual-desktop ${visualMode ? 'active' : ''}`} 
        onClick={toggleVisual} 
        title={visualMode ? "Return to list view (Esc)" : "Switch to 3D Universe"}
        aria-label="Toggle visual view"
      >
        {visualMode ? <IconLayoutGrid size={15} /> : <IconBox size={15} />}
        <span className="visual-toggle-label">{visualMode ? 'List View' : '3D View'}</span>
      </button>
      {/* Mobile: compact 3D toggle */}
      <button className={`visual-toggle topbar-visual-mobile ${visualMode ? 'active' : ''}`} onClick={toggleVisual} aria-label="Toggle visual view">
        {visualMode ? <IconLayoutGrid size={15} /> : <IconBox size={15} />}
      </button>

      {/* Desktop: New Link */}
      <Button
        className="topbar-new-link gradient-btn topbar-newlink-desktop"
        leftSection={<IconPlus size={16} />}
        onClick={() => openEditor(null)}
        aria-label="New link"
      >
        <span className="new-link-label">New Link</span>
      </Button>
      {/* Mobile: add link */}
      <Button
        className="topbar-new-link gradient-btn topbar-newlink-mobile"
        leftSection={<IconPlus size={16} />}
        onClick={() => openEditor(null)}
        aria-label="Add link"
      >
        <span className="new-link-label">add link</span>
      </Button>

      <div className="topbar-right">
        {user?.role === 'admin' && (
          <Button
            size="xs"
            variant="light"
            color="orange"
            leftSection={<IconCrown size={15} color="#f59e0b" />}
            onClick={() => navigate('/admin')}
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fbbf24',
              fontWeight: 600,
            }}
          >
            Admin Panel
          </Button>
        )}

        <div className="more-wrap">
          <Menu shadow="md" width={196} position="bottom-end">
            <Menu.Target>
              <button className="topbar-icon-btn topbar-more" aria-label="More options" title="Import & export">
                <IconDotsVertical size={18} />
              </button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconUpload size={14} />} onClick={() => setImportOpened(true)}>
                Import links
              </Menu.Item>
              <Menu.Item leftSection={<IconDownload size={14} />} onClick={() => handleExport('xlsx')}>
                Export as Excel
              </Menu.Item>
              <Menu.Item leftSection={<IconDownload size={14} />} onClick={() => handleExport('csv')}>
                Export as CSV
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </div>

        <ProfileDropdown />
      </div>

      <ImportLinksModal opened={importOpened} onClose={() => setImportOpened(false)} />
    </header>
  )
}