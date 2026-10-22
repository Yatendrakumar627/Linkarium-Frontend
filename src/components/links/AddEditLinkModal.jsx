import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Combobox, InputBase, Loader, Modal, TagsInput, TextInput, Textarea, useCombobox } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconAlertTriangle,
  IconCheck,
  IconEdit,
  IconFolder,
  IconHistory,
  IconLink,
  IconSparkles,
  IconStar,
  IconTags,
} from '@tabler/icons-react'
import { ACCENT_COLORS } from '../../constants'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import { metadataApi } from '../../api/endpoints'
import { cleanUrl, faviconUrl, hostOf, safeUrl, suggestTagsForUrl } from '../../utils'
import OgPreview from './OgPreview'
import './AddEditLinkModal.css'

const isLikelyUrl = (value) => {
  if (!value || typeof value !== 'string') return false
  const v = value.trim()
  if (!v) return false
  return /^https?:\/\//i.test(v) || /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(v)
}

function CollectionSelect({ collections, value, onChange, addCollection }) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  })

  const [search, setSearch] = useState(() => collections.find((c) => c.id === value)?.name || '')
  const selected = collections.find((c) => c.id === value)

  const options = collections.map((c) => (
    <Combobox.Option value={c.id} key={c.id}>
      <div className="le-col-option">
        <IconFolder size={14} className="le-col-option-icon" />
        <span>{c.name}</span>
      </div>
    </Combobox.Option>
  ))

  const trimmed = search.trim()
  const createName = trimmed && !collections.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())
    ? trimmed
    : null

  const selectExisting = (id) => {
    onChange(id)
    const col = collections.find((c) => c.id === id)
    setSearch(col ? col.name : '')
    combobox.closeDropdown()
  }

  const createCollection = async (name) => {
    try {
      const c = await addCollection(name)
      onChange(c.id)
      setSearch(c.name)
      combobox.closeDropdown()
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    }
  }

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        if (val === '$create') {
          createCollection(createName)
        } else {
          selectExisting(val)
        }
      }}
      position="bottom-start"
      middlewares={{
        flip: { fallbackStrategy: 'bestFit', padding: 8 },
        shift: { padding: 8 },
      }}
      offset={4}
      withinPortal
      transitionProps={{ duration: 120, transition: 'fade' }}
    >
      <Combobox.Target>
        <InputBase
          label="Collection"
          placeholder="General (None)"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => {
            setSearch(selected?.name || '')
            combobox.closeDropdown()
          }}
          leftSection={<IconFolder size={15} className="le-field-icon" />}
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
        />
      </Combobox.Target>

      <Combobox.Dropdown className="le-dropdown">
        <Combobox.Options>
          {options}
          {createName && (
            <Combobox.Option value="$create" className="le-col-create-option">
              + New collection "{createName}"
            </Combobox.Option>
          )}
          {!createName && options.length === 0 && (
            <Combobox.Empty>No collections yet — type to create one.</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  )
}

function LinkEditorForm({ link: editingLink, links, collections, tags, addLink, updateLink, addCollection, onClose }) {
  const [title, setTitle] = useState(editingLink?.title || '')
  const [url, setUrl] = useState(editingLink?.url || '')
  const [description, setDescription] = useState(editingLink?.description || '')
  const [note, setNote] = useState(editingLink?.note || '')
  const [linkTags, setLinkTags] = useState(editingLink?.tags || [])
  const [collectionId, setCollectionId] = useState(editingLink?.collectionId || '')
  const [favorite, setFavorite] = useState(editingLink?.favorite || false)
  const [color, setColor] = useState(editingLink?.color || ACCENT_COLORS[0])
  const [busy, setBusy] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState(false)
  const [siteName, setSiteName] = useState('')
  const [suggested, setSuggested] = useState(false)
  const [duplicate, setDuplicate] = useState(null)
  const [enriching, setEnriching] = useState(false)
  const [previewFavicon, setPreviewFavicon] = useState(editingLink?.og?.favicon || '')

  const handleEnrich = async () => {
    if (!editingLink?._id || enriching) return
    setEnriching(true)
    try {
      const enriched = await useLinkStore.getState().enrichLink(editingLink._id)
      if (enriched?.og?.title && !title) setTitle(enriched.og.title)
      if (enriched?.og?.description && !description) setDescription(enriched.og.description)
      notifications.show({ message: 'Link enriched successfully with OG & article data', color: 'teal' })
    } catch (err) {
      notifications.show({ message: err.message || 'Enrichment failed', color: 'red' })
    } finally {
      setEnriching(false)
    }
  }

  const suggestSeq = useRef(0)
  const busyRef = useRef(false)
  const titleRef = useRef('')
  const descRef = useRef('')

  useEffect(() => {
    titleRef.current = title
    descRef.current = description
    busyRef.current = busy
  })

  const [tagSearch, setTagSearch] = useState('')

  const existingTags = Array.from(new Set(tags.map((t) => t.tag)))

  const availableExistingTags = useMemo(() => {
    return existingTags.filter((t) => !linkTags.includes(t))
  }, [existingTags, linkTags])

  const suggestedTags = useMemo(() => {
    if (!isLikelyUrl(url)) return []
    return suggestTagsForUrl(url, title || siteName, linkTags)
  }, [url, title, siteName, linkTags])

  // All candidate tags (URL suggested + library tags, unique, excluding already added tags)
  const allCandidateTags = useMemo(() => {
    const map = new Map()
    for (const t of suggestedTags) {
      if (t && typeof t === 'string') {
        const tr = t.trim()
        if (tr) map.set(tr.toLowerCase(), tr)
      }
    }
    for (const t of existingTags) {
      if (t && typeof t === 'string') {
        const tr = t.trim()
        if (tr) map.set(tr.toLowerCase(), tr)
      }
    }
    const current = new Set(linkTags.map((t) => t.toLowerCase().trim()))
    return Array.from(map.values()).filter((t) => !current.has(t.toLowerCase()))
  }, [suggestedTags, existingTags, linkTags])

  // Logical letter-by-letter matching:
  // 1. Exact match first
  // 2. Starts with query (prefix matches)
  // 3. Contains query (substring matches)
  const matchingTags = useMemo(() => {
    const q = tagSearch.trim().toLowerCase()
    if (!q) return []

    const exact = []
    const startsWith = []
    const contains = []

    for (const tag of allCandidateTags) {
      const lower = tag.toLowerCase()
      if (lower === q) {
        exact.push(tag)
      } else if (lower.startsWith(q)) {
        startsWith.push(tag)
      } else if (lower.includes(q)) {
        contains.push(tag)
      }
    }

    return [...exact, ...startsWith, ...contains]
  }, [tagSearch, allCandidateTags])

  const isDropdownOpened = tagSearch.trim().length > 0 && matchingTags.length > 0

  const runExtract = useCallback(async (rawUrl) => {
    const v = String(rawUrl || '').trim()
    if (!isLikelyUrl(v)) {
      setExtracting(false)
      setSiteName('')
      setExtractError(false)
      return
    }
    if (busyRef.current) return
    const seq = ++suggestSeq.current
    setExtracting(true)
    setExtractError(false)
    try {
      const res = await metadataApi.suggest(v)
      if (seq !== suggestSeq.current) return // ignore stale responses
      const detectedTitle = (res && (res.title || res.name)) || ''
      const detectedSite = res?.siteName || ''
      setSiteName(detectedSite || detectedTitle)
      if (res?.favicon && !previewFavicon) {
        setPreviewFavicon(res.favicon)
      }
      if (res?.description && !descRef.current.trim()) {
        setDescription(res.description.trim())
      }
      // Populate if title is empty, or if title was previously an auto-suggestion or just a generic hostname
      const currentTitle = titleRef.current.trim()
      const d = hostOf(v)
      if (
        detectedTitle &&
        (!currentTitle ||
          suggested ||
          currentTitle.toLowerCase() === 'youtube' ||
          currentTitle.toLowerCase() === d.toLowerCase() ||
          (detectedSite && currentTitle.toLowerCase() === detectedSite.toLowerCase()))
      ) {
        setTitle(detectedTitle)
        setSuggested(true)
      }
    } catch {
      if (seq !== suggestSeq.current) return
      setSiteName('')
      setExtractError(true)
    } finally {
      if (seq === suggestSeq.current) setExtracting(false)
    }
  }, [previewFavicon])


  useEffect(() => {
    const v = url.trim()
    if (!isLikelyUrl(v)) return
    const timer = setTimeout(() => runExtract(v), 600)
    return () => clearTimeout(timer)
  }, [url, runExtract])

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (busy) return
    if (!title.trim() || !url.trim()) {
      notifications.show({ message: 'Title and URL are required.', color: 'red' })
      return
    }
    if (!safeUrl(url)) {
      notifications.show({ message: 'Only http:// and https:// links can be saved.', color: 'red' })
      return
    }
    setBusy(true)
    try {
      const payload = {
        title: title.trim(),
        url: url.trim(),
        description: description.trim(),
        note: note.trim(),
        tags: linkTags,
        collectionId: collectionId || undefined,
        color,
      }

      if (editingLink) {
        const canFavorite = links.some((l) => l._id === editingLink._id)
        await updateLink(editingLink._id, { ...payload, favorite: canFavorite ? favorite : undefined })
        notifications.show({ message: 'Link updated successfully', color: 'green' })
      } else {
        await addLink({ ...payload, favorite })
        notifications.show({ message: 'Saved to your universe', color: 'green' })
      }
      onClose()
    } catch (err) {
      if (err.status === 409 && err.data?.existing && !editingLink) {
        setDuplicate(err.data.existing)
        return
      }
      notifications.show({ message: err.message || 'Something went wrong', color: 'red' })
    } finally {
      setBusy(false)
    }
  }

  const replaceWithMine = async () => {
    if (busy || !duplicate) return
    setBusy(true)
    try {
      await updateLink(duplicate._id, {
        title: title.trim(),
        url: url.trim(),
        description: description.trim(),
        note: note.trim(),
        tags: linkTags,
        collectionId: collectionId || undefined,
        color,
        favorite,
      })
      notifications.show({ message: 'Replaced with your new link', color: 'green' })
      onClose()
    } catch (err) {
      notifications.show({ message: err.message || 'Something went wrong', color: 'red' })
    } finally {
      setBusy(false)
    }
  }

  const trimmedUrl = url.trim()
  const favicon = faviconUrl(trimmedUrl, previewFavicon, editingLink?.og?.image)
  const domain = hostOf(trimmedUrl)
  const showPreview = extracting || extractError || siteName || isLikelyUrl(trimmedUrl)

  let previewStatus
  if (extracting) {
    previewStatus = (
      <>
        <Loader size={12} color="violet" />
        <span>Fetching site info…</span>
      </>
    )
  } else if (extractError) {
    previewStatus = <span className="le-preview-error">Couldn't read metadata — you can still save.</span>
  } else if (siteName || title) {
    const displayLabel = title || siteName
    const truncated = displayLabel.length > 42 ? displayLabel.slice(0, 39) + '…' : displayLabel
    previewStatus = (
      <>
        <IconCheck size={13} className="le-preview-check" />
        <span>{suggested ? `Auto-filled: "${truncated}"` : `Detected: ${siteName || truncated}`}</span>
      </>
    )

  } else if (isLikelyUrl(trimmedUrl)) {
    previewStatus = (
      <>
        <IconCheck size={13} className="le-preview-check" />
        <span>Ready to save</span>
      </>
    )
  } else {
    previewStatus = 'Enter a valid URL to fetch its preview'
  }

  if (duplicate) {
    return (
      <div className="le-modal-shell">
        <div className="le-modal-scroll-area">
          <div className="le-conflict">
            <div className="le-conflict-header">
              <IconAlertTriangle size={22} className="le-conflict-icon" />
              <div>
                <div className="le-conflict-title">Duplicate Link Detected</div>
                <div className="le-conflict-sub">
                  This destination URL is already saved in your universe.
                </div>
              </div>
            </div>

            <div className="le-conflict-compare">
              <div className="le-conflict-card">
                <div className="le-conflict-card-head">Saved in Universe</div>
                <div className="le-conflict-card-title">{duplicate.title || 'Untitled'}</div>
                <div className="le-conflict-card-url">{duplicate.url}</div>
                <div className="le-conflict-card-meta">
                  Preserved {new Date(duplicate.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="le-conflict-vs">vs</div>
              <div className="le-conflict-card le-conflict-card-new">
                <div className="le-conflict-card-head">Your New Bookmark</div>
                <div className="le-conflict-card-title">{title.trim() || 'Untitled'}</div>
                <div className="le-conflict-card-url">{url.trim()}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="le-modal-footer">
          <Button
            type="button"
            size="md"
            variant="subtle"
            className="le-cancel"
            onClick={() => setDuplicate(null)}
            disabled={busy}
          >
            Edit Fields
          </Button>
          <div className="le-footer-actions">
            <Button
              type="button"
              size="md"
              variant="subtle"
              className="le-cancel"
              onClick={onClose}
              disabled={busy}
            >
              Keep Existing
            </Button>
            <Button
              type="button"
              size="md"
              loading={busy}
              className="le-submit gradient-btn"
              onClick={replaceWithMine}
            >
              Replace with Mine
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="le-modal-shell"
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault()
          handleSubmit(e)
        }
      }}
    >
      <div className="le-modal-scroll-area">
        {/* Destination URL */}
        <div className="le-field-box">
          <TextInput
            className="le-hero-url-input"
            label="Destination URL"
            placeholder="https://example.com"
            required
            value={url}
            onChange={(e) => {
              const raw = e.currentTarget.value
              const { cleaned, wasCleaned } = cleanUrl(raw)
              setUrl(cleaned)
              setSiteName('')
              setExtractError(false)
              setSuggested(false)
              if (wasCleaned) {
                notifications.show({
                  message: 'Cleaned URL (tracking parameters removed)',
                  color: 'teal',
                  autoClose: 2200,
                })
              }
              if (!isLikelyUrl(cleaned)) setExtracting(false)
            }}
            onBlur={() => runExtract(url)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
            leftSection={
              favicon ? (
                <img src={favicon} alt="" className="le-url-favicon" />
              ) : (
                <IconLink size={16} className="le-url-icon" />
              )
            }
            rightSection={extracting ? <Loader size={14} color="violet" /> : undefined}
            rightSectionPointerEvents="none"
          />

          {showPreview && (
            <div className="le-url-preview">
              <span className="le-preview-favicon">
                {favicon ? <img src={favicon} alt="" /> : <IconLink size={14} className="le-url-icon" />}
              </span>
              <div className="le-preview-info">
                <div className="le-preview-domain">{isLikelyUrl(trimmedUrl) ? domain : '—'}</div>
                <div className="le-preview-status">{previewStatus}</div>
              </div>
              {safeUrl(trimmedUrl) && (
                <a
                  href={`https://web.archive.org/web/*/${encodeURIComponent(trimmedUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="le-wayback-link"
                  title="View snapshots on the Wayback Machine"
                >
                  <IconHistory size={13} />
                  <span>Wayback</span>
                </a>
              )}
              {editingLink && (
                <button
                  type="button"
                  className="le-wayback-link"
                  onClick={handleEnrich}
                  disabled={enriching}
                  style={{ cursor: 'pointer', background: 'none', border: 'none' }}
                  title="Fetch latest OpenGraph and article data from source"
                >
                  {enriching ? <Loader size={12} color="violet" /> : <IconSparkles size={13} />}
                  <span>{enriching ? 'Enriching…' : 'Enrich'}</span>
                </button>
              )}
            </div>
          )}

          {/* The page's own OpenGraph card — the real title and summary. */}
          <OgPreview
            url={trimmedUrl}
            onUseTitle={(value) => {
              setTitle(value)
              setSuggested(true)
            }}
            onUseDescription={(value) => setDescription(value)}
            onLoaded={(og) => {
              if (og.favicon) {
                setPreviewFavicon(og.favicon)
              }
              // Auto-fill summary if user hasn't typed one yet
              if (og.description && !descRef.current.trim()) {
                setDescription(og.description.trim())
              }
              // Auto-fill full title if current title is still empty or just a generic hostname/domain
              const curTitle = titleRef.current.trim()
              if (og.title && (!curTitle || curTitle.toLowerCase() === domain.toLowerCase())) {
                setTitle(og.title.trim())
                setSuggested(true)
              }
            }}
          />
        </div>

        {/* Title */}
        <div className="le-field-box">
          <TextInput
            label="Title"
            placeholder="e.g. Design Systems Handbook"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.currentTarget.value)
              setSuggested(false)
            }}
            rightSection={
              suggested ? (
                <span className="le-suggest-chip">
                  <IconSparkles size={11} />
                  Auto-filled
                </span>
              ) : undefined
            }
            rightSectionWidth={suggested ? 104 : 40}
          />
        </div>

        {/* Summary — the short description shown on the card */}
        <div className="le-field-box">
          <Textarea
            className="le-description"
            label="Summary"
            placeholder="A one-line summary of what this link is about..."
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            autosize
            minRows={2}
            maxRows={4}
          />
        </div>

        {/* Notes — the private, long-form note. Never shown on a card. */}
        <div className="le-field-box">
          <Textarea
            className="le-note"
            label={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span>Notes</span>
                <span style={{ fontSize: '0.75rem', color: note.length > 4500 ? '#f59e0b' : 'var(--text-muted)' }}>
                  {note.length} / 5000
                </span>
              </div>
            }
            placeholder="Your private notes about this link — why you saved it, what to do with it, who to send it to..."
            value={note}
            onChange={(e) => setNote(e.currentTarget.value.slice(0, 5000))}
            maxLength={5000}
            autosize
            minRows={3}
            maxRows={10}
          />
        </div>

        {/* 2-Column Row: Collection & Priority Star */}
        <div className="le-meta-row">
          <div className="le-meta-col-collection">
            <CollectionSelect
              collections={collections}
              value={collectionId || null}
              onChange={(v) => typeof v === 'string' && setCollectionId(v)}
              addCollection={addCollection}
            />
          </div>
          <div className="le-meta-col-favorite">
            <span className="le-field-label">Priority</span>
            <button
              type="button"
              onClick={() => setFavorite((f) => !f)}
              className={`le-fav-pill ${favorite ? 'active' : ''}`}
              title={favorite ? 'Starred in Universe' : 'Mark as favorite'}
            >
              <IconStar size={15} fill={favorite ? '#f59e0b' : 'none'} className="le-fav-star" />
              <span>{favorite ? 'Starred' : 'Favorite'}</span>
            </button>
          </div>
        </div>

        {/* Tags & Suggestions */}
        <div className="le-field-box">
          <TagsInput
            label="Tags"
            placeholder="Add tags (press Enter)..."
            data={matchingTags}
            filter={({ options }) => options}
            value={linkTags}
            onChange={(newTags) => {
              setLinkTags(newTags)
              setTagSearch('')
            }}
            searchValue={tagSearch}
            onSearchChange={setTagSearch}
            dropdownOpened={isDropdownOpened}
            clearable
            maxDropdownHeight={180}
            comboboxProps={{
              position: 'bottom-start',
              middlewares: {
                flip: { fallbackStrategy: 'bestFit', padding: 8 },
                shift: { padding: 8 },
              },
              offset: 4,
              withinPortal: true,
              shadow: 'lg',
              transitionProps: { duration: 120, transition: 'fade' },
            }}
            renderOption={({ option }) => {
              const label = option.label || option.value
              const q = tagSearch.trim()
              if (!q) {
                return (
                  <div className="le-tag-option-row">
                    <span className="le-tag-option-hash">#</span>
                    <span>{label}</span>
                  </div>
                )
              }
              const idx = label.toLowerCase().indexOf(q.toLowerCase())
              if (idx === -1) {
                return (
                  <div className="le-tag-option-row">
                    <span className="le-tag-option-hash">#</span>
                    <span>{label}</span>
                  </div>
                )
              }
              const before = label.slice(0, idx)
              const match = label.slice(idx, idx + q.length)
              const after = label.slice(idx + q.length)
              return (
                <div className="le-tag-option-row">
                  <span className="le-tag-option-hash">#</span>
                  <span>
                    {before}
                    <strong className="le-tag-option-match">{match}</strong>
                    {after}
                  </span>
                </div>
              )
            }}
            leftSection={<IconTags size={15} className="le-field-icon" />}
            leftSectionPointerEvents="none"
            classNames={{ dropdown: 'le-dropdown' }}
          />

          {/* Letter-by-letter live matching chips when typing */}
          {tagSearch.trim().length > 0 && matchingTags.length > 0 && (
            <div className="le-suggested-tags">
              <span className="le-suggested-label">Matching:</span>
              <div className="le-suggested-chips">
                {matchingTags.slice(0, 10).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="le-tag-chip le-tag-chip-match"
                    onClick={() => {
                      setLinkTags((prev) => [...prev, tag])
                      setTagSearch('')
                    }}
                    title={`Add matching tag "${tag}"`}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Default chips when search input is empty */}
          {tagSearch.trim().length === 0 && availableExistingTags.length > 0 && linkTags.length < 6 && (
            <div className="le-suggested-tags">
              <span className="le-suggested-label">Your tags:</span>
              <div className="le-suggested-chips">
                {availableExistingTags.slice(0, 8).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="le-tag-chip le-tag-chip-existing"
                    onClick={() => setLinkTags((prev) => [...prev, tag])}
                    title={`Add existing tag "${tag}"`}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tagSearch.trim().length === 0 && suggestedTags.length > 0 && (
            <div className="le-suggested-tags">
              <span className="le-suggested-label">Suggested:</span>
              <div className="le-suggested-chips">
                {suggestedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="le-tag-chip"
                    onClick={() => setLinkTags((prev) => [...prev, tag])}
                    title={`Add tag "${tag}"`}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Accent Colors */}
        <div className="le-color-section">
          <span className="le-field-label">Accent Tone</span>
          <div className="le-colors">
            {ACCENT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`color-swatch ${color === c ? 'selected' : ''}`}
                style={{ '--swatch-color': c, background: c }}
                aria-label={`Colour ${c}`}
              >
                {color === c && <IconCheck size={13} className="color-check-icon" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FIXED DOCKED FOOTER - SEPARATE SIBLING, NEVER OVERLAPS */}
      <div className="le-modal-footer">
        <div className="le-footer-hint">
          <span className="le-kbd-combo">
            <kbd className="le-kbd">↵</kbd>
            <span>Enter to save</span>
          </span>
          <span className="le-kbd-divider">•</span>
          <span className="le-kbd-combo">
            <kbd className="le-kbd">⌘S</kbd>
            <span>or Ctrl+Enter</span>
          </span>
        </div>
        <div className="le-footer-actions">
          <Button
            type="button"
            size="md"
            variant="subtle"
            className="le-cancel"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="md"
            loading={busy}
            className="le-submit gradient-btn"
          >
            {editingLink ? 'Save changes' : 'Add to universe'}
          </Button>
        </div>
      </div>
    </form>
  )
}

export default function AddEditLinkModal() {
  const open = useUiStore((s) => s.editorOpen)
  const editingLink = useUiStore((s) => s.editingLink)
  const closeEditor = useUiStore((s) => s.closeEditor)

  const links = useLinkStore((s) => s.links)
  const collections = useLinkStore((s) => s.collections)
  const tags = useLinkStore((s) => s.tags)
  const addLink = useLinkStore((s) => s.addLink)
  const updateLink = useLinkStore((s) => s.updateLink)
  const addCollection = useLinkStore((s) => s.addCollection)

  return (
    <Modal
      opened={open}
      onClose={closeEditor}
      title={
        <div className="le-title-wrap">
          <div className="le-title-icon-badge">
            {editingLink ? (
              <IconEdit size={18} className="le-title-icon" />
            ) : (
              <IconSparkles size={18} className="le-title-icon" />
            )}
          </div>
          <div>
            <div className="le-title-main">
              {editingLink ? 'Edit bookmark' : 'Save a new link'}
            </div>
            <div className="le-title-sub">
              {editingLink
                ? 'Fine-tune metadata and tags for this link.'
                : 'Add a new bookmark to your universe.'}
            </div>
          </div>
        </div>
      }
      size="lg"
      padding={0}
      centered
      classNames={{
        root: 'le-modal-root',
        content: 'le-modal-content',
        header: 'le-modal-header',
        title: 'le-modal-title',
        body: 'le-modal-body',
        close: 'le-modal-close',
      }}
    >
      {open && (
        <LinkEditorForm
          key={editingLink?._id || 'create'}
          link={editingLink}
          links={links}
          collections={collections}
          tags={tags}
          addLink={addLink}
          updateLink={updateLink}
          addCollection={addCollection}
          onClose={closeEditor}
        />
      )}
    </Modal>
  )
}