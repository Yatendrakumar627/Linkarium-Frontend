import {
  IconArrowRight,
  IconChartBar,
  IconClock,
  IconFolder,
  IconHistory,
  IconLayoutDashboard,
  IconLayoutSidebarLeftExpand,
  IconPencil,
  IconPlus,
  IconStar,
  IconStack2,
  IconTrash,
  IconChevronDown,
  IconChevronRight,
} from '@tabler/icons-react'
import { useState } from 'react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import './Sidebar.css'

export default function Sidebar({ open, collapsed = false, onNavigate, onMouseEnter, onMouseLeave }) {
  const summary = useLinkStore((s) => s.summary)
  const collections = useLinkStore((s) => s.collections)
  const tags = useLinkStore((s) => s.tags)
  const removeCollection = useLinkStore((s) => s.removeCollection)
  const view = useUiStore((s) => s.view)
  const setView = useUiStore((s) => s.setView)
  const openCollectionEditor = useUiStore((s) => s.openCollectionEditor)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)

  const [navOpen, setNavOpen] = useState(true)
  const [collectionsOpen, setCollectionsOpen] = useState(true)
  const [tagsOpen, setTagsOpen] = useState(true)

  const go = (v) => {
    setView(v)
    onNavigate?.()
  }

  const navItems = [
    { type: 'dashboard', label: 'Dashboard', icon: IconLayoutDashboard },
    { type: 'all', label: 'All Links', icon: IconStack2, count: summary?.totalLinks ?? '' },
    { type: 'favorites', label: 'Favorites', icon: IconStar, count: summary?.favoriteLinks ?? '' },
    { type: 'recentadded', label: 'Recently Added', icon: IconClock },
    { type: 'recentvisited', label: 'Recently Visited', icon: IconHistory },
    { type: 'analytics', label: 'Analytics', icon: IconChartBar },
    { type: 'trash', label: 'Trash', icon: IconTrash, count: summary?.trashCount ?? '' },
  ]

  const handleDeleteCollection = (c) => {
    modals.openConfirmModal({
      title: 'Delete collection?',
      children: `"${c.name}" will be removed. Its links are kept but moved to "No collection".`,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await removeCollection(c.id)
          if (view.type === 'collection' && view.id === c.id) go({ type: 'all' })
          notifications.show({ message: 'Collection deleted', color: 'green' })
        } catch (err) {
          notifications.show({ message: err.message, color: 'red' })
        }
      },
    })
  }

  return (
    <aside
      className={`sidebar ${open ? 'open' : ''} ${collapsed ? 'sidebar-collapsed' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-mark">
          <IconArrowRight size={20} stroke={2.5} />
        </div>
        <span className="sidebar-brand-name">Linkarium</span>
        {collapsed && (
          <button
            className="action-btn sidebar-rail-toggle"
            onClick={toggleSidebar}
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <IconLayoutSidebarLeftExpand size={16} />
          </button>
        )}
      </div>

      {/* Scrollable middle content */}
      <div className="sidebar-scroll">
        {/* Nav */}
        <div
          className="section-label section-label-head sidebar-section-toggle"
          onClick={() => setNavOpen(!navOpen)}
        >
          <div className="sidebar-section-title">
            {navOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            Main Menu
          </div>
        </div>
        {navOpen && (
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const active = view.type === item.type
              return (
                <div
                  key={item.type}
                  className={`nav-item ${active ? 'active' : ''}`}
                  onClick={() => go({ type: item.type })}
                  title={item.label}
                  aria-label={item.label}
                >
                  <item.icon size={17} />
                  <span className="nav-label">{item.label}</span>
                  {item.count !== undefined && <span className="nav-count">{item.count}</span>}
                </div>
              )
            })}
          </nav>
        )}

        {/* Collections */}
        <div
          className="section-label section-label-head sidebar-section-toggle"
          onClick={() => setCollectionsOpen(!collectionsOpen)}
        >
          <div className="sidebar-section-title">
            {collectionsOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            Collections
          </div>
          <button
            className="action-btn nav-action-btn"
            onClick={(e) => {
              e.stopPropagation()
              openCollectionEditor({ mode: 'create' })
            }}
            aria-label="New collection"
          >
            <IconPlus size={15} />
          </button>
        </div>
        {collectionsOpen && (
          <div className="sidebar-collections">
            {collections.length === 0 && (
              <div className="sidebar-collections-empty">Nothing yet — create one.</div>
            )}
            {collections.map((c) => {
              const active = view.type === 'collection' && view.id === c.id
              return (
                <div
                  key={c.id}
                  className={`nav-item ${active ? 'active' : ''}`}
                  onClick={() => go({ type: 'collection', id: c.id, label: c.name })}
                  title={c.name}
                  aria-label={c.name}
                >
                  <span
                    className="collection-dot"
                    style={{ background: c.color || '#8b5cf6', boxShadow: `0 0 10px ${c.color || '#8b5cf6'}55` }}
                  />
                  <span className="nav-label">{c.name}</span>
                  <span className="nav-count">{c.count}</span>
                  <button
                    type="button"
                    className="action-btn collection-edit"
                    onClick={(e) => {
                      e.stopPropagation()
                      openCollectionEditor({ mode: 'edit', collection: c })
                    }}
                    title="Edit collection"
                    aria-label={`Edit ${c.name}`}
                  >
                    <IconPencil size={12} />
                  </button>
                  <button
                    type="button"
                    className="action-btn danger collection-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteCollection(c)
                    }}
                    title="Delete collection"
                    aria-label={`Delete ${c.name}`}
                  >
                    <IconTrash size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Tags */}
        <div
          className="section-label section-label-head sidebar-section-toggle"
          onClick={() => setTagsOpen(!tagsOpen)}
        >
          <div className="sidebar-section-title">
            {tagsOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            Tags
          </div>
        </div>
        {tagsOpen && (
          tags.length > 0 ? (
            <div className="sidebar-tags">
              {tags.map((t) => {
                const active = view.type === 'tag' && view.id === t.tag
                return (
                  <div
                    key={t.tag}
                    className={`nav-item ${active ? 'active' : ''}`}
                    onClick={() => go({ type: 'tag', id: t.tag, label: t.tag })}
                    title={`#${t.tag}`}
                    aria-label={`Tag ${t.tag}`}
                  >
                    <IconFolder size={15} className="sidebar-tag-icon" />
                    <span className="nav-label">#{t.tag}</span>
                    <span className="nav-count">{t.count}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="sidebar-collections-empty">Tags appear when you tag a link.</div>
          )
        )}
      </div>
    </aside>
  )
}