import { useState } from 'react'
import { Button, Menu, Select, TextInput } from '@mantine/core'
import { IconBox, IconDownload, IconDotsVertical, IconLayoutGrid, IconMenu2, IconPlus, IconSearch, IconUpload } from '@tabler/icons-react'
import { useUiStore } from '../../store/uiStore'
import { linksApi } from '../../api/endpoints'
import ProfileDropdown from '../profile/ProfileDropdown'
import ImportLinksModal from '../ImportLinksModal'
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
]

function viewTitle(view) {
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
    default:
      return { title: 'All Links', subtitle: 'Everything you’ve saved' }
  }
}

export default function Topbar({ onMenu }) {
  const view = useUiStore((s) => s.view)
  const search = useUiStore((s) => s.search)
  const setSearch = useUiStore((s) => s.setSearch)
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
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      const { notifications } = await import('@mantine/notifications')
      notifications.show({ message: err.message || 'Export failed', color: 'red' })
    }
  }

  const { title, subtitle } = viewTitle(view)
  const showListControls = !['analytics', 'recentvisited', 'trash'].includes(view.type)
  const showSort = !['analytics', 'recentvisited', 'recentadded', 'trash'].includes(view.type)

  return (
    <header className="topbar">
      <button className="action-btn menu-btn" onClick={handleMenuClick} aria-label="Toggle menu">
        <IconMenu2 size={20} />
      </button>

      <div className="topbar-title">
        <h1 className="page-title">{title}</h1>
        <div className="page-subtitle">{subtitle}</div>
      </div>

      {showListControls && (
        <div className="topbar-controls">
          <TextInput
            className="search-input"
            placeholder="Search links, tags, URLs…"
            leftSection={<IconSearch size={15} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
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

      <div className="topbar-spacer" />

      {/* Desktop: labelled toggle */}
      <button className={`visual-toggle topbar-visual-desktop ${visualMode ? 'active' : ''}`} onClick={toggleVisual} title="Toggle visual view">
        {visualMode ? <IconLayoutGrid size={15} /> : <IconBox size={15} />}
        <span className="vt-label">{visualMode ? 'Grid View' : 'Visual View'}</span>
      </button>
      {/* Mobile: compact 3D toggle */}
      <button className={`visual-toggle topbar-visual-mobile ${visualMode ? 'active' : ''}`} onClick={toggleVisual} aria-label="Toggle visual view">
        {visualMode ? <IconLayoutGrid size={15} /> : <IconBox size={15} />}
        <span className="vt-label">{visualMode ? 'Grid' : '3D'}</span>
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