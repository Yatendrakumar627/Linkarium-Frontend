import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  IconExternalLink,
  IconCopy,
  IconPencil,
  IconTrash,
  IconStar,
  IconEye,
  IconCheck,
  IconArrowBackUp,
  IconFlame,
  IconDotsVertical,
  IconHistory,
  IconArchive,
  IconArchiveOff,
  IconSparkles,
  IconWand,
  IconNote,
  IconGitMerge,
  IconBook,
} from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import { faviconUrl, hostOf, safeUrl, timeAgoShort } from '../../utils'
import LinkHealthBadge from './LinkHealthBadge'
import MergeLinkModal from './MergeLinkModal'
import './LinkCard.css'

function useTouch() {
  return useState(() => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches)[0]
}

const TRASH_RETENTION_DAYS = 7

export default function LinkCard({ link, trashMode = false }) {
  const recordVisit = useLinkStore((s) => s.recordVisit)
  const toggleFavorite = useLinkStore((s) => s.toggleFavorite)
  const removeLink = useLinkStore((s) => s.removeLink)
  const restoreLink = useLinkStore((s) => s.restoreLink)
  const deleteForever = useLinkStore((s) => s.deleteForever)
  const archiveLink = useLinkStore((s) => s.archiveLink)
  const unarchiveLink = useLinkStore((s) => s.unarchiveLink)
  const enrichLink = useLinkStore((s) => s.enrichLink)
  const applyRulesToLink = useLinkStore((s) => s.applyRulesToLink)
  const openEditor = useUiStore((s) => s.openEditor)
  const openReader = useUiStore((s) => s.openReader)

  const selectionMode = useUiStore((s) => s.selectionMode)
  const selectedIds = useUiStore((s) => s.selectedIds)
  const enterSelectionMode = useUiStore((s) => s.enterSelectionMode)
  const toggleSelect = useUiStore((s) => s.toggleSelect)

  const isTouch = useTouch()
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const [mergeOpen, setMergeOpen] = useState(false)
  const cardRef = useRef(null)
  const menuBtnRef = useRef(null)
  const menuRef = useRef(null)
  const menuOpenRef = useRef(false)
  const firstMenuItemRef = useRef(null)
  const longPressTimer = useRef(null)
  const didLongPress = useRef(false)
  const isSelected = selectedIds.has(link._id)

  useEffect(() => {
    menuOpenRef.current = menuOpen
  })

  const handleGlow = (e) => {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--glow-x', `${e.clientX - rect.left}px`)
    el.style.setProperty('--glow-y', `${e.clientY - rect.top}px`)
  }

  const handleGlowReset = () => {
    const el = cardRef.current
    if (!el) return
    el.style.removeProperty('--glow-x')
    el.style.removeProperty('--glow-y')
  }

  const positionMenu = () => {
    const btn = menuBtnRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const menuWidth = 150
    let left = r.right - menuWidth
    if (left < 12) left = 12
    if (left + menuWidth > window.innerWidth - 12) left = window.innerWidth - 12 - menuWidth
    setMenuPos({ left, top: r.bottom + 8 })
  }

  const toggleMenu = () => {
    if (!menuOpen) positionMenu()
    setMenuOpen((v) => !v)
  }

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e) => {
      const target = e.target
      const inMenu = menuRef.current?.contains(target)
      const inTrigger = menuBtnRef.current?.contains(target)
      if (!inMenu && !inTrigger) setMenuOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('click', onDown)
    document.addEventListener('keydown', onKey)
    const id = window.requestAnimationFrame(() => firstMenuItemRef.current?.focus())
    return () => {
      document.removeEventListener('click', onDown)
      document.removeEventListener('keydown', onKey)
      window.cancelAnimationFrame(id)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!expanded) return
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target)) return
      if (!e.target.closest('.link-card.expanded')) setExpanded(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [expanded])

  const openInTab = useCallback(() => {
    const target = safeUrl(link.url)
    if (!target) {
      notifications.show({ message: 'This link URL is not valid.', color: 'red' })
      return
    }
    window.open(target, '_blank', 'noopener,noreferrer')
    recordVisit(link)
  }, [link, recordVisit])

  const handleOpen = useCallback(() => {
    if (didLongPress.current) {
      didLongPress.current = false
      return
    }
    if (selectionMode) {
      toggleSelect(link._id)
      return
    }
    if (isTouch) {
      setExpanded((v) => !v)
      return
    }
    openInTab()
  }, [selectionMode, toggleSelect, link._id, isTouch, openInTab])

  const handleOpenKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleOpen()
    }
  }

  // Long-press handlers
  const handlePointerDown = useCallback((e) => {
    if (e.button && e.button !== 0) return
    didLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      enterSelectionMode(link._id)
    }, 500)
  }, [enterSelectionMode, link._id])

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handlePointerLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  // Ctrl/Cmd + Click
  const handleClick = useCallback((e) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault()
      didLongPress.current = true
      if (!selectionMode) enterSelectionMode(link._id)
      else toggleSelect(link._id)
      return
    }
    if (menuOpenRef.current) {
      setMenuOpen(false)
      return
    }
    handleOpen()
  }, [enterSelectionMode, toggleSelect, selectionMode, link._id, handleOpen])

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
    }
  }, [])

  const handleCopy = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(link.url)
      notifications.show({ message: 'URL copied', color: 'green' })
    } catch {
      notifications.show({ message: 'Could not copy URL', color: 'red' })
    }
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    modals.openConfirmModal({
      title: 'Move to trash?',
      children: `"${link.title}" will be moved to trash and permanently deleted after ${TRASH_RETENTION_DAYS} days.`,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await removeLink(link._id)
          notifications.show({ message: 'Link moved to trash', color: 'green' })
        } catch (err) {
          notifications.show({ message: err.message, color: 'red' })
        }
      },
    })
  }

  const handleRestore = async (e) => {
    e.stopPropagation()
    try {
      await restoreLink(link._id)
      notifications.show({ message: 'Link restored', color: 'green' })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    }
  }

  const handleDeleteForever = (e) => {
    e.stopPropagation()
    modals.openConfirmModal({
      title: 'Delete permanently?',
      children: `"${link.title}" will be permanently deleted. This cannot be undone.`,
      labels: { confirm: 'Delete Forever', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteForever(link._id)
          notifications.show({ message: 'Link permanently deleted', color: 'green' })
        } catch (err) {
          notifications.show({ message: err.message, color: 'red' })
        }
      },
    })
  }

  const handleArchive = async (e) => {
    e?.stopPropagation?.()
    try {
      await archiveLink(link._id)
      notifications.show({ message: 'Link archived', color: 'green' })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    }
  }

  const handleUnarchive = async (e) => {
    e?.stopPropagation?.()
    try {
      await unarchiveLink(link._id)
      notifications.show({ message: 'Link restored to your library', color: 'green' })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    }
  }

  const handleEnrich = async (e) => {
    e?.stopPropagation?.()
    notifications.show({ id: `enrich-${link._id}`, message: 'Fetching the page…', loading: true, autoClose: 5000 })
    try {
      await enrichLink(link._id)
      notifications.update({
        id: `enrich-${link._id}`,
        message: 'Page details fetched',
        color: 'green',
        loading: false,
        autoClose: 2500,
      })
    } catch (err) {
      notifications.update({
        id: `enrich-${link._id}`,
        message: err.message,
        color: 'red',
        loading: false,
        autoClose: 4000,
      })
    }
  }

  const handleApplyRules = async (e) => {
    e?.stopPropagation?.()
    try {
      const updated = await applyRulesToLink(link._id)
      notifications.show({
        message: updated ? 'Rules applied' : 'No rule matched this link',
        color: updated ? 'green' : 'gray',
      })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    }
  }

  const favicon = faviconUrl(link.url, link.og?.favicon, link.og?.image)
  const drawerOpen = expanded ? ' expanded' : ''
  const selectedClass = isSelected ? ' selected' : ''
  const isArchived = Boolean(link.archivedAt)
  const tags = Array.isArray(link.tags) ? link.tags : []

  const trashExpiry = trashMode && link.deletedAt
    ? new Date(new Date(link.deletedAt).getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    : null
  const daysLeft = trashExpiry
    ? Math.max(0, Math.ceil((trashExpiry - new Date()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <div
      className={`link-card gradient-border${drawerOpen}${selectedClass}`}
      ref={cardRef}
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={handleOpenKey}
      onPointerMove={handleGlow}
      onPointerLeave={() => { handleGlowReset(); handlePointerLeave() }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      data-linkid={link._id}
      style={{ '--link-color': link.color }}
    >
      <span className="link-color-bar" aria-hidden="true" />
      {selectionMode && (
        <div className="link-card-checkbox" onClick={(e) => e.stopPropagation()}>
          <div
            className={`checkbox-inner ${isSelected ? 'checked' : ''}`}
            onClick={() => toggleSelect(link._id)}
          >
            {isSelected && <IconCheck size={12} stroke={3} />}
          </div>
        </div>
      )}

      <div className="link-card-head">
        {favicon ? (
          <img
            src={favicon}
            alt=""
            loading="lazy"
            onError={(e) => {
              const host = hostOf(link.url);
              if (!host) {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = 'flex';
                return;
              }
              const directSvg = `https://${host}/favicon.svg`;
              const googleFavicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
              const unavatar = `https://unavatar.io/${encodeURIComponent(host)}`;

              const current = e.currentTarget.src;
              if (current !== directSvg && current !== googleFavicon && current !== unavatar) {
                // Try direct /favicon.svg which modern apps (Vite, Vercel, Next.js) use
                e.currentTarget.src = directSvg;
              } else if (current === directSvg) {
                // Try Google's favicon CDN
                e.currentTarget.src = googleFavicon;
              } else if (current === googleFavicon) {
                // Try unavatar
                e.currentTarget.src = unavatar;
              } else {
                // Fall back to letter badge
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextElementSibling) {
                  e.currentTarget.nextElementSibling.style.display = 'flex';
                }
              }
            }}
          />
        ) : null}
        <div
          className="link-favicon"
          style={{
            background: link.color || '#8b5cf6',
            display: favicon ? 'none' : 'flex',
          }}
        >
          {(link.title || '?')[0].toUpperCase()}
        </div>
        <div className="link-card-body">
          <div className="link-title">{link.title}</div>
          {link.description && <div className="link-description">{link.description}</div>}
        </div>
        {!trashMode && !selectionMode && (
          <LinkHealthBadge
            status={link.health?.status}
            checkedAt={link.health?.checkedAt}
            httpStatus={link.health?.httpStatus}
            error={link.health?.error}
          />
        )}
        {isArchived && (
          <span className="link-archived-pill" title="This link is archived and hidden from the other views.">
            <IconArchive size={12} /> Archived
          </span>
        )}
        {trashMode ? (
          <span className="trash-expiry-badge">
            <IconFlame size={12} />
            {daysLeft === 0 ? 'Deletes today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
          </span>
        ) : (
          !selectionMode && (
            <button
              className={`action-btn like ${link.favorite ? 'on' : ''} link-favorite-btn`}
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(link)
              }}
              title={link.favorite ? 'Unfavorite' : 'Favorite'}
              aria-label={link.favorite ? 'Unfavorite' : 'Favorite'}
            >
              <IconStar size={17} fill={link.favorite ? 'currentColor' : 'none'} />
            </button>
          )
        )}

        {!selectionMode && (
          <button
            type="button"
            ref={menuBtnRef}
            className="link-card-menu-btn"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="More actions"
            title="More actions"
            onClick={(e) => {
              e.stopPropagation()
              toggleMenu()
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <IconDotsVertical size={18} />
          </button>
        )}
      </div>

      <div className="link-meta">
        <span className="link-domain">{hostOf(link.url)}</span>
        <span className="meta-sep">·</span>
        <span className="link-meta-visits">
          <IconEye size={13} /> {link.visits || 0}
        </span>
        <span className="meta-sep">·</span>
        <span>{timeAgoShort(link.createdAt)}</span>
        {link.note && (
          <>
            <span className="meta-sep">·</span>
            <span
              className="link-note-indicator"
              title={link.note}
              onClick={(e) => {
                e.stopPropagation()
                openEditor(link)
              }}
              role="img"
              aria-label="This link has a note"
            >
              <IconNote size={13} />
            </span>
          </>
        )}
      </div>

      {tags.length > 0 && (
        <div className="link-card-tags">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="link-tag-chip">
              #{tag}
            </span>
          ))}
          {tags.length > 3 && <span className="link-tag-chip link-tag-more">+{tags.length - 3}</span>}
        </div>
      )}

      {!selectionMode && (
        <div className="link-drawer">
          <div className="link-drawer-inner">
            <div className="link-actions">
              <button className="action-btn" onClick={(e) => { e.stopPropagation(); openInTab() }} title="Open in new tab">
                <IconExternalLink size={14} /> Open
              </button>
              <button className="action-btn" onClick={handleCopy} title="Copy URL">
                <IconCopy size={14} /> Copy
              </button>
              {trashMode ? (
                <>
                  <button
                    className="action-btn"
                    onClick={handleRestore}
                    title="Restore link"
                  >
                    <IconArrowBackUp size={14} /> Restore
                  </button>
                  <button className="action-btn danger link-action-delete" onClick={handleDeleteForever} title="Delete permanently">
                    <IconTrash size={14} /> Delete Forever
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      openReader(link)
                    }}
                    title="Read article"
                  >
                    <IconBook size={14} /> Read
                  </button>
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditor(link)
                    }}
                    title="Edit link"
                  >
                    <IconPencil size={14} /> Edit
                  </button>
                  <button className="action-btn danger link-action-delete" onClick={handleDelete} title="Move to trash">
                    <IconTrash size={14} /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {!selectionMode && menuOpen && menuPos && createPortal(
        <div
          ref={menuRef}
          className="link-card-menu"
          role="menu"
          aria-label="Link actions"
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
        >
          {trashMode ? (
            <>
              <button
                type="button"
                ref={firstMenuItemRef}
                className="link-card-menu-item"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  openInTab()
                }}
              >
                <IconExternalLink size={16} /> Open
              </button>
              <button
                type="button"
                className="link-card-menu-item"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  handleCopy(e)
                }}
              >
                <IconCopy size={16} /> Copy
              </button>
              <button
                type="button"
                className="link-card-menu-item"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  handleRestore(e)
                }}
              >
                <IconArrowBackUp size={16} /> Restore
              </button>
              <button
                type="button"
                className="link-card-menu-item danger"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  handleDeleteForever(e)
                }}
              >
                <IconTrash size={16} /> Delete Forever
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                ref={firstMenuItemRef}
                className="link-card-menu-item"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  openInTab()
                }}
              >
                <IconExternalLink size={16} /> Open
              </button>
              <button
                type="button"
                className="link-card-menu-item"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  handleCopy(e)
                }}
              >
                <IconCopy size={16} /> Copy
              </button>
              <button
                type="button"
                className="link-card-menu-item"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  openReader(link)
                }}
                title="Read article text cleanly"
              >
                <IconBook size={16} /> Reader view
              </button>
              <button
                type="button"
                className="link-card-menu-item"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  openEditor(link)
                }}
              >
                <IconPencil size={16} /> Edit
              </button>
              <a
                href={`https://web.archive.org/web/*/${encodeURIComponent(link.url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link-card-menu-item"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                }}
                title="View snapshots on the Wayback Machine"
              >
                <IconHistory size={16} /> Archive Snapshot
              </a>
              <button
                type="button"
                className="link-card-menu-item"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  if (isArchived) handleUnarchive(e)
                  else handleArchive(e)
                }}
              >
                {isArchived ? <IconArchiveOff size={16} /> : <IconArchive size={16} />}
                {isArchived ? 'Unarchive' : 'Archive'}
              </button>
              <button
                type="button"
                className="link-card-menu-item"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  handleEnrich(e)
                }}
                title="Fetch the page's title, image and readable text"
              >
                <IconSparkles size={16} /> Fetch details
              </button>
              <button
                type="button"
                className="link-card-menu-item"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  setMergeOpen(true)
                }}
                title="Fold this link into another one"
              >
                <IconGitMerge size={16} /> Merge into…
              </button>
              <button
                type="button"
                className="link-card-menu-item"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  handleApplyRules(e)
                }}
                title="Run your automation rules on this link"
              >
                <IconWand size={16} /> Run rules
              </button>
              <button
                type="button"
                className="link-card-menu-item danger"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  handleDelete(e)
                }}
              >
                <IconTrash size={16} /> Delete
              </button>
            </>
          )}
        </div>,
        document.body
      )}

      <MergeLinkModal
        opened={mergeOpen}
        onClose={() => setMergeOpen(false)}
        sourceId={link._id}
        sourceTitle={link.title}
      />
    </div>
  )
}