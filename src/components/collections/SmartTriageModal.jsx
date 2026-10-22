import { useState, useMemo, useEffect } from 'react'
import { Select, TextInput, Button, Progress, Loader } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconSparkles,
  IconFolderPlus,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconWorld,
  IconArrowRight,
  IconTrash,
} from '@tabler/icons-react'
import { ACCENT_COLORS } from '../../constants'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import { hostOf, faviconUrl, safeUrl } from '../../utils'
import { AppModal, AppModalBody, AppModalHeader } from '../common/ModalShell'
import './SmartTriageModal.css'

function SmartTriageContent({ onClose }) {
  const collections = useLinkStore((s) => s.collections)
  const mapLinks = useLinkStore((s) => s.mapLinks)
  const mapLoaded = useLinkStore((s) => s.mapLoaded)
  const fetchAllLinks = useLinkStore((s) => s.fetchAllLinks)
  const bulkMove = useLinkStore((s) => s.bulkMove)
  const bulkDelete = useLinkStore((s) => s.bulkDelete)
  const addCollection = useLinkStore((s) => s.addCollection)

  const [expandedDomain, setExpandedDomain] = useState(null)
  const [targetCollectionMap, setTargetCollectionMap] = useState({})
  const [newColDomain, setNewColDomain] = useState(null)
  const [newColName, setNewColName] = useState('')
  const [newColColor, setNewColColor] = useState(ACCENT_COLORS[0])
  const [busyDomain, setBusyDomain] = useState(null)

  // Fetch all links on modal open if not loaded
  useEffect(() => {
    if (!mapLoaded) {
      fetchAllLinks(true)
    }
  }, [mapLoaded, fetchAllLinks])

  // Extract all uncategorized links from mapLinks
  const uncategorizedLinks = useMemo(() => {
    return (mapLinks || []).filter((l) => !l.collectionId)
  }, [mapLinks])

  // Snapshot initial count on mount for the progress tracker
  const [initialCount] = useState(() => (mapLinks || []).filter((l) => !l.collectionId).length)

  // Group by root domain
  const domainClusters = useMemo(() => {
    const map = new Map()
    for (const link of uncategorizedLinks) {
      const host = hostOf(link.url) || 'other'
      if (!map.has(host)) map.set(host, [])
      map.get(host).push(link)
    }

    // Sort by link count descending
    return Array.from(map.entries())
      .map(([domain, items]) => ({ domain, items, count: items.length }))
      .sort((a, b) => b.count - a.count)
  }, [uncategorizedLinks])

  const collectionOptions = useMemo(() => {
    return (collections || []).map((c) => ({
      value: c.id,
      label: c.name,
    }))
  }, [collections])

  const handleMoveToExisting = async (domain, items) => {
    const colId = targetCollectionMap[domain] || (collections[0] ? collections[0].id : null)
    if (!colId) {
      notifications.show({ message: 'Please select a destination collection.', color: 'orange' })
      return
    }

    setBusyDomain(domain)
    try {
      const ids = items.map((l) => l._id)
      await bulkMove(ids, colId)
      const targetCol = collections.find((c) => c.id === colId)
      notifications.show({
        message: `Successfully moved ${ids.length} ${ids.length === 1 ? 'bookmark' : 'bookmarks'} to "${targetCol?.name || 'Collection'}"`,
        color: 'teal',
      })
    } catch (err) {
      notifications.show({ message: err.message || 'Failed to move links', color: 'red' })
    } finally {
      setBusyDomain(null)
    }
  }

  const handleCreateAndMove = async (domain, items) => {
    const name = newColName.trim()
    if (!name) {
      notifications.show({ message: 'Collection name is required', color: 'red' })
      return
    }

    setBusyDomain(domain)
    try {
      const newCol = await addCollection(name, newColColor)
      const ids = items.map((l) => l._id)
      await bulkMove(ids, newCol.id)
      notifications.show({
        message: `Created collection "${name}" and moved ${ids.length} bookmarks`,
        color: 'teal',
      })
      setNewColDomain(null)
      setNewColName('')
    } catch (err) {
      notifications.show({ message: err.message || 'Failed to create collection and move', color: 'red' })
    } finally {
      setBusyDomain(null)
    }
  }

  const handleDeleteBatch = async (domain, items) => {
    if (!window.confirm(`Move all ${items.length} bookmarks from ${domain} to Trash?`)) return
    setBusyDomain(domain)
    try {
      const ids = items.map((l) => l._id)
      await bulkDelete(ids)
      notifications.show({ message: `Moved ${ids.length} bookmarks to Trash`, color: 'blue' })
    } catch (err) {
      notifications.show({ message: err.message || 'Failed to delete bookmarks', color: 'red' })
    } finally {
      setBusyDomain(null)
    }
  }

  const startCreateModal = (domain) => {
    let defaultName = domain.split('.')[0]
    defaultName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1)
    if (domain.includes('github') || domain.includes('gitlab')) defaultName = 'Development'
    else if (domain.includes('youtube') || domain.includes('netflix')) defaultName = 'Entertainment'
    else if (domain.includes('medium') || domain.includes('substack')) defaultName = 'Reading'
    else if (domain.includes('figma') || domain.includes('dribbble')) defaultName = 'Design'

    setNewColName(defaultName)
    setNewColColor(ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)])
    setNewColDomain(domain)
  }

  const currentCount = uncategorizedLinks.length
  const totalTracked = initialCount || currentCount
  const triagedCount = Math.max(0, totalTracked - currentCount)
  const progressPercent = totalTracked > 0 ? Math.round((triagedCount / totalTracked) * 100) : 100

  return (
    <>
      <div className="triage-progress-card">
        <div className="triage-progress-header">
          <div className="triage-progress-label">
            <span className="triage-progress-highlight">{currentCount} uncategorized</span> bookmarks
            remaining
          </div>
          <span className="triage-progress-pct">{progressPercent}% triaged</span>
        </div>
        <Progress value={progressPercent} size="sm" radius="xl" color="teal" className="triage-bar" />
      </div>

      {currentCount === 0 ? (
        <div className="triage-complete-card">
          <div className="triage-complete-icon">
            <IconCheck size={36} />
          </div>
          <h3 className="triage-complete-title">Inbox Zero Achieved!</h3>
          <p className="triage-complete-sub">
            Every single bookmark in your universe is categorized into clean collections.
          </p>
          <Button className="gradient-btn triage-done-btn" onClick={onClose}>
            Return to Universe
          </Button>
        </div>
      ) : (
        <div className="triage-cluster-list">
          {domainClusters.map(({ domain, items, count }) => {
            const isExpanded = expandedDomain === domain
            const isCreating = newColDomain === domain
            const isBusy = busyDomain === domain
            const selectedCol = targetCollectionMap[domain] || (collections[0]?.id || '')

            return (
              <div key={domain} className="triage-cluster-card">
                <div className="triage-card-header">
                  {/* Top row: domain info + quick icon tools */}
                  <div className="triage-card-top-row">
                    <div className="triage-card-info">
                      <div className="triage-favicon-box">
                        <img
                          src={faviconUrl(`https://${domain}`)}
                          alt=""
                          className="triage-favicon"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                        <IconWorld size={15} className="triage-fallback-icon" />
                      </div>
                      <div className="triage-domain-name">
                        <span className="triage-domain-text">{domain}</span>
                        <span className="triage-count-pill">{count} links</span>
                      </div>
                    </div>

                    <div className="triage-card-tools">
                      <button
                        className="triage-expand-toggle"
                        onClick={() => setExpandedDomain(isExpanded ? null : domain)}
                        aria-label="Toggle domain links preview"
                        title={isExpanded ? 'Collapse' : 'Inspect links'}
                      >
                        {isExpanded ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}
                      </button>

                      <button
                        className="triage-delete-btn"
                        onClick={() => handleDeleteBatch(domain, items)}
                        disabled={isBusy}
                        title="Move domain links to trash"
                        aria-label="Delete all"
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Preview snippet text */}
                  <div className="triage-preview-text">
                    {items.slice(0, 2).map((l) => l.title || l.url).join(' · ')}
                    {count > 2 ? ` (+${count - 2} more)` : ''}
                  </div>

                  {/* Actions toolbar */}
                  <div className="triage-card-actions">
                    {collections.length > 0 && (
                      <div className="triage-move-inline">
                        <Select
                          size="xs"
                          data={collectionOptions}
                          value={selectedCol}
                          onChange={(val) =>
                            setTargetCollectionMap((prev) => ({ ...prev, [domain]: val }))
                          }
                          className="triage-select"
                          placeholder="Select collection"
                          disabled={isBusy}
                          aria-label={`Select collection for ${domain}`}
                        />
                        <Button
                          size="xs"
                          variant="light"
                          color="indigo"
                          disabled={isBusy}
                          onClick={() => handleMoveToExisting(domain, items)}
                          className="triage-move-btn"
                        >
                          {isBusy ? <Loader size={12} /> : 'Move All'}
                        </Button>
                      </div>
                    )}

                    <Button
                      size="xs"
                      variant="subtle"
                      color="teal"
                      leftSection={<IconFolderPlus size={14} />}
                      onClick={() =>
                        isCreating ? setNewColDomain(null) : startCreateModal(domain)
                      }
                      disabled={isBusy}
                      className="triage-new-btn"
                    >
                      <span className="triage-new-desktop">New Collection</span>
                      <span className="triage-new-mobile">New</span>
                    </Button>
                  </div>
                </div>

                {/* Inline "New Collection" creation drawer */}
                {isCreating && (
                  <div className="triage-inline-creator">
                    <span className="triage-creator-label">Create new collection for {domain}:</span>
                    <div className="triage-creator-row">
                      <TextInput
                        size="xs"
                        value={newColName}
                        onChange={(e) => setNewColName(e.currentTarget.value)}
                        placeholder="Collection name"
                        className="triage-creator-input"
                        autoFocus
                      />
                      <div className="triage-color-picker">
                        {ACCENT_COLORS.slice(0, 6).map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`triage-swatch ${newColColor === c ? 'active' : ''}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setNewColColor(c)}
                          />
                        ))}
                      </div>
                      <Button
                        size="xs"
                        className="gradient-btn"
                        onClick={() => handleCreateAndMove(domain, items)}
                        disabled={isBusy || !newColName.trim()}
                      >
                        {isBusy ? <Loader size={12} /> : 'Create & Move'}
                      </Button>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="gray"
                        onClick={() => setNewColDomain(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Expanded items preview */}
                {isExpanded && (
                  <div className="triage-expanded-tray">
                    {items.map((link) => (
                      <div key={link._id} className="triage-link-row">
                        <span className="triage-link-title">{link.title || link.url}</span>
                        <a
                          href={safeUrl(link.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="triage-link-url"
                        >
                          {link.url}
                          <IconArrowRight size={11} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

export default function SmartTriageModal() {
  const isOpen = useUiStore((s) => s.triageOpen)
  const closeTriage = useUiStore((s) => s.closeTriage)

  return (
    <AppModal
      opened={isOpen}
      onClose={closeTriage}
      size="xl"
      tone="success"
      className="triage-modal-root"
    >
      <AppModalHeader
        icon={<IconSparkles size={20} />}
        title="Smart Triage & Auto-Organizer"
        subtitle="Achieve Inbox Zero by batch-clustering domains"
        onClose={closeTriage}
      />
      <AppModalBody className="triage-modal-body">
        {isOpen && <SmartTriageContent onClose={closeTriage} />}
      </AppModalBody>
    </AppModal>
  )
}
