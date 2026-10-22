import { useEffect, useState } from 'react'
import { notifications } from '@mantine/notifications'
import { IconBookmark, IconCheck, IconPalette } from '@tabler/icons-react'
import { useUiStore } from '../../store/uiStore'
import { useSavedViewStore } from '../../store/savedViewStore'
import { ICON_NAMES, iconFor } from '../../utils/icons'
import QueryField from './QueryField'
import {
  AppButton,
  AppModal,
  AppModalBody,
  AppModalFooter,
  AppModalHeader,
  AppModalSection,
} from '../common/ModalShell'
import './SavedViewEditor.css'

// The palette offered for a saved view's colour.
const COLORS = [
  '#8b5cf6',
  '#3b82f6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#94a3b8',
]

// Create or edit a saved view.
//
// A saved view is just a name and a query — the same query language the
// search box speaks. The icon and colour are decoration, but they make the
// sidebar readable when there are more than a handful of views.
function ViewIcon({ name, size = 16 }) {
  const Comp = iconFor(name)
  return <Comp size={size} />
}

export default function SavedViewEditor() {
  const editor = useUiStore((s) => s.savedViewEditor)
  const close = useUiStore((s) => s.closeSavedViewEditor)

  const createView = useSavedViewStore((s) => s.create)
  const updateView = useSavedViewStore((s) => s.update)

  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [icon, setIcon] = useState('IconBookmark')
  const [color, setColor] = useState('#8b5cf6')
  const [saving, setSaving] = useState(false)

  const isEdit = editor?.mode === 'edit'
  const existing = editor?.view

  useEffect(() => {
    if (!editor) return
    setName(existing?.name || '')
    setQuery(existing?.query || '')
    setIcon(existing?.icon || 'IconBookmark')
    setColor(existing?.color || '#8b5cf6')
    setSaving(false)
  }, [editor, existing])

  if (!editor) return null

  const handleSave = async () => {
    if (!name.trim()) {
      notifications.show({ message: 'Give the view a name.', color: 'gray' })
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await updateView(existing._id, { name: name.trim(), query, icon, color })
        notifications.show({ message: 'Saved view updated', color: 'cyan' })
      } else {
        await createView({ name: name.trim(), query, icon, color, kind: 'view' })
        notifications.show({ message: 'Saved view created', color: 'cyan' })
      }
      close()
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppModal opened onClose={close} size="lg" className="saved-view-root">
      <AppModalHeader
        icon={<IconBookmark size={20} />}
        title={isEdit ? 'Edit saved view' : 'New saved view'}
        subtitle="A saved filter that lives in your sidebar"
        onClose={saving ? undefined : close}
      />

      <AppModalBody className="saved-view-body">
        <AppModalSection label="Identity" className="saved-view-identity">
          <div className="saved-view-identity-row">
            <div className="saved-view-identity-preview">
              <div
                className="saved-view-preview-mark"
                style={{ color, background: `${color}22`, borderColor: `${color}55` }}
              >
                <ViewIcon name={icon} size={18} />
              </div>
              <div className="saved-view-preview-text">
                <div className="saved-view-preview-name">{name.trim() || 'Untitled view'}</div>
                <div className="saved-view-preview-query">
                  {query.trim() || 'matches everything'}
                </div>
              </div>
            </div>

            <div className="saved-view-fields">
              <div className="app-modal-field">
                <label className="app-modal-label" htmlFor="saved-view-name">
                  Name
                </label>
                <input
                  id="saved-view-name"
                  className="app-modal-input"
                  placeholder="AI reading list"
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  data-autofocus
                  maxLength={60}
                />
              </div>

              <div className="app-modal-field">
                <span className="app-modal-label">
                  <IconPalette size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />
                  Colour
                </span>
                <div className="sv-color-row">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`sv-color-dot ${c === color ? 'is-active' : ''}`}
                      style={{ background: c }}
                      onClick={() => setColor(c)}
                      aria-label={`Colour ${c}`}
                      aria-pressed={c === color}
                    >
                      {c === color ? <IconCheck size={13} color="#fff" /> : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </AppModalSection>

        <AppModalSection label="Query">
          <QueryField
            value={query}
            onChange={setQuery}
            label=""
            placeholder="tag:ai is:favorite"
          />
        </AppModalSection>

        <AppModalSection label="Icon">
          <div className="sv-icon-grid">
            {ICON_NAMES.map((n) => {
              const Ico = iconFor(n)
              return (
                <button
                  key={n}
                  type="button"
                  className={`sv-icon-btn ${n === icon ? 'is-active' : ''}`}
                  onClick={() => setIcon(n)}
                  title={n}
                  aria-label={n}
                  aria-pressed={n === icon}
                >
                  <Ico size={16} />
                </button>
              )
            })}
          </div>
        </AppModalSection>
      </AppModalBody>

      <AppModalFooter>
        <AppButton variant="subtle" onClick={close} disabled={saving}>
          Cancel
        </AppButton>
        <AppButton
          onClick={handleSave}
          loading={saving}
          leftSection={<ViewIcon name={icon} size={15} />}
        >
          {isEdit ? 'Save changes' : 'Create view'}
        </AppButton>
      </AppModalFooter>
    </AppModal>
  )
}
