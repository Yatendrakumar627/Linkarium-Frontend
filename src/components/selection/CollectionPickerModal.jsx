import { useState } from 'react'
import { Button, Modal, Stack, Text, UnstyledButton } from '@mantine/core'
import { IconFolder, IconPlus } from '@tabler/icons-react'
import { useLinkStore } from '../../store/linkStore'
import './CollectionPickerModal.css'

export default function CollectionPickerModal({ opened, onClose, onConfirm }) {
  const collections = useLinkStore((s) => s.collections)
  const [selectedId, setSelectedId] = useState(null)

  const handleConfirm = () => {
    onConfirm(selectedId)
    setSelectedId(null)
  }

  const handleNone = () => {
    onConfirm(null)
    setSelectedId(null)
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Move to collection" size="sm">
      <Stack className="collection-picker-body">
        <Text size="sm" c="dimmed">
          Choose a collection to move the selected links to.
        </Text>

        <UnstyledButton
          className={`collection-picker-item ${selectedId === null ? 'selected' : ''}`}
          onClick={handleNone}
        >
          <div className="collection-picker-dot" style={{ background: 'var(--text-secondary)' }} />
          <Text size="sm" fw={500}>No collection</Text>
        </UnstyledButton>

        {collections.map((c) => (
          <UnstyledButton
            key={c.id}
            className={`collection-picker-item ${selectedId === c.id ? 'selected' : ''}`}
            onClick={() => setSelectedId(c.id)}
          >
            <div className="collection-picker-dot" style={{ background: c.color || '#8b5cf6' }} />
            <Text size="sm" fw={500}>{c.name}</Text>
            <Text size="xs" c="dimmed" ml="auto">{c.count ?? 0}</Text>
          </UnstyledButton>
        ))}

        {collections.length === 0 && (
          <Text size="sm" c="dimmed" ta="center" py="md">
            No collections yet. Create one first.
          </Text>
        )}

        <div className="collection-picker-actions">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button className="gradient-btn" onClick={handleConfirm}>Move here</Button>
        </div>
      </Stack>
    </Modal>
  )
}
