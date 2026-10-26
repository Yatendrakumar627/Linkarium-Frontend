import { useMemo, useRef, useState } from 'react'
import { notifications } from '@mantine/notifications'
import {
  IconTag,
  IconCheck,
  IconX,
  IconPalette,
  IconAlertCircle,
  IconTrash,
  IconFolder,
  IconSparkles,
} from '@tabler/icons-react'
import { ACCENT_COLORS } from '../../constants'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import { readableTextOn } from '../../utils'
import { tagToColor, normalizeHsl, getCustomTagColor } from '../../utils/colorUtils'
import {
  AppButton,
  AppModal,
  AppModalFooter,
  AppModalHeader,
  AppModalSection,
} from '../common/ModalShell'
import './TagEditorModal.css'

const MAX_NAME_LENGTH = 50

const SWATCHES = [
  ...ACCENT_COLORS,
  '#00d68f', // Electric Mint
  '#f43f7d', // Electric Rose
]

/** Normalise any hex to the 6-digit lower-case form the API accepts. */
function normalizeHex(value) {
  if (typeof value !== 'string') return null
  const hex = value.trim().replace(/^#/, '')
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex
  return `#${full.toLowerCase()}`
}

function cleanTagName(str) {
  return String(str || '')
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
}

function TagForm({ tagData, onClose }) {
  const originalTag = cleanTagName(tagData?.tag)
  const tagCount = tagData?.count || 0

  // Existing custom color if configured
  const existingCustom = normalizeHex(tagData?.color) || normalizeHex(getCustomTagColor(originalTag))
  const initialColor = existingCustom || null

  const [name, setName] = useState(originalTag)
  const [color, setColor] = useState(initialColor) // null means Auto (FNV-1a)
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState(false)
  const swatchRefs = useRef([])

  const tags = useLinkStore((s) => s.tags)
  const updateTagColor = useLinkStore((s) => s.updateTagColor)
  const renameTag = useLinkStore((s) => s.renameTag)
  const deleteTag = useLinkStore((s) => s.deleteTag)
  const openConfirmDialog = useUiStore((s) => s.openConfirmDialog)

  const trimmedName = cleanTagName(name)

  // Determine current active display color (custom color or auto FNV-1a)
  const autoColor = useMemo(() => tagToColor(trimmedName || originalTag || 'tag'), [trimmedName, originalTag])
  const activeDisplayColor = color ? (normalizeHsl(color) || color) : autoColor

  // Picker color fallback for <input type="color">
  const pickerColor = useMemo(() => normalizeHex(color) || '#00e5ff', [color])

  const selectedIndex = color ? SWATCHES.findIndex((c) => c.toLowerCase() === color.toLowerCase()) : -1
  const isCustomColor = Boolean(color && selectedIndex === -1)
  const isAutoColor = color === null

  const duplicate = useMemo(() => {
    if (!trimmedName) return null
    if (trimmedName === originalTag) return null
    return tags.some((t) => cleanTagName(t.tag) === trimmedName)
  }, [tags, trimmedName, originalTag])

  const error = duplicate
    ? `A tag #${trimmedName} already exists.`
    : !trimmedName && (submitted || touched)
      ? 'Tag name cannot be empty.'
      : null

  const hasChanges = trimmedName !== originalTag || color !== initialColor

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setSubmitted(true)
    setTouched(true)
    if (!trimmedName || duplicate) return
    if (!hasChanges) {
      onClose()
      return
    }

    setBusy(true)
    try {
      let targetName = originalTag

      // 1. Rename if name changed
      if (trimmedName !== originalTag) {
        await renameTag(originalTag, trimmedName)
        targetName = trimmedName
      }

      // 2. Update color (or reset to null) if color changed
      if (color !== initialColor) {
        await updateTagColor(targetName, color)
      }

      notifications.show({ message: `Tag #${targetName} updated`, color: 'cyan' })
      onClose()
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteTag = () => {
    openConfirmDialog({
      title: `Delete tag #${originalTag}?`,
      subtitle: 'The tag is removed from all bookmarks',
      tone: 'danger',
      icon: <IconTrash size={20} />,
      confirmLabel: 'Delete tag',
      body: (
        <div>
          <div className="app-modal-entity">
            <IconFolder size={16} style={{ color: activeDisplayColor }} />
            <span className="app-modal-entity-name">#{originalTag}</span>
            <span className="app-modal-entity-count">
              {tagCount} {tagCount === 1 ? 'link' : 'links'}
            </span>
          </div>
          <ul className="app-modal-consequences">
            <li className="is-destructive">
              <IconTrash size={14} />
              <span>
                Tag <strong>#{originalTag}</strong> and its color settings are removed.
              </span>
            </li>
            <li className="is-safe">
              <IconCheck size={14} />
              <span>
                Your bookmarks are kept intact in your library.
              </span>
            </li>
          </ul>
        </div>
      ),
      onConfirm: async () => {
        try {
          await deleteTag(originalTag)
          notifications.show({ message: `Tag #${originalTag} deleted`, color: 'cyan' })
          onClose()
        } catch (err) {
          notifications.show({ message: err.message, color: 'red' })
        }
      },
    })
  }

  const handleSwatchKeyDown = (e, index) => {
    const total = SWATCHES.length
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % total
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + total) % total
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = total - 1
    if (next === null) return
    e.preventDefault()
    setColor(SWATCHES[next])
    swatchRefs.current[next]?.focus()
  }

  return (
    <form onSubmit={submit} className="tag-modal-container">
      <AppModalHeader
        icon={<IconTag size={20} />}
        title={`Edit tag: #${originalTag}`}
        subtitle="Customize tag color, rename across all bookmarks, or reset to auto"
        onClose={onClose}
      />

      <div className="tag-modal-scroll">
        <AppModalSection>
          <label className="app-modal-label" htmlFor="tag-name-input">
            Tag Name
          </label>
          <div className={`tag-input-wrap ${error ? 'has-error' : ''}`}>
            <span className="tag-prefix-symbol">#</span>
            <input
              id="tag-name-input"
              className="tag-text-input"
              type="text"
              placeholder="e.g. website, ai, games…"
              value={name}
              maxLength={MAX_NAME_LENGTH}
              autoFocus
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'tag-name-error' : undefined}
              onChange={(e) => setName(e.currentTarget.value.replace(/^#+/, ''))}
              onBlur={() => setTouched(true)}
            />
            {name && (
              <button
                type="button"
                className="tag-input-clear"
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
          <div className="tag-field-foot">
            {error ? (
              <span className="tag-field-error" id="tag-name-error">
                <IconAlertCircle size={13} />
                {error}
              </span>
            ) : (
              <span className="tag-field-hint">
                Renaming updates all {tagCount} bookmark{tagCount === 1 ? '' : 's'} with this tag.
              </span>
            )}
            <span className="tag-char-count">
              {trimmedName.length}/{MAX_NAME_LENGTH}
            </span>
          </div>
        </AppModalSection>

        <AppModalSection>
          <div className="tag-section-header">
            <span className="app-modal-label">Colour Classification</span>
            {isAutoColor ? (
              <span className="tag-mode-pill is-auto">
                <IconSparkles size={12} /> Auto (FNV-1a)
              </span>
            ) : (
              <span className="tag-mode-pill is-custom">
                Custom Color
              </span>
            )}
          </div>

          <div className="tag-color-palette-wrap">
            {/* Reset to Auto Button */}
            <button
              type="button"
              className={`tag-auto-btn ${isAutoColor ? 'selected' : ''}`}
              onClick={() => setColor(null)}
              title="Reset to deterministic FNV-1a auto color"
              aria-label="Auto color (FNV-1a)"
            >
              <IconSparkles size={15} />
              <span>Auto (FNV-1a)</span>
              {isAutoColor && <IconCheck size={14} stroke={3} />}
            </button>

            <div className="tag-colors" role="radiogroup" aria-label="Tag colour presets">
              {SWATCHES.map((c, i) => {
                const selected = color && c.toLowerCase() === color.toLowerCase()
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
                    tabIndex={selected ? 0 : -1}
                    className={`tag-swatch ${selected ? 'selected' : ''}`}
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

            {/* Custom Hex Color Picker */}
            <label
              className={`tag-custom-swatch ${isCustomColor ? 'selected' : ''}`}
              style={{ '--swatch': pickerColor }}
              title="Custom hex color"
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
          <div className="app-modal-label">Live Preview</div>
          <div className="tag-preview-card">
            {/* Preview in Sidebar */}
            <div className="tag-preview-group">
              <span className="tag-preview-group-title">Sidebar Item</span>
              <div className="tag-sidebar-preview-row">
                <IconFolder size={15} style={{ color: activeDisplayColor }} />
                <span className="tag-sidebar-preview-label">
                  <span style={{ color: activeDisplayColor, fontWeight: 700, marginRight: 2 }}>#</span>
                  {trimmedName || 'tag-name'}
                </span>
                <span className="tag-sidebar-preview-count">{tagCount}</span>
              </div>
            </div>

            {/* Preview on Card */}
            <div className="tag-preview-group">
              <span className="tag-preview-group-title">Card Badge</span>
              <div className="tag-card-preview-row">
                <span
                  className="link-tag-chip"
                  style={{ '--tag-color': activeDisplayColor }}
                >
                  #{trimmedName || 'tag-name'}
                </span>
                <span className="tag-preview-caption">
                  {isAutoColor ? 'Derived by FNV-1a hash algorithm' : 'Overridden by your custom color'}
                </span>
              </div>
            </div>
          </div>
        </AppModalSection>
      </div>

      <AppModalFooter
        meta="Applies instantly across cards, 3D scene & sidebar"
        lead={
          <AppButton
            type="button"
            variant="danger"
            size="sm"
            onClick={handleDeleteTag}
            disabled={busy}
          >
            <IconTrash size={14} style={{ marginRight: 4 }} /> Delete tag
          </AppButton>
        }
      >
        <AppButton variant="subtle" onClick={onClose} disabled={busy}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={busy} disabled={Boolean(error)}>
          Save changes
        </AppButton>
      </AppModalFooter>
    </form>
  )
}

export default function TagEditorModal() {
  const tagEditor = useUiStore((s) => s.tagEditor)
  const close = useUiStore((s) => s.closeTagEditor)

  return (
    <AppModal
      opened={Boolean(tagEditor)}
      onClose={close}
      size="md"
      className="tag-modal-root"
    >
      {tagEditor && (
        <TagForm
          key={typeof tagEditor === 'string' ? tagEditor : tagEditor?.tag || 'edit'}
          tagData={typeof tagEditor === 'string' ? { tag: tagEditor } : tagEditor}
          onClose={close}
        />
      )}
    </AppModal>
  )
}
