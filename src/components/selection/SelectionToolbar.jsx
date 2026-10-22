import { useState } from 'react'
import { Text } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import {
  IconX,
  IconTrash,
  IconFolderShare,
  IconDownload,
  IconCheck,
  IconSquare,
  IconArchive,
  IconArchiveOff,
  IconTag,
  IconWand,
} from '@tabler/icons-react'
import { useUiStore } from '../../store/uiStore'
import { useLinkStore } from '../../store/linkStore'
import { linksApi } from '../../api/endpoints'
import { downloadBlob } from '../../utils'
import CollectionPickerModal from './CollectionPickerModal'
import BulkTagModal from './BulkTagModal'
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
  const bulkArchive = useLinkStore((s) => s.bulkArchive)
  const bulkUnarchive = useLinkStore((s) => s.bulkUnarchive)
  const bulkTag = useLinkStore((s) => s.bulkTag)
  const applyRulesToLinks = useLinkStore((s) => s.applyRulesToLinks)

  const [moveOpened, setMoveOpened] = useState(false)
  const [tagOpened, setTagOpened] = useState(false)

  if (!selectionMode) return null

  const count = selectedIds.size
  const allIds = links.map((l) => l._id)
  const allSelected = count === allIds.length && allIds.length > 0

  // In the archive view the selection acts on archived links, so the button
  // offers "unarchive"; everywhere else it offers "archive".
  const allArchived = links.length > 0 && links.every((l) => l.archivedAt)
  const inArchiveView = allArchived

  const handleSelectAll = () => {
    if (allSelected) deselectAll()
    else selectAll(allIds)
  }

  const handleArchive = async () => {
    try {
      if (inArchiveView) {
        await bulkUnarchive([...selectedIds])
        notifications.show({ message: `${count} link(s) restored`, color: 'green' })
      } else {
        await bulkArchive([...selectedIds])
        notifications.show({ message: `${count} link(s) archived`, color: 'green' })
      }
      exitSelectionMode()
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    }
  }

  const handleTagConfirm = async (tags) => {
    try {
      await bulkTag([...selectedIds], tags, 'add')
      setTagOpened(false)
      notifications.show({ message: `${count} link(s) tagged`, color: 'green' })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    }
  }

  const handleRunRules = async () => {
    try {
      const result = await applyRulesToLinks([...selectedIds])
      notifications.show({
        message:
          result?.changed > 0
            ? `Rules changed ${result.changed} link(s)`
            : 'No rule matched the selected links',
        color: result?.changed > 0 ? 'green' : 'gray',
      })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    }
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
    try {
      const { blob, filename } = await linksApi.export('xlsx', [...selectedIds])
      downloadBlob(blob, filename)
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

          <button className="selection-action-btn" onClick={() => setTagOpened(true)} title="Tag selected">
            <IconTag size={15} />
            <span>Tag</span>
          </button>

          <button
            className="selection-action-btn"
            onClick={handleArchive}
            title={inArchiveView ? 'Restore selected' : 'Archive selected'}
          >
            {inArchiveView ? <IconArchiveOff size={15} /> : <IconArchive size={15} />}
            <span>{inArchiveView ? 'Unarchive' : 'Archive'}</span>
          </button>

          <button
            className="selection-action-btn"
            onClick={handleRunRules}
            title="Run your automation rules on the selected links"
          >
            <IconWand size={15} />
            <span>Rules</span>
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

      <BulkTagModal
        opened={tagOpened}
        onClose={() => setTagOpened(false)}
        onConfirm={handleTagConfirm}
      />
    </>
  )
}
