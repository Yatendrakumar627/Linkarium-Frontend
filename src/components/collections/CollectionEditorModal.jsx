import { useMemo, useRef, useState } from 'react'
import { notifications } from '@mantine/notifications'
import {
  IconFolderPlus,
  IconFolder,
  IconCheck,
  IconX,
  IconPalette,
  IconAlertCircle,
} from '@tabler/icons-react'
import { ACCENT_COLORS } from '../../constants'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import { readableTextOn } from '../../utils'
import { normalizeHsl } from '../../utils/colorUtils'
import ShareSettings from './ShareSettings'
import {
  AppButton,
  AppModal,
  AppModalFooter,
  AppModalHeader,
  AppModalSection,
} from '../common/ModalShell'
import './CollectionEditorModal.css'

// The API stores names in a maxlength: 60 field behind a unique (user, name)
// index, so both rules are mirrored here to avoid a failed round trip.
const MAX_NAME_LENGTH = 60

/** Normalise any hex to the 6-digit lower-case form the API accepts. */
function normalizeHex(value) {
  if (typeof value !== 'string') return null
  const hex = value.trim().replace(/^#/, '')
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex
  return `#${full.toLowerCase()}`
}

function CollectionForm({ collection, isEdit, addCollection, updateCollection, onClose }) {
  const [name, setName] = useState(collection?.name || '')
  const [color, setColor] = useState(() => normalizeHex(collection?.color) || ACCENT_COLORS[0])
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState(false)
  const swatchRefs = useRef([])
  const collections = useLinkStore((s) => s.collections)

  const trimmedName = name.trim()

  // The API rejects a hex that is not exactly six digits.
  const pickerColor = useMemo(() => normalizeHex(color) || ACCENT_COLORS[0], [color])

  const selectedIndex = ACCENT_COLORS.findIndex((c) => c.toLowerCase() === color.toLowerCase())
  const isCustomColor = selectedIndex === -1
  // Roving tabindex: the active swatch is the only one in the tab order.
  const rovingIndex = selectedIndex === -1 ? 0 : selectedIndex

  const targetId = collection?.id || collection?._id

  const duplicate = useMemo(() => {
    if (!trimmedName) return null
    const key = trimmedName.toLowerCase()
    return (
      collections.find(
        (c) => (c.id || c._id) !== targetId && String(c.name || '').trim().toLowerCase() === key
      ) || null
    )
  }, [collections, trimmedName, targetId])

  const error = duplicate
    ? 'A collection with this name already exists.'
    : !trimmedName && (submitted || touched)
      ? 'Collection name is required.'
      : null

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setSubmitted(true)
    setTouched(true)
    if (!trimmedName || duplicate) return

    setBusy(true)
    try {
      if (isEdit) {
        await updateCollection(targetId, { name: trimmedName, color })
        notifications.show({ message: 'Collection updated', color: 'cyan' })
      } else {
        await addCollection(trimmedName, color)
        notifications.show({ message: 'Collection created', color: 'cyan' })
      }
      onClose()
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setBusy(false)
    }
  }

  const handleSwatchKeyDown = (e, index) => {
    const total = ACCENT_COLORS.length
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % total
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + total) % total
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = total - 1
    if (next === null) return
    e.preventDefault()
    setColor(ACCENT_COLORS[next])
    swatchRefs.current[next]?.focus()
  }

  return (
    <form onSubmit={submit} className="collection-modal-container">
      <AppModalHeader
        icon={isEdit ? <IconFolder size={20} /> : <IconFolderPlus size={20} />}
        title={isEdit ? 'Edit collection' : 'New collection'}
        subtitle={
          isEdit ? 'Rename it or give it a new colour' : 'Group your links into a themed space'
        }
        onClose={onClose}
      />

      <div className="collection-modal-scroll">
        <AppModalSection>
          <label className="app-modal-label" htmlFor="collection-name-input">
            Name
          </label>
          <div className={`collection-input-wrap ${error ? 'has-error' : ''}`}>
            <input
              id="collection-name-input"
              className="collection-text-input"
              type="text"
              placeholder="e.g. Work, Inspiration, Reading…"
              value={name}
              maxLength={MAX_NAME_LENGTH}
              autoFocus
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'collection-name-error' : undefined}
              onChange={(e) => setName(e.currentTarget.value)}
              onBlur={() => setTouched(true)}
            />
            {name && (
              <button
                type="button"
                className="collection-input-clear"
                onClick={() => {
                  setName('')
                  setTouched(false)
                  setSubmitted(false)
                }}
                aria-label="Clear name"
              >
                <IconX size={14} />
              </button>
            )}
          </div>
          <div className="collection-field-foot">
            {error ? (
              <span className="collection-field-error" id="collection-name-error">
                <IconAlertCircle size={13} />
                {error}
              </span>
            ) : (
              <span className="collection-field-hint">Visible in your sidebar and in Visual mode.</span>
            )}
            <span className="collection-char-count">
              {name.length}/{MAX_NAME_LENGTH}
            </span>
          </div>
        </AppModalSection>

        <AppModalSection>
          <div className="app-modal-label">Colour</div>
          <div className="collection-color-row">
            <div className="collection-colors" role="radiogroup" aria-label="Collection colour">
              {ACCENT_COLORS.map((c, i) => {
                const selected = c.toLowerCase() === color.toLowerCase()
                return (
                  <button
                    key={c}
                    ref={(el) => {
                      swatchRefs.current[i] = el
                    }}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`Colour ${c}`}
                    tabIndex={i === rovingIndex ? 0 : -1}
                    className={`collection-swatch ${selected ? 'selected' : ''}`}
                    style={{ background: c, '--swatch': c }}
                    onClick={() => setColor(c)}
                    onKeyDown={(e) => handleSwatchKeyDown(e, i)}
                  >
                    {selected && (
                      <IconCheck size={15} stroke={3} color={readableTextOn(c)} />
                    )}
                  </button>
                )
              })}
            </div>

            <label
              className={`collection-custom-swatch ${isCustomColor ? 'selected' : ''}`}
              style={{ '--swatch': color }}
              title="Custom colour"
            >
              <input
                type="color"
                value={pickerColor}
                onChange={(e) => setColor(e.currentTarget.value)}
                aria-label="Pick a custom colour"
              />
              <IconPalette size={16} />
            </label>
          </div>
        </AppModalSection>

        <AppModalSection>
          <div className="app-modal-label">Preview</div>
          <div className="collection-preview">
            <div className="collection-preview-row">
              <span
                className="collection-preview-dot"
                style={{ background: color, boxShadow: `0 0 10px ${color}66` }}
              />
              <span className="collection-preview-name">
                {trimmedName || 'Untitled collection'}
              </span>
              <span className="collection-preview-count">0</span>
            </div>
            <span className="collection-preview-caption">Sidebar item</span>

            <div className="collection-card-preview-row">
              <span
                className="collection-card-pill-preview"
                style={{ '--col-color': normalizeHsl(pickerColor) || pickerColor }}
              >
                <IconFolder size={11} stroke={1.8} />
                <span>{trimmedName || 'Collection name'}</span>
              </span>
              <span className="collection-preview-caption">Card badge (balanced)</span>
            </div>
          </div>
        </AppModalSection>

        {isEdit && (
          <AppModalSection className="collection-share-section">
            <ShareSettings collection={collection} />
          </AppModalSection>
        )}
      </div>

      <AppModalFooter meta={isEdit ? 'Changes apply immediately' : 'You can rename it later'}>
        <AppButton variant="subtle" onClick={onClose} disabled={busy}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={busy}>
          {isEdit ? 'Save changes' : 'Create collection'}
        </AppButton>
      </AppModalFooter>
    </form>
  )
}

export default function CollectionEditorModal() {
  const state = useUiStore((s) => s.collectionEditor)
  const close = useUiStore((s) => s.closeCollectionEditor)
  const addCollection = useLinkStore((s) => s.addCollection)
  const updateCollection = useLinkStore((s) => s.updateCollection)

  const isEdit = state?.mode === 'edit'
  const editing = state?.collection || null

  return (
    <AppModal
      opened={!!state}
      onClose={close}
      size="md"
      className="collection-modal-root"
    >
      {state && (
        <CollectionForm
          key={editing?.id || editing?._id || 'create'}
          collection={editing}
          isEdit={isEdit}
          addCollection={addCollection}
          updateCollection={updateCollection}
          onClose={close}
        />
      )}
    </AppModal>
  )
}
