import { useEffect, useState } from 'react'
import { Modal, TextInput, Button, Group, Stack, Popover, ActionIcon } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCheck, IconPalette } from '@tabler/icons-react'
import { useUiStore } from '../../store/uiStore'
import { useSavedViewStore } from '../../store/savedViewStore'
import { ICON_NAMES, iconFor } from '../../utils/icons'
import QueryField from './QueryField'
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
        notifications.show({ message: 'Saved view updated', color: 'green' })
      } else {
        await createView({ name: name.trim(), query, icon, color, kind: 'view' })
        notifications.show({ message: 'Saved view created', color: 'green' })
      }
      close()
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      opened
      onClose={close}
      title={isEdit ? 'Edit saved view' : 'New saved view'}
      centered
      size="lg"
    >
      <Stack gap="md">
        <Group align="flex-end" gap="sm" wrap="nowrap">
          <TextInput
            label="Name"
            placeholder="AI reading list"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            style={{ flex: 1 }}
            data-autofocus
          />

          <Popover width={260} position="bottom-end" shadow="md">
            <Popover.Target>
              <ActionIcon
                variant="default"
                size={36}
                title="Pick a colour"
                style={{ color }}
              >
                <IconPalette size={18} />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <Group gap={8}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`sv-color-dot ${c === color ? 'is-active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                    aria-label={`Colour ${c}`}
                  >
                    {c === color && <IconCheck size={13} color="#fff" />}
                  </button>
                ))}
              </Group>
            </Popover.Dropdown>
          </Popover>
        </Group>

        <QueryField
          value={query}
          onChange={setQuery}
          label="Query"
          placeholder="tag:ai is:favorite"
        />

        <div>
          <div className="sv-label">Icon</div>
          <Group gap={6} wrap="wrap">
            {ICON_NAMES.map((name) => {
              const Ico = iconFor(name)
              return (
                <button
                  key={name}
                  type="button"
                  className={`sv-icon-btn ${name === icon ? 'is-active' : ''}`}
                  onClick={() => setIcon(name)}
                  title={name}
                  aria-label={name}
                >
                  <Ico size={16} />
                </button>
              )
            })}
          </Group>
        </div>

        <Group gap={8} justify="flex-end">
          <Button variant="subtle" color="gray" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} leftSection={<ViewIcon name={icon} size={16} />}>
            {isEdit ? 'Save changes' : 'Create view'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
