import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Combobox, InputBase, Loader, Modal, TagsInput, TextInput, Textarea, Switch, useCombobox } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconAlertTriangle, IconCheck, IconCornerDownLeft, IconEdit, IconLink, IconSparkles } from '@tabler/icons-react'
import { ACCENT_COLORS } from '../../constants'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import { metadataApi } from '../../api/endpoints'
import { faviconUrl, hostOf } from '../../utils'
import './AddEditLinkModal.css'

const isLikelyUrl = (value) => {
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
      {c.name}
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
    >
      <Combobox.Target>
        <InputBase
          label="Collection"
          placeholder="No collection"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => {
            setSearch(selected?.name || '')
            combobox.closeDropdown()
          }}
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
        />
      </Combobox.Target>

      <Combobox.Dropdown className="le-dropdown">
        <Combobox.Options>
          {options}
          {createName && (
            <Combobox.Option value="$create">+ New collection "{createName}"</Combobox.Option>
          )}
          {!createName && options.length === 0 && (
            <Combobox.Empty>No collections yet — type a name to create one.</Combobox.Empty>
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

  const suggestSeq = useRef(0)
  const busyRef = useRef(false)
  const titleRef = useRef('')

  useEffect(() => {
    titleRef.current = title
    busyRef.current = busy
  })

  const existingTags = Array.from(new Set(tags.map((t) => t.tag)))

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
      const name = (res && res.name) || ''
      setSiteName(name)
      if (name && !titleRef.current.trim()) {
        setTitle(name)
        setSuggested(true)
      }
    } catch {
      if (seq !== suggestSeq.current) return
      setSiteName('')
      setExtractError(true)
    } finally {
      if (seq === suggestSeq.current) setExtracting(false)
    }
  }, [])

  useEffect(() => {
    const v = url.trim()
    if (!isLikelyUrl(v)) return
    const timer = setTimeout(() => runExtract(v), 600)
    return () => clearTimeout(timer)
  }, [url, runExtract])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!title.trim() || !url.trim()) {
      notifications.show({ message: 'Title and URL are required.', color: 'red' })
      return
    }
    setBusy(true)
    try {
      const payload = {
        title: title.trim(),
        url: url.trim(),
        description: description.trim(),
        tags: linkTags,
        collectionId: collectionId || undefined,
        color,
      }

      if (editingLink) {
        const canFavorite = links.some((l) => l._id === editingLink._id)
        await updateLink(editingLink._id, { ...payload, favorite: canFavorite ? favorite : undefined })
        notifications.show({ message: 'Link updated', color: 'green' })
      } else {
        await addLink({ ...payload, favorite })
        notifications.show({ message: 'Link saved to your universe', color: 'green' })
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
  const favicon = faviconUrl(trimmedUrl)
  const domain = hostOf(trimmedUrl)
  const showPreview = extracting || extractError || siteName || isLikelyUrl(trimmedUrl)

  let previewStatus
  if (extracting) {
    previewStatus = (
      <>
        <Loader size={12} />
        Fetching site info…
      </>
    )
  } else if (extractError) {
    previewStatus = <span className="le-preview-error">Couldn't read site info — you can still save this link.</span>
  } else if (siteName) {
    previewStatus = (
      <>
        <IconCheck size={13} className="le-preview-check" />
        {suggested ? `Title auto-filled from "${siteName}"` : `Detected name: ${siteName}`}
      </>
    )
  } else if (isLikelyUrl(trimmedUrl)) {
    previewStatus = (
      <>
        <IconCheck size={13} className="le-preview-check" />
        Ready
      </>
    )
  } else {
    previewStatus = 'Enter a valid URL to fetch its site info'
  }

  if (duplicate) {
    return (
      <div className="le-conflict">
        <div className="le-conflict-header">
          <IconAlertTriangle size={20} className="le-conflict-icon" />
          <div>
            <div className="le-conflict-title">Duplicate link found</div>
            <div className="le-conflict-sub">
              This URL is already saved. Choose which link to keep — only one will be kept.
            </div>
          </div>
        </div>

        <div className="le-conflict-compare">
          <div className="le-conflict-card">
            <div className="le-conflict-card-head">Existing link</div>
            <div className="le-conflict-card-title">{duplicate.title || 'Untitled'}</div>
            <div className="le-conflict-card-url">{duplicate.url}</div>
            <div className="le-conflict-card-meta">
              Saved {new Date(duplicate.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div className="le-conflict-vs">vs</div>
          <div className="le-conflict-card le-conflict-card-new">
            <div className="le-conflict-card-head">Your new link</div>
            <div className="le-conflict-card-title">{title.trim() || 'Untitled'}</div>
            <div className="le-conflict-card-url">{url.trim()}</div>
          </div>
        </div>

        <div className="le-conflict-actions">
          <Button type="button" size="md" variant="light" className="le-cancel" onClick={() => setDuplicate(null)} disabled={busy}>
            Edit
          </Button>
          <Button type="button" size="md" variant="light" className="le-cancel" onClick={onClose} disabled={busy}>
            Keep existing
          </Button>
          <Button type="button" size="md" loading={busy} className="le-submit gradient-btn" onClick={replaceWithMine}>
            Replace with mine
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="le-form">
      <section className="le-section">

        <TextInput
          className="le-url-input"
        label="URL"
        placeholder="https://example.com"
        required
        value={url}
        onChange={(e) => {
          const next = e.currentTarget.value
          setUrl(next)
          setSiteName('')
          setExtractError(false)
          setSuggested(false)
          if (!isLikelyUrl(next)) setExtracting(false)
        }}
        onBlur={() => runExtract(url)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
        }}
        leftSection={
          favicon ? <img src={favicon} alt="" className="le-url-favicon" /> : <IconLink size={16} className="le-url-icon" />
        }
        rightSection={extracting ? <Loader size={16} /> : undefined}
        rightSectionPointerEvents="none"
      />

      {showPreview && (
        <div className="le-url-preview">
          <span className="le-preview-favicon">
            {favicon ? <img src={favicon} alt="" /> : <IconLink size={15} className="le-url-icon" />}
          </span>
          <div className="le-preview-info">
            <div className="le-preview-domain">{isLikelyUrl(trimmedUrl) ? domain : '—'}</div>
            <div className="le-preview-status">{previewStatus}</div>
          </div>
        </div>
      )}

      <TextInput
        label="Title"
        placeholder="e.g. The perfect cup of coffee"
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
              Suggested
            </span>
          ) : undefined
        }
        rightSectionWidth={suggested ? 108 : 40}
      />
      </section>

      <section className="le-section">

        <Textarea
          className="le-description"
        label="Description"
        placeholder="Add a short description..."
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
        autosize
        minRows={2}
        maxRows={4}
      />

      <TagsInput
        label="Tags"
        placeholder="Add tags…"
        data={existingTags}
        value={linkTags}
        onChange={setLinkTags}
        searchable
        clearable
        comboboxProps={{ dropdownProps: { className: 'le-dropdown' } }}
      />
      </section>

      <section className="le-section">

        <CollectionSelect
        collections={collections}
        value={collectionId || null}
        onChange={(v) => typeof v === 'string' && setCollectionId(v)}
        addCollection={addCollection}
      />

      <div className="le-row">
        <div>
          <div className="le-colors">
            {ACCENT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`color-swatch ${color === c ? 'selected' : ''}`}
                style={{ background: c }}
                aria-label={`Colour ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="le-fav">
          <Switch
            label={editingLink ? 'Favorite' : 'Mark as favorite'}
            checked={favorite}
            onChange={(e) => setFavorite(e.currentTarget.checked)}
          />
        </div>
      </div>
      </section>

      <div className="le-footer">
        <span className="le-footer-hint">
          <IconCornerDownLeft size={14} />
          Enter saves
        </span>
        <div className="le-footer-actions">
          <Button type="button" size="md" variant="light" className="le-cancel" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" size="md" loading={busy} className="le-submit gradient-btn">
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
          <span className="le-title-line">
            {editingLink ? (
              <IconEdit size={18} className="le-title-icon" />
            ) : (
              <IconSparkles size={18} className="le-title-icon" />
            )}
            {editingLink ? 'Edit link' : 'Save a new link'}
          </span>
          <span className="le-title-sub">
            {editingLink ? 'Fine-tune the details of this bookmark.' : 'Add a new bookmark to your universe.'}
          </span>
        </div>
      }
      size="lg"
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