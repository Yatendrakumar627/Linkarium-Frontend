import { Text } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconX, IconCheck, IconSquare, IconArrowBackUp, IconTrash } from '@tabler/icons-react'
import { useUiStore } from '../../store/uiStore'
import { useLinkStore } from '../../store/linkStore'
import './SelectionToolbar.css'

export default function TrashToolbar() {
  const selectionMode = useUiStore((s) => s.selectionMode)
  const selectedIds = useUiStore((s) => s.selectedIds)
  const exitSelectionMode = useUiStore((s) => s.exitSelectionMode)
  const selectAll = useUiStore((s) => s.selectAll)
  const deselectAll = useUiStore((s) => s.deselectAll)

  const trashLinks = useLinkStore((s) => s.trashLinks)
  const bulkRestore = useLinkStore((s) => s.bulkRestore)
  const bulkPermanentDelete = useLinkStore((s) => s.bulkPermanentDelete)

  if (!selectionMode) return null

  const count = selectedIds.size
  const allIds = trashLinks.map((l) => l._id)
  const allSelected = count === allIds.length && allIds.length > 0

  const handleSelectAll = () => {
    if (allSelected) deselectAll()
    else selectAll(allIds)
  }

  const handleRestore = async () => {
    try {
      await bulkRestore([...selectedIds])
      exitSelectionMode()
      notifications.show({ message: `${count} link(s) restored`, color: 'green' })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    }
  }

  const handleDeleteForever = () => {
    modals.openConfirmModal({
      title: `Permanently delete ${count} link(s)?`,
      children: 'These link(s) will be permanently deleted. This cannot be undone.',
      labels: { confirm: 'Delete Forever', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await bulkPermanentDelete([...selectedIds])
          exitSelectionMode()
          notifications.show({ message: `${count} link(s) permanently deleted`, color: 'green' })
        } catch (err) {
          notifications.show({ message: err.message, color: 'red' })
        }
      },
    })
  }

  return (
    <div className="selection-toolbar">
      <div className="selection-toolbar-inner">
        <button className="selection-close-btn" onClick={exitSelectionMode} title="Exit selection">
          <IconX size={18} />
        </button>

        <Text size="sm" fw={600} className="selection-count">
          {count} selected
        </Text>

        <div className="selection-toolbar-spacer" />

        <button
          className="selection-action-btn"
          onClick={handleSelectAll}
          title={allSelected ? 'Deselect all' : 'Select all'}
        >
          {allSelected ? <IconSquare size={15} /> : <IconCheck size={15} />}
          <span>{allSelected ? 'Deselect' : 'Select All'}</span>
        </button>

        <button className="selection-action-btn" onClick={handleRestore} title="Restore selected">
          <IconArrowBackUp size={15} />
          <span>Restore</span>
        </button>

        <button className="selection-action-btn danger" onClick={handleDeleteForever} title="Delete selected forever">
          <IconTrash size={15} />
          <span>Delete Forever</span>
        </button>
      </div>
    </div>
  )
}