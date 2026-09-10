import { useState } from 'react'
import { Button, Text } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconX, IconTrash, IconFolderShare, IconDownload, IconCheck, IconSquare } from '@tabler/icons-react'
import { useUiStore } from '../../store/uiStore'
import { useLinkStore } from '../../store/linkStore'
import CollectionPickerModal from './CollectionPickerModal'
import './SelectionToolbar.css'

export default function SelectionToolbar() {
  const selectionMode = useUiStore((s) => s.selectionMode)
  const selectedIds = useUiStore((s) => s.selectedIds)
  const exitSelectionMode = useUiStore((s) => s.exitSelectionMode)
  const selectAll = useUiStore((s) => s.selectAll)
  const deselectAll = useUiStore((s) => s.deselectAll)

  const links = useLinkStore((s) => s.links)
  const bulkDelete = useLinkStore((s) => s.bulkDelete)
  const bulkMove = useLinkStore((s) => s.bulkMove)

  const [moveOpened, setMoveOpened] = useState(false)

  if (!selectionMode) return null

  const count = selectedIds.size
  const allIds = links.map((l) => l._id)
  const allSelected = count === allIds.length && allIds.length > 0

  const handleSelectAll = () => {
    if (allSelected) deselectAll()
    else selectAll(allIds)
  }

  const handleDelete = () => {
    modals.openConfirmModal({
      title: `Move ${count} link(s) to trash?`,
      children: `These link(s) will be permanently deleted after 7 days in trash.`,
      labels: { confirm: 'Move to Trash', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await bulkDelete([...selectedIds])
          exitSelectionMode()
          notifications.show({ message: `${count} link(s) moved to trash`, color: 'green' })
        } catch (err) {
          notifications.show({ message: err.message, color: 'red' })
        }
      },
    })
  }

  const handleMove = () => {
    setMoveOpened(true)
  }

  const handleMoveConfirm = async (collectionId) => {
    try {
      await bulkMove([...selectedIds], collectionId)
      setMoveOpened(false)
      exitSelectionMode()
      notifications.show({ message: `${count} link(s) moved`, color: 'green' })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    }
  }

  const handleExportSelected = async () => {
    const { linksApi } = await import('../../api/endpoints')
    try {
      const { blob, filename } = await linksApi.export('xlsx')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    }
  }

  return (
    <>
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

          <button className="selection-action-btn" onClick={handleMove} title="Move to collection">
            <IconFolderShare size={15} />
            <span>Move</span>
          </button>

          <button className="selection-action-btn" onClick={handleExportSelected} title="Export selected">
            <IconDownload size={15} />
            <span>Export</span>
          </button>

          <button className="selection-action-btn danger" onClick={handleDelete} title="Delete selected">
            <IconTrash size={15} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <CollectionPickerModal
        opened={moveOpened}
        onClose={() => setMoveOpened(false)}
        onConfirm={handleMoveConfirm}
      />
    </>
  )
}
