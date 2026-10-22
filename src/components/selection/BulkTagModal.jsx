import { useEffect, useState } from 'react'
import { Modal, TagsInput, Button, Group, Stack } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'

// Tag several links at once.
//
// The tag list is seeded with the tags the selected links already carry, so
// the user can add to them without retyping.
export default function BulkTagModal({ opened, onClose, onConfirm }) {
  const tags = useLinkStore((s) => s.tags)
  const links = useLinkStore((s) => s.links)
  const selectedIds = useUiStore((s) => s.selectedIds)

  const [value, setValue] = useState([])

  useEffect(() => {
    if (!opened) return
    const existing = new Set()
    for (const link of links) {
      if (!selectedIds.has(link._id)) continue
      for (const tag of link.tags || []) existing.add(tag)
    }
    setValue([...existing])
  }, [opened, links, selectedIds])

  const handleConfirm = async () => {
    if (!value.length) {
      notifications.show({ message: 'Pick at least one tag.', color: 'gray' })
      return
    }
    await onConfirm(value)
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Tag selected links" centered>
      <Stack gap="sm">
        <TagsInput
          value={value}
          onChange={setValue}
          placeholder="Type a tag and press Enter"
          data={(tags || []).map((t) => t.tag)}
          clearable
        />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Apply tags</Button>
        </Group>
      </Stack>
    </Modal>
  )
}
