import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  IconSearch,
  IconArrowRight,
  IconBox,
  IconStar,
  IconPlus,
  IconFolder,
  IconClock,
  IconEye,
  IconChartBar,
  IconTrash,
  IconFileSpreadsheet,
  IconFileTypeCsv,
  IconSparkles,
  IconKeyboard,
  IconCopy,
  IconCheck,
  IconEdit,
  IconX,
  IconWorld,
  IconBookmark,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import { useSavedViewStore } from '../../store/savedViewStore'
import { linksApi } from '../../api/endpoints'
import { hostOf, faviconUrl, safeUrl, downloadBlob } from '../../utils'
import './CommandPalette.css'

export default function CommandPalette() {
  const isOpen = useUiStore((s) => s.commandPaletteOpen)
  const closePalette = useUiStore((s) => s.closeCommandPalette)
  const setView = useUiStore((s) => s.setView)
  const setSearch = useUiStore((s) => s.setSearch)
  const visualMode = useUiStore((s) => s.visualMode)
  const toggleVisual = useUiStore((s) => s.toggleVisual)
  const openEditor = useUiStore((s) => s.openEditor)
  const openTriage = useUiStore((s) => s.openTriage)
  const openShortcuts = useUiStore((s) => s.openShortcuts)

  const savedViews = useSavedViewStore((s) => s.views)

  const collections = useLinkStore((s) => s.collections)
  const mapLinks = useLinkStore((s) => s.mapLinks)
  const links = useLinkStore((s) => s.links)
  const mapLoaded = useLinkStore((s) => s.mapLoaded)
  const fetchAllLinks = useLinkStore((s) => s.fetchAllLinks)
  const recordVisit = useLinkStore((s) => s.recordVisit)

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [copiedId, setCopiedId] = useState(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Fetch all links once when palette opens if not already loaded
  useEffect(() => {
    if (isOpen) {
      if (!mapLoaded) fetchAllLinks()
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [isOpen, mapLoaded, fetchAllLinks])

  // Pool of all available links (mapLinks up to 1000 or fallback to regular links)
  const allBookmarks = useMemo(() => {
    return mapLinks && mapLinks.length > 0 ? mapLinks : links
  }, [mapLinks, links])

  // Base navigation and action items
  const staticItems = useMemo(() => {
    return [
      {
        id: 'action-new',
        type: 'action',
        category: 'Quick Actions',
        title: 'New Bookmark',
        subtitle: 'Create and save a new link',
        icon: IconPlus,
        color: '#6366f1',
        action: () => openEditor(null),
      },
      {
        id: 'action-triage',
        type: 'action',
        category: 'Quick Actions',
        title: 'Smart Triage & Auto-Group',
        subtitle: 'Organize uncategorized links by domain in 1 click',
        icon: IconSparkles,
        color: '#10b981',
        badge: 'Inbox Zero',
        action: () => openTriage(),
      },
      {
        id: 'nav-dashboard',
        type: 'nav',
        category: 'Views & Navigation',
        title: 'Dashboard',
        subtitle: 'Overview, stats & recent activity',
        icon: IconWorld,
        action: () => {
          if (visualMode) toggleVisual()
          setView({ type: 'dashboard' })
        },
      },
      {
        id: 'nav-3d',
        type: 'nav',
        category: 'Views & Navigation',
        title: visualMode ? 'Exit 3D Universe' : 'Launch 3D Galaxy Universe',
        subtitle: 'Explore links across spatial celestial orbits',
        icon: IconBox,
        color: '#06b6d4',
        action: () => toggleVisual(),
      },
      {
        id: 'nav-favorites',
        type: 'nav',
        category: 'Views & Navigation',
        title: 'Favorites',
        subtitle: 'Starred priority bookmarks',
        icon: IconStar,
        color: '#f59e0b',
        action: () => {
          if (visualMode) toggleVisual()
          setView({ type: 'favorites' })
        },
      },
      {
        id: 'nav-recent-added',
        type: 'nav',
        category: 'Views & Navigation',
        title: 'Recently Added',
        subtitle: 'Latest saved bookmarks',
        icon: IconClock,
        action: () => {
          if (visualMode) toggleVisual()
          setView({ type: 'recentadded' })
        },
      },
      {
        id: 'nav-recent-visited',
        type: 'nav',
        category: 'Views & Navigation',
        title: 'Recently Visited',
        subtitle: 'Links you opened recently',
        icon: IconEye,
        action: () => {
          if (visualMode) toggleVisual()
          setView({ type: 'recentvisited' })
        },
      },
      {
        id: 'nav-analytics',
        type: 'nav',
        category: 'Views & Navigation',
        title: 'Analytics & Insights',
        subtitle: 'Growth charts, domain breakdown & telemetry',
        icon: IconChartBar,
        action: () => {
          if (visualMode) toggleVisual()
          setView({ type: 'analytics' })
        },
      },
      {
        id: 'nav-trash',
        type: 'nav',
        category: 'Views & Navigation',
        title: 'Trash',
        subtitle: 'Recover or permanently erase deleted bookmarks',
        icon: IconTrash,
        action: () => {
          if (visualMode) toggleVisual()
          setView({ type: 'trash' })
        },
      },
      {
        id: 'action-shortcuts',
        type: 'action',
        category: 'Quick Actions',
        title: 'Keyboard Shortcuts',
        subtitle: 'View pro hotkeys cheat sheet (?)',
        icon: IconKeyboard,
        action: () => openShortcuts(),
      },
      {
        id: 'action-export-xlsx',
        type: 'action',
        category: 'Quick Actions',
        title: 'Export to Excel (.xlsx)',
        subtitle: 'Download complete backup with metadata',
        icon: IconFileSpreadsheet,
        action: async () => {
          try {
            const { blob, filename } = await linksApi.export('xlsx')
            downloadBlob(blob, filename)
          } catch (err) {
            notifications.show({ message: err.message || 'Export failed', color: 'red' })
          }
        },
      },
      {
        id: 'action-export-csv',
        type: 'action',
        category: 'Quick Actions',
        title: 'Export to CSV',
        subtitle: 'Download tabular raw bookmarks',
        icon: IconFileTypeCsv,
        action: async () => {
          try {
            const { blob, filename } = await linksApi.export('csv')
            downloadBlob(blob, filename)
          } catch (err) {
            notifications.show({ message: err.message || 'Export failed', color: 'red' })
          }
        },
      },
    ]
  }, [openEditor, openTriage, openShortcuts, visualMode, toggleVisual, setView])

  // Collection items
  const collectionItems = useMemo(() => {
    return (collections || []).map((col) => {
      const cid = col.id || col._id
      const count = col.count ?? col.linkCount ?? 0
      return {
        id: `col-${cid}`,
        type: 'collection',
        category: 'Collections',
        title: col.name,
        subtitle: `${count} bookmark${count === 1 ? '' : 's'}`,
        icon: IconFolder,
        color: col.color || '#6366f1',
        action: () => {
          if (visualMode) toggleVisual()
          setView({ type: 'collection', id: cid, label: col.name })
        },
      }
    })
  }, [collections, visualMode, toggleVisual, setView])

  // Saved view items
  const savedViewItems = useMemo(() => {
    return (savedViews || []).map((sv) => ({
      id: `sv-${sv._id}`,
      type: 'savedview',
      category: 'Saved Views',
      title: sv.name,
      subtitle: sv.query ? `Query: ${sv.query}` : 'Custom view',
      icon: IconBookmark,
      color: sv.color || '#8b5cf6',
      action: () => {
        if (visualMode) toggleVisual()
        setSearch(sv.query || '')
        setView({ type: 'savedview', id: sv._id, label: sv.name, query: sv.query })
      },
    }))
  }, [savedViews, visualMode, toggleVisual, setSearch, setView])

  // Filtered matching items
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      // Empty query: Show high-value actions, views, and collections
      return [...staticItems, ...savedViewItems, ...collectionItems]
    }

    // Match static and collections
    const matchedStatic = staticItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    )

    const matchedSavedViews = savedViewItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    )

    const matchedCollections = collectionItems.filter((item) =>
      item.title.toLowerCase().includes(q)
    )

    // Match bookmarks
    const matchedBookmarks = allBookmarks
      .filter((link) => {
        const titleMatch = link.title?.toLowerCase().includes(q)
        const urlMatch = link.url?.toLowerCase().includes(q)
        const tagMatch = link.tags?.some((t) => t.toLowerCase().includes(q))
        const noteMatch = link.note?.toLowerCase().includes(q)
        const descMatch = link.description?.toLowerCase().includes(q)
        return titleMatch || urlMatch || tagMatch || noteMatch || descMatch
      })
      .slice(0, 30) // Cap to 30 for crisp instant rendering
      .map((link) => {
        const host = hostOf(link.url)
        const col = collections.find((c) => c.id === link.collectionId)
        return {
          id: `link-${link._id}`,
          type: 'link',
          category: 'Bookmarks',
          title: link.title || host,
          subtitle: link.url,
          host,
          rawLink: link,
          collectionName: col?.name,
          collectionColor: col?.color,
          favorite: link.favorite,
          action: () => {
            recordVisit(link)
            const safe = safeUrl(link.url)
            if (safe) window.open(safe, '_blank', 'noopener,noreferrer')
          },
        }
      })

    return [...matchedBookmarks, ...matchedSavedViews, ...matchedStatic, ...matchedCollections]
  }, [query, staticItems, savedViewItems, collectionItems, allBookmarks, collections, recordVisit])

  // Derive active index safely within bounds
  const safeActiveIndex = Math.min(activeIndex, Math.max(0, filteredItems.length - 1))

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('.cmd-item.active')
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [safeActiveIndex])

  const handleClose = useCallback(() => {
    setQuery('')
    setActiveIndex(0)
    closePalette()
  }, [closePalette])

  const executeItem = useCallback(
    (item) => {
      if (!item) return
      handleClose()
      item.action()
    },
    [handleClose]
  )

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredItems[safeActiveIndex]) {
        executeItem(filteredItems[safeActiveIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleClose()
    }
  }

  const handleCopyLink = (e, link) => {
    e.stopPropagation()
    if (!link?.url) return
    navigator.clipboard?.writeText(link.url).then(() => {
      setCopiedId(link._id)
      setTimeout(() => setCopiedId(null), 1800)
      notifications.show({ message: 'URL copied to clipboard', color: 'teal', autoClose: 1800 })
    })
  }

  const handleEditLink = (e, link) => {
    e.stopPropagation()
    handleClose()
    openEditor(link)
  }

  if (!isOpen) return null

  return (
    <div className="cmd-overlay" onClick={handleClose} role="presentation">
      <div
        className="cmd-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        <div className="cmd-header">
          <IconSearch size={18} className="cmd-search-icon" />
          <input
            ref={inputRef}
            className="cmd-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search bookmarks..."
            aria-label="Search or command"
          />
          {query ? (
            <button
              className="cmd-clear-btn"
              onClick={() => {
                setQuery('')
                setActiveIndex(0)
                inputRef.current?.focus()
              }}
              title="Clear"
            >
              <IconX size={15} />
            </button>
          ) : (
            <kbd className="cmd-esc-badge">ESC</kbd>
          )}
        </div>

        <div className="cmd-list" ref={listRef} role="listbox">
          {filteredItems.length === 0 ? (
            <div className="cmd-empty">
              <span className="cmd-empty-title">No matching bookmarks or commands</span>
              <span className="cmd-empty-sub">
                Try searching for something else or press <kbd>ESC</kbd> to exit.
              </span>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isActive = idx === safeActiveIndex
              const isLink = item.type === 'link'
              const Icon = item.icon

              return (
                <div
                  key={item.id}
                  className={`cmd-item ${isActive ? 'active' : ''} cmd-${item.type}`}
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  role="option"
                  aria-selected={isActive}
                >
                  <div className="cmd-item-left">
                    {isLink ? (
                      <div className="cmd-favicon-box">
                        <img
                          src={faviconUrl(item.rawLink.url)}
                          alt=""
                          className="cmd-favicon"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                        <IconWorld size={14} className="cmd-favicon-fallback" />
                      </div>
                    ) : (
                      <div
                        className="cmd-icon-box"
                        style={{ color: item.color || 'var(--accent-glow)' }}
                      >
                        <Icon size={16} />
                      </div>
                    )}

                    <div className="cmd-item-text">
                      <div className="cmd-item-title-row">
                        <span className="cmd-item-title">{item.title}</span>
                        {item.badge && <span className="cmd-badge">{item.badge}</span>}
                        {item.favorite && (
                          <span className="cmd-star-indicator" title="Favorite">
                            <IconStar size={11} fill="#f59e0b" color="#f59e0b" />
                          </span>
                        )}
                        {item.collectionName && (
                          <span
                            className="cmd-col-tag"
                            style={{
                              borderColor: `${item.collectionColor || '#6366f1'}44`,
                              color: item.collectionColor || '#a5b4fc',
                            }}
                          >
                            <span
                              className="cmd-col-pip"
                              style={{ backgroundColor: item.collectionColor || '#6366f1' }}
                            />
                            {item.collectionName}
                          </span>
                        )}
                      </div>
                      <span className="cmd-item-sub">{item.subtitle}</span>
                    </div>
                  </div>

                  <div className="cmd-item-right">
                    {isLink ? (
                      <div className="cmd-link-actions">
                        <button
                          className="cmd-action-pill"
                          title="Copy URL"
                          onClick={(e) => handleCopyLink(e, item.rawLink)}
                        >
                          {copiedId === item.rawLink._id ? (
                            <IconCheck size={13} color="#10b981" />
                          ) : (
                            <IconCopy size={13} />
                          )}
                        </button>
                        <button
                          className="cmd-action-pill"
                          title="Edit Bookmark"
                          onClick={(e) => handleEditLink(e, item.rawLink)}
                        >
                          <IconEdit size={13} />
                        </button>
                        <span className="cmd-enter-pill">
                          <IconArrowRight size={12} />
                        </span>
                      </div>
                    ) : (
                      <span className="cmd-enter-pill">
                        <IconArrowRight size={12} />
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="cmd-footer">
          <div className="cmd-shortcuts">
            <span className="cmd-shortcut">
              <kbd>↑</kbd>
              <kbd>↓</kbd> Navigate
            </span>
            <span className="cmd-shortcut">
              <kbd>↵</kbd> Select
            </span>
            <span className="cmd-shortcut">
              <kbd>ESC</kbd> Close
            </span>
          </div>
          <div className="cmd-telemetry">
            <span>{filteredItems.length} items</span>
          </div>
        </div>
      </div>
    </div>
  )
}
