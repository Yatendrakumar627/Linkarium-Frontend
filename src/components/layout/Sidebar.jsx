import {
  IconArrowRight,
  IconChartBar,
  IconClock,
  IconCopy,
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
  IconArchive,
  IconAlertTriangle,
  IconRefresh,
  IconFlame,
  IconPlayerPlay,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import { useSavedViewStore } from '../../store/savedViewStore'
import { iconFor } from '../../utils/icons'
import './Sidebar.css'

export default function Sidebar({ open, collapsed = false, onNavigate, onMouseEnter, onMouseLeave }) {
  const summary = useLinkStore((s) => s.summary)
  const collections = useLinkStore((s) => s.collections)
  const tags = useLinkStore((s) => s.tags)
  const health = useLinkStore((s) => s.health)
  const removeCollection = useLinkStore((s) => s.removeCollection)
  const view = useUiStore((s) => s.view)
  const setView = useUiStore((s) => s.setView)
  const setSearch = useUiStore((s) => s.setSearch)
  const openCollectionEditor = useUiStore((s) => s.openCollectionEditor)
  const openSavedViewEditor = useUiStore((s) => s.openSavedViewEditor)
  const openRuleEditor = useUiStore((s) => s.openRuleEditor)
  const openTagWebsitesModal = useUiStore((s) => s.openTagWebsitesModal)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)

  const savedViews = useSavedViewStore((s) => s.views)
  const rules = useSavedViewStore((s) => s.rules)
  const fetchSavedViews = useSavedViewStore((s) => s.fetch)
  const removeSavedView = useSavedViewStore((s) => s.remove)
  const runRule = useSavedViewStore((s) => s.run)

  const [navOpen, setNavOpen] = useState(true)
  const [collectionsOpen, setCollectionsOpen] = useState(true)
  const [tagsOpen, setTagsOpen] = useState(true)
  const [viewsOpen, setViewsOpen] = useState(true)
  const [rulesOpen, setRulesOpen] = useState(true)

  useEffect(() => {
    fetchSavedViews()
  }, [fetchSavedViews])

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
  ]

  // The "tidying" section — the views that help the user clean up.
  const tidyItems = [
    { type: 'archived', label: 'Archive', icon: IconArchive, count: health?.archived ?? '' },
    { type: 'broken', label: 'Broken Links', icon: IconAlertTriangle, count: health?.broken ?? '' },
    { type: 'stale', label: 'Stale Links', icon: IconRefresh, count: health?.stale ?? '' },
    { type: 'duplicates', label: 'Duplicates', icon: IconCopy },
    { type: 'resurface', label: 'Resurface', icon: IconFlame },
    { type: 'trash', label: 'Trash', icon: IconTrash, count: summary?.trashCount ?? '' },
  ]

  const handleDeleteSavedView = (v) => {
    const isRule = v.kind === 'rule'
    modals.openConfirmModal({
      title: isRule ? 'Delete rule?' : 'Delete saved view?',
      children: isRule
        ? `"${v.name}" will be removed. The links it already changed are not affected.`
        : `"${v.name}" will be removed. The links it matched are not affected.`,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await removeSavedView(v._id)
          if (view.type === 'savedview' && view.id === v._id) go({ type: 'all' })
          notifications.show({ message: isRule ? 'Rule deleted' : 'Saved view deleted', color: 'green' })
        } catch (err) {
          notifications.show({ message: err.message, color: 'red' })
        }
      },
    })
  }

  // A saved view carries its own query. The search box is set as well so
  // there is a single source of truth: clearing the box keeps the view's
  // filter, and the user can edit it in place.
  const handleSelectSavedView = (v) => {
    setSearch(v.query || '')
    go({ type: 'savedview', id: v._id, label: v.name, query: v.query || '' })
  }

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

        {/* Tidy up — the views that help the user keep the library clean. */}
        <div className="section-label section-label-head sidebar-section-toggle">
          <div className="sidebar-section-title">
            <IconChevronRight size={14} />
            Tidy Up
          </div>
        </div>
        <nav className="sidebar-nav">
          {tidyItems.map((item) => {
            const active = view.type === item.type
            return (
              <div
                key={item.type}
                className={`nav-item ${active ? ' active' : ''}`}
                onClick={() => go({ type: item.type })}
                title={item.label}
                aria-label={item.label}
              >
                <item.icon size={17} />
                <span className="nav-label">{item.label}</span>
                {item.count !== undefined && item.count !== '' && (
                  <span className="nav-count">{item.count}</span>
                )}
              </div>
            )
          })}
        </nav>

        {/* Saved views */}
        <div
          className="section-label section-label-head sidebar-section-toggle"
          onClick={() => setViewsOpen(!viewsOpen)}
        >
          <div className="sidebar-section-title">
            {viewsOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            Saved Views
          </div>
          <button
            className="action-btn nav-action-btn"
            onClick={(e) => {
              e.stopPropagation()
              openSavedViewEditor({ mode: 'create' })
            }}
            aria-label="New saved view"
            title="New saved view"
          >
            <IconPlus size={15} />
          </button>
        </div>
        {viewsOpen && (
          <div className="sidebar-collections">
            {savedViews.length === 0 && (
              <div className="sidebar-collections-empty">
                Save a search to see it here.
              </div>
            )}
            {savedViews.map((v) => {
              const ViewIcon = iconFor(v.icon)
              const active = view.type === 'savedview' && view.id === v._id
              return (
                <div
                  key={v._id}
                  className={`nav-item ${active ? ' active' : ''}`}
                  onClick={() => handleSelectSavedView(v)}
                  title={v.query || v.name}
                  aria-label={v.name}
                >
                  <ViewIcon
                    size={15}
                    style={{ color: v.color || '#8b5cf6' }}
                    className="sidebar-tag-icon"
                  />
                  <span className="nav-label">{v.name}</span>
                  <button
                    type="button"
                    className="action-btn collection-edit"
                    onClick={(e) => {
                      e.stopPropagation()
                      openSavedViewEditor({ mode: 'edit', view: v })
                    }}
                    title="Edit saved view"
                    aria-label={`Edit ${v.name}`}
                  >
                    <IconPencil size={12} />
                  </button>
                  <button
                    type="button"
                    className="action-btn danger collection-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSavedView(v)
                    }}
                    title="Delete saved view"
                    aria-label={`Delete ${v.name}`}
                  >
                    <IconTrash size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Automation rules */}
        <div
          className="section-label section-label-head sidebar-section-toggle"
          onClick={() => setRulesOpen(!rulesOpen)}
        >
          <div className="sidebar-section-title">
            {rulesOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            Rules
          </div>
          <button
            className="action-btn nav-action-btn"
            onClick={(e) => {
              e.stopPropagation()
              openRuleEditor({ mode: 'create' })
            }}
            aria-label="New rule"
            title="New rule"
          >
            <IconPlus size={15} />
          </button>
        </div>
        {rulesOpen && (
          <div className="sidebar-collections">
            {rules.length === 0 && (
              <div className="sidebar-collections-empty">
                Rules tidy your library automatically.
              </div>
            )}
            {rules.map((rule) => {
              const RuleIcon = iconFor(rule.icon)
              return (
                <div
                  key={rule._id}
                  className="nav-item"
                  title={rule.query || rule.name}
                  aria-label={rule.name}
                >
                  <RuleIcon
                    size={15}
                    style={{ color: rule.color || '#8b5cf6' }}
                    className="sidebar-tag-icon"
                  />
                  <span className="nav-label">{rule.name}</span>
                  <button
                    type="button"
                    className="action-btn collection-edit"
                    onClick={async (e) => {
                      e.stopPropagation()
                      try {
                        const { result } = await runRule(rule._id, true)
                        notifications.show({
                          message: `${result?.matched ?? 0} link(s) match this rule`,
                          color: 'violet',
                        })
                      } catch (err) {
                        notifications.show({ message: err.message, color: 'red' })
                      }
                    }}
                    title="Run this rule now"
                    aria-label={`Run ${rule.name}`}
                  >
                    <IconPlayerPlay size={12} />
                  </button>
                  <button
                    type="button"
                    className="action-btn collection-edit"
                    onClick={(e) => {
                      e.stopPropagation()
                      openRuleEditor({ mode: 'edit', rule })
                    }}
                    title="Edit rule"
                    aria-label={`Edit ${rule.name}`}
                  >
                    <IconPencil size={12} />
                  </button>
                  <button
                    type="button"
                    className="action-btn danger collection-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSavedView(rule)
                    }}
                    title="Delete rule"
                    aria-label={`Delete ${rule.name}`}
                  >
                    <IconTrash size={12} />
                  </button>
                </div>
              )
            })}
          </div>
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
          <button
            className="action-btn nav-action-btn"
            onClick={(e) => {
              e.stopPropagation()
              openTagWebsitesModal()
            }}
            aria-label="Add websites to tag"
            title="Add websites to tag"
          >
            <IconPlus size={15} />
          </button>
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
                    <button
                      type="button"
                      className="action-btn collection-edit"
                      onClick={(e) => {
                        e.stopPropagation()
                        openTagWebsitesModal(t.tag)
                      }}
                      title={`Add websites to #${t.tag}`}
                      aria-label={`Add websites to #${t.tag}`}
                    >
                      <IconPlus size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div
              className="sidebar-collections-empty"
              style={{ cursor: 'pointer' }}
              onClick={() => openTagWebsitesModal()}
            >
              Nothing yet — click + to add websites to a tag.
            </div>
          )
        )}
      </div>
    </aside>
  )
}