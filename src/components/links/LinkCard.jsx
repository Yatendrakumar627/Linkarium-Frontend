import { useEffect, useRef, useState, useCallback, memo } from 'react'
import { Menu } from '@mantine/core'
import {
  IconExternalLink,
  IconCopy,
  IconPencil,
  IconTrash,
  IconTrashX,
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
  IconArrowUpRight,
  IconClock,
  IconFolder,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import { faviconUrl, hostOf, safeUrl, timeAgoShort, timeAgo } from '../../utils'
import LinkHealthBadge from './LinkHealthBadge'
import MergeLinkModal from './MergeLinkModal'
import './LinkCard.css'

function useTouch() {
  return useState(() => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches)[0]
}

const TRASH_RETENTION_DAYS = 7

function LinkCard({ link, trashMode = false }) {
  const collections = useLinkStore((s) => s.collections)
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
  const openConfirmDialog = useUiStore((s) => s.openConfirmDialog)

  const selectionMode = useUiStore((s) => s.selectionMode)
  const isSelected = useUiStore((s) => s.selectedIds.has(link._id))
  const enterSelectionMode = useUiStore((s) => s.enterSelectionMode)
  const toggleSelect = useUiStore((s) => s.toggleSelect)

  const isTouch = useTouch()
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef(null)
  const cardRef = useRef(null)
  const menuOpenRef = useRef(false)
  const longPressTimer = useRef(null)
  const didLongPress = useRef(false)

  useEffect(() => {
    menuOpenRef.current = menuOpen
  })

  const rectRef = useRef(null)

  const handlePointerEnter = () => {
    if (cardRef.current) {
      rectRef.current = cardRef.current.getBoundingClientRect()
    }
  }

  const handleGlow = (e) => {
    const el = cardRef.current
    if (!el) return
    let rect = rectRef.current
    if (!rect) {
      rect = el.getBoundingClientRect()
      rectRef.current = rect
    }
    el.style.setProperty('--glow-x', `${e.clientX - rect.left}px`)
    el.style.setProperty('--glow-y', `${e.clientY - rect.top}px`)
  }

  const handleGlowReset = () => {
    rectRef.current = null
    const el = cardRef.current
    if (!el) return
    el.style.removeProperty('--glow-x')
    el.style.removeProperty('--glow-y')
  }

  useEffect(() => {
    if (!expanded) return
    const onDown = (e) => {
      // The actions menu is portalled outside the card, so a click inside it
      // must not collapse the expanded card.
      if (menuOpenRef.current) return
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
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  const handleCopy = async (e) => {
    e?.stopPropagation?.()
    try {
      await navigator.clipboard.writeText(link.url)
      setCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 1600)
      notifications.show({ message: 'URL copied', color: 'green', autoClose: 2000 })
    } catch {
      notifications.show({ message: 'Could not copy URL', color: 'red' })
    }
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    openConfirmDialog({
      title: 'Move to trash?',
      subtitle: `Permanently deleted after ${TRASH_RETENTION_DAYS} days`,
      tone: 'danger',
      icon: <IconTrash size={20} />,
      confirmLabel: 'Move to trash',
      body: (
        <div>
          <div className="app-modal-entity">
            <span className="app-modal-entity-name">{link.title || link.url}</span>
          </div>
          <ul className="app-modal-consequences">
            <li className="is-destructive">
              <IconTrash size={14} />
              <span>
                The link is moved to trash and deleted for good after{' '}
                {TRASH_RETENTION_DAYS} days.
              </span>
            </li>
            <li className="is-safe">
              <IconArrowBackUp size={14} />
              <span>You can restore it from the trash until then.</span>
            </li>
          </ul>
        </div>
      ),
      onConfirm: async () => {
        await removeLink(link._id)
        notifications.show({ message: 'Link moved to trash', color: 'cyan' })
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
    openConfirmDialog({
      title: 'Delete permanently?',
      subtitle: 'This one skips the trash',
      tone: 'danger',
      icon: <IconTrashX size={20} />,
      confirmLabel: 'Delete forever',
      body: (
        <div>
          <div className="app-modal-entity">
            <span className="app-modal-entity-name">{link.title || link.url}</span>
          </div>
          <ul className="app-modal-consequences">
            <li className="is-destructive">
              <IconTrashX size={14} />
              <span>
                The link is permanently deleted. This cannot be undone.
              </span>
            </li>
          </ul>
        </div>
      ),
      onConfirm: async () => {
        await deleteForever(link._id)
        notifications.show({ message: 'Link permanently deleted', color: 'cyan' })
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

  const favicon = faviconUrl(link.url, link.og?.favicon)
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

  const collection = link.collectionId
    ? collections?.find((c) => String(c.id || c._id) === String(link.collectionId))
    : null

  const host = hostOf(link.url)
  const rawTitle = (link.title || '').trim()
  const hasDistinctTitle = Boolean(rawTitle && rawTitle.toLowerCase() !== host?.toLowerCase())
  const displayTitle = hasDistinctTitle ? rawTitle : host

  let displaySub = host
  if (!hasDistinctTitle) {
    try {
      const u = new URL(link.url)
      const path = (u.pathname === '/' ? '' : u.pathname) + (u.search || '')
      displaySub = path ? `${host}${path}` : host
    } catch {
      displaySub = host
    }
  }

  return (
    <div
      className={`link-card gradient-border${drawerOpen}${selectedClass}`}
      ref={cardRef}
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={handleOpenKey}
      onPointerEnter={handlePointerEnter}
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

      {/* 1. Head: Favicon + Title & Description + Quick Actions */}
      <div className="link-card-head">
        {favicon ? (
          <img
            src={favicon}
            alt=""
            loading="lazy"
            decoding="async"
            className="link-favicon-img"
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
          {(displayTitle || '?')[0].toUpperCase()}
        </div>

        <div className="link-card-body">
          <div
            className="link-title"
            title={
              link.description
                ? `${displayTitle}\n\n${link.description}`
                : (displayTitle || link.url)
            }
          >
            {displayTitle}
          </div>
          {displaySub ? (
            <div className="link-url-sub" title={link.url}>
              {displaySub}
            </div>
          ) : null}
        </div>

        <div className="link-card-head-actions">
          {trashMode ? (
            <span className="trash-expiry-badge">
              <IconFlame size={12} />
              {daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
            </span>
          ) : (
            !selectionMode && (
              <button
                type="button"
                className={`link-head-action-btn link-favorite-btn ${link.favorite ? 'on' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFavorite(link)
                }}
                title={link.favorite ? 'Unfavorite' : 'Favorite'}
                aria-label={link.favorite ? 'Unfavorite' : 'Favorite'}
              >
                <IconStar size={15} fill={link.favorite ? 'currentColor' : 'none'} />
              </button>
            )
          )}

          {!selectionMode && (
            <Menu
              position="bottom-end"
              offset={6}
              shadow="xl"
              withinPortal
              opened={menuOpen}
              onChange={setMenuOpen}
              closeOnItemClick
              zIndex={300}
              transitionProps={{ duration: 120, transition: 'fade' }}
            >
              <Menu.Target>
                <button
                  type="button"
                  className="link-head-action-btn link-card-menu-btn"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="More actions"
                  title="More actions"
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <IconDotsVertical size={15} />
                </button>
              </Menu.Target>

              <Menu.Dropdown className="link-card-menu">
                {trashMode ? (
                  <>
                    <Menu.Item
                      leftSection={<IconExternalLink size={16} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        openInTab()
                      }}
                    >
                      Open
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconCopy size={16} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopy(e)
                      }}
                    >
                      Copy
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconArrowBackUp size={16} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRestore(e)
                      }}
                    >
                      Restore
                    </Menu.Item>
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={16} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteForever(e)
                      }}
                    >
                      Delete Forever
                    </Menu.Item>
                  </>
                ) : (
                  <>
                    <Menu.Item
                      leftSection={<IconExternalLink size={16} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        openInTab()
                      }}
                    >
                      Open
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconCopy size={16} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopy(e)
                      }}
                    >
                      Copy
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconBook size={16} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        openReader(link)
                      }}
                    >
                      Reader view
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconPencil size={16} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditor(link)
                      }}
                    >
                      Edit
                    </Menu.Item>
                    <Menu.Item
                      component="a"
                      href={`https://web.archive.org/web/*/${encodeURIComponent(link.url)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      leftSection={<IconHistory size={16} />}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Archive Snapshot
                    </Menu.Item>
                    <Menu.Item
                      leftSection={isArchived ? <IconArchiveOff size={16} /> : <IconArchive size={16} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isArchived) handleUnarchive(e)
                        else handleArchive(e)
                      }}
                    >
                      {isArchived ? 'Unarchive' : 'Archive'}
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconSparkles size={16} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEnrich(e)
                      }}
                    >
                      Fetch details
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconGitMerge size={16} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        setMergeOpen(true)
                      }}
                    >
                      Merge into…
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconWand size={16} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleApplyRules(e)
                      }}
                    >
                      Run rules
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={16} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(e)
                      }}
                    >
                      Delete
                    </Menu.Item>
                  </>
                )}
              </Menu.Dropdown>
            </Menu>
          )}
        </div>
      </div>

      {/* 2. Middle Row: Views, Time, Health / Collection Badge */}
      <div className="link-meta-row">
        <div className="link-meta-left">
          <span className="link-meta-visits" title={`${link.visits || 0} visits`}>
            <IconEye size={12} /> {link.visits || 0}
          </span>
          <span className="meta-sep">·</span>
          <span className="link-meta-time" title={`Added ${timeAgo(link.createdAt)}`}>
            <IconClock size={12} /> {timeAgoShort(link.createdAt)}
          </span>
          {link.note && (
            <>
              <span className="meta-sep">·</span>
              <span
                className="link-note-indicator"
                title={`Note: ${link.note}`}
                onClick={(e) => {
                  e.stopPropagation()
                  openEditor(link)
                }}
                role="button"
                tabIndex={0}
                aria-label="View note"
              >
                <IconNote size={12} />
              </span>
            </>
          )}
        </div>

        <div className="link-meta-right">
          {collection && (
            <span
              className="link-collection-pill"
              style={{ '--col-color': collection.color || '#a78bfa' }}
              title={`Collection: ${collection.name}`}
            >
              <IconFolder size={10} />
              <span>{collection.name}</span>
            </span>
          )}

          {!trashMode && !selectionMode && (
            <LinkHealthBadge
              status={link.health?.status}
              checkedAt={link.health?.checkedAt}
              httpStatus={link.health?.httpStatus}
              error={link.health?.error}
            />
          )}

          {isArchived && (
            <span className="link-archived-pill" title="This link is archived">
              <IconArchive size={10} /> Archived
            </span>
          )}
        </div>
      </div>

      {/* 3. Bottom Row: Tags (Only if tags exist) */}
      {tags.length > 0 && (
        <div className="link-card-bottom">
          <div className="link-card-tags">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="link-tag-chip" title={`#${tag}`}>
                <span className="link-tag-hash">#</span>
                <span className="link-tag-name">{tag}</span>
              </span>
            ))}
            {tags.length > 3 && (
              <span
                className="link-tag-chip link-tag-more"
                title={tags.slice(3).map((t) => `#${t}`).join(', ')}
              >
                +{tags.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {!selectionMode && (
        <div className="link-drawer">
          <div className="link-drawer-inner">
            <div className="link-actions">
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  openInTab()
                }}
                title="Open in new tab"
                aria-label="Open in new tab"
              >
                <IconExternalLink size={14} />
              </button>
              <button
                className="action-btn"
                onClick={handleCopy}
                title={copied ? 'Copied URL!' : 'Copy URL'}
                aria-label="Copy URL"
              >
                {copied ? <IconCheck size={14} stroke={2.5} /> : <IconCopy size={14} />}
              </button>
              {trashMode ? (
                <>
                  <button
                    className="action-btn"
                    onClick={handleRestore}
                    title="Restore link"
                    aria-label="Restore link"
                  >
                    <IconArrowBackUp size={14} />
                  </button>
                  <button
                    className="action-btn danger link-action-delete"
                    onClick={handleDeleteForever}
                    title="Delete permanently"
                    aria-label="Delete permanently"
                  >
                    <IconTrash size={14} />
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
                    title="Reader view"
                    aria-label="Reader view"
                  >
                    <IconBook size={14} />
                  </button>
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditor(link)
                    }}
                    title="Edit link"
                    aria-label="Edit link"
                  >
                    <IconPencil size={14} />
                  </button>
                  <button
                    className="action-btn danger link-action-delete"
                    onClick={handleDelete}
                    title="Move to trash"
                    aria-label="Move to trash"
                  >
                    <IconTrash size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}


      {mergeOpen && (
        <MergeLinkModal
          opened={mergeOpen}
          onClose={() => setMergeOpen(false)}
          sourceId={link._id}
          sourceTitle={link.title}
        />
      )}
    </div>
  )
}

export default memo(LinkCard)