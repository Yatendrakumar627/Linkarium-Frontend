import { useEffect, useMemo, useState } from 'react'
import { Modal, Button, Loader } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconTag,
  IconSearch,
  IconCheck,
  IconX,
  IconExternalLink,
} from '@tabler/icons-react'
import { linksApi } from '../../api/endpoints'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import { hostOf, faviconUrl } from '../../utils'
import './AddWebsitesToTagModal.css'

export default function AddWebsitesToTagModal() {
  const modalState = useUiStore((s) => s.tagWebsitesModal)
  const close = useUiStore((s) => s.closeTagWebsitesModal)
  const storeTags = useLinkStore((s) => s.tags)
  const bulkTag = useLinkStore((s) => s.bulkTag)
  const storeLinks = useLinkStore((s) => s.links)

  const opened = Boolean(modalState)

  const [tagInput, setTagInput] = useState('')
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState('all') // 'all' | 'selected' | 'untagged' | 'tagged'
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [submitting, setSubmitting] = useState(false)

  // Normalize tag name: remove leading hash, lowercase, trim
  const cleanTag = tagInput.replace(/^#+/, '').trim().toLowerCase()

  // Initialize or reset when modal opens
  useEffect(() => {
    if (!opened) return
    const initialTag = modalState?.tag || ''
    setTagInput(initialTag)
    setSearch('')
    setFilterTab('all')
    setSelectedIds(new Set())

    let isMounted = true
    setLoading(true)

    // Load full list of links so user can pick from any website in their library
    linksApi
      .list({ limit: 1000, sort: 'newest' })
      .then((res) => {
        if (!isMounted) return
        const fetched = Array.isArray(res?.links) ? res.links : storeLinks || []
        setLinks(fetched)

        // If a specific tag was pre-opened, pre-select websites that already have this tag
        if (initialTag) {
          const preSelected = new Set()
          const target = initialTag.toLowerCase().trim()
          for (const l of fetched) {
            const hasTag = (l.tags || []).some((t) => String(t).toLowerCase() === target)
            if (hasTag) preSelected.add(l._id)
          }
          setSelectedIds(preSelected)
        }
      })
      .catch(() => {
        if (!isMounted) return
        setLinks(storeLinks || [])
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [opened, modalState, storeLinks])

  // When tag chip clicked, select it and update selection
  const handleTagChipClick = (t) => {
    setTagInput(t)
    const target = t.toLowerCase().trim()
    const matching = new Set()
    for (const l of links) {
      if ((l.tags || []).some((tag) => String(tag).toLowerCase() === target)) {
        matching.add(l._id)
      }
    }
    setSelectedIds(matching)
  }

  // Toggle selection for a single link
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Filter links based on search query and active tab
  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase()
    return links.filter((l) => {
      const hasThisTag = cleanTag
        ? (l.tags || []).some((t) => String(t).toLowerCase() === cleanTag)
        : false
      const isSelected = selectedIds.has(l._id)

      if (filterTab === 'selected' && !isSelected) return false
      if (filterTab === 'untagged' && hasThisTag) return false
      if (filterTab === 'tagged' && !hasThisTag) return false

      if (!q) return true
      const title = (l.title || '').toLowerCase()
      const url = (l.url || '').toLowerCase()
      const tagsStr = (l.tags || []).join(' ').toLowerCase()
      return title.includes(q) || url.includes(q) || tagsStr.includes(q)
    })
  }, [links, search, filterTab, cleanTag, selectedIds])

  // Select all visible links
  const selectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const l of filteredLinks) next.add(l._id)
      return next
    })
  }

  // Deselect all visible links
  const deselectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const l of filteredLinks) next.delete(l._id)
      return next
    })
  }

  // Submit and apply tag to selected websites
  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!cleanTag) {
      notifications.show({
        title: 'Tag required',
        message: 'Please enter or select a tag name.',
        color: 'red',
      })
      return
    }

    if (selectedIds.size === 0) {
      notifications.show({
        title: 'Select websites',
        message: 'Please choose at least one website to tag.',
        color: 'yellow',
      })
      return
    }

    setSubmitting(true)
    try {
      const idsArray = Array.from(selectedIds)
      await bulkTag(idsArray, [cleanTag], 'add')
      notifications.show({
        title: 'Websites tagged',
        message: `Added #${cleanTag} to ${idsArray.length} website${idsArray.length === 1 ? '' : 's'}.`,
        color: 'cyan',
        icon: <IconCheck size={16} />,
      })
      close()
    } catch (err) {
      notifications.show({
        title: 'Tagging failed',
        message: err.message || 'Could not tag selected websites.',
        color: 'red',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={null}
      centered
      size="lg"
      className="tag-websites-modal-root"
      classNames={{
        content: 'tag-websites-modal-content',
        body: 'tag-websites-modal-body',
      }}
      withCloseButton={false}
    >
      <div className="tag-modal-container">
        {/* Header */}
        <div className="tag-modal-header">
          <div className="tag-modal-title-group">
            <div className="tag-modal-badge">
              <IconTag size={20} />
            </div>
            <div>
              <div className="tag-modal-title">Add Websites to Tag</div>
              <div className="tag-modal-subtitle">
                Select multiple websites to categorize under #{cleanTag || 'tag'}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="action-btn tag-modal-close-btn"
            onClick={close}
            aria-label="Close"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Tag input section */}
        <div className="tag-modal-section">
          <label className="tag-modal-field-label">
            Target Tag
            {cleanTag && <span className="tag-active-pill">#{cleanTag}</span>}
          </label>
          <div className="tag-input-wrap">
            <span className="tag-hash-prefix">#</span>
            <input
              type="text"
              className="tag-text-input"
              placeholder="e.g. website, watch, ai, anime, study…"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              autoFocus
            />
            {tagInput && (
              <button
                type="button"
                className="tag-input-clear"
                onClick={() => setTagInput('')}
                aria-label="Clear tag"
              >
                <IconX size={14} />
              </button>
            )}
          </div>

          {/* Quick existing tag chips */}
          {storeTags.length > 0 && (
            <div className="tag-chips-scroll">
              <span className="tag-chips-label">Existing tags:</span>
              {storeTags.slice(0, 12).map((t) => {
                const isSelected = cleanTag === t.tag.toLowerCase()
                return (
                  <button
                    key={t.tag}
                    type="button"
                    className={`tag-chip-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => handleTagChipClick(t.tag)}
                  >
                    #{t.tag}
                    <span className="tag-chip-count">{t.count}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Website Search & Multi-select Toolbar */}
        <div className="tag-modal-selection-toolbar">
          <div className="tag-search-box">
            <IconSearch size={15} className="tag-search-icon" />
            <input
              type="text"
              placeholder="Search websites by title, domain, or tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="tag-search-clear"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <IconX size={13} />
              </button>
            )}
          </div>

          <div className="tag-filter-row">
            <div className="tag-filter-tabs">
              <button
                type="button"
                className={`tag-tab-btn ${filterTab === 'all' ? 'active' : ''}`}
                onClick={() => setFilterTab('all')}
              >
                All ({links.length})
              </button>
              <button
                type="button"
                className={`tag-tab-btn ${filterTab === 'selected' ? 'active' : ''}`}
                onClick={() => setFilterTab('selected')}
              >
                Selected ({selectedIds.size})
              </button>
              {cleanTag && (
                <>
                  <button
                    type="button"
                    className={`tag-tab-btn ${filterTab === 'untagged' ? 'active' : ''}`}
                    onClick={() => setFilterTab('untagged')}
                  >
                    Not in #{cleanTag}
                  </button>
                  <button
                    type="button"
                    className={`tag-tab-btn ${filterTab === 'tagged' ? 'active' : ''}`}
                    onClick={() => setFilterTab('tagged')}
                  >
                    Already in #{cleanTag}
                  </button>
                </>
              )}
            </div>

            <div className="tag-batch-actions">
              <button
                type="button"
                className="action-btn tag-batch-btn"
                onClick={selectAllVisible}
                disabled={filteredLinks.length === 0}
              >
                Select all visible
              </button>
              <button
                type="button"
                className="action-btn tag-batch-btn"
                onClick={deselectAllVisible}
                disabled={selectedIds.size === 0}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Website list scroll container */}
        <div className="tag-websites-list">
          {loading ? (
            <div className="tag-loading-wrap">
              <Loader size="sm" color="cyan" />
              <span>Loading websites from your library…</span>
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="tag-empty-websites">
              <IconSearch size={28} opacity={0.4} />
              <div>No websites match your filter.</div>
              {search && (
                <button
                  type="button"
                  className="action-btn tag-clear-filter-btn"
                  onClick={() => setSearch('')}
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            filteredLinks.map((link) => {
              const isSelected = selectedIds.has(link._id)
              const hasTag = cleanTag
                ? (link.tags || []).some((t) => String(t).toLowerCase() === cleanTag)
                : false
              const host = hostOf(link.url) || 'website'
              const favicon = faviconUrl(link.url)

              return (
                <div
                  key={link._id}
                  className={`tag-link-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleSelect(link._id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault()
                      toggleSelect(link._id)
                    }
                  }}
                >
                  {/* Custom Checkbox */}
                  <div className={`tag-checkbox ${isSelected ? 'checked' : ''}`}>
                    {isSelected && <IconCheck size={12} stroke={3} />}
                  </div>

                  {/* Favicon */}
                  <div className="tag-link-favicon-wrap">
                    {favicon ? (
                      <img
                        src={favicon}
                        alt=""
                        className="tag-link-favicon"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          if (e.currentTarget.nextElementSibling) {
                            e.currentTarget.nextElementSibling.style.display = 'grid'
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className="tag-link-favicon-fallback"
                      style={{
                        display: favicon ? 'none' : 'grid',
                        background: link.color || '#6a18b8',
                      }}
                    >
                      {(link.title || host || '?')[0].toUpperCase()}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="tag-link-info">
                    <div className="tag-link-title-row">
                      <span className="tag-link-title" title={link.title || host}>
                        {link.title || host}
                      </span>
                      {hasTag && (
                        <span className="tag-already-pill" title={`Already tagged with #${cleanTag}`}>
                          Already in #{cleanTag}
                        </span>
                      )}
                    </div>
                    <div className="tag-link-meta-row">
                      <span className="tag-link-host">{host}</span>
                      {link.tags && link.tags.length > 0 && (
                        <div className="tag-link-chips">
                          {link.tags.slice(0, 3).map((t) => (
                            <span key={t} className="tag-micro-chip">
                              #{t}
                            </span>
                          ))}
                          {link.tags.length > 3 && (
                            <span className="tag-micro-chip tag-more-count">
                              +{link.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Link preview out */}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tag-link-out"
                    onClick={(e) => e.stopPropagation()}
                    title="Open website in new tab"
                  >
                    <IconExternalLink size={13} />
                  </a>
                </div>
              )
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="tag-modal-footer">
          <div className="tag-footer-counter">
            <span className="tag-count-number">{selectedIds.size}</span>
            <span>website{selectedIds.size === 1 ? '' : 's'} selected</span>
          </div>

          <div className="tag-footer-buttons">
            <Button variant="subtle" color="gray" onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="gradient-btn tag-submit-btn"
              onClick={handleSubmit}
              loading={submitting}
              disabled={selectedIds.size === 0 || !cleanTag}
            >
              Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ''} to #{cleanTag || 'tag'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
