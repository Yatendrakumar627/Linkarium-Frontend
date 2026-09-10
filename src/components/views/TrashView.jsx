import { useEffect } from 'react'
import { Button } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconTrash } from '@tabler/icons-react'
import { useUiStore } from '../../store/uiStore'
import { useLinkStore } from '../../store/linkStore'
import LinkGrid from '../links/LinkGrid'
import TrashToolbar from '../selection/TrashToolbar'
import LoadingSkeletons from '../common/LoadingSkeletons'
import EmptyState from '../common/EmptyState'
import ErrorState from '../common/ErrorState'
import './TrashView.css'

export default function TrashView() {
  const trashLinks = useLinkStore((s) => s.trashLinks)
  const trashTotal = useLinkStore((s) => s.trashTotal)
  const trashLoading = useLinkStore((s) => s.trashLoading)
  const trashError = useLinkStore((s) => s.trashError)
  const fetchTrash = useLinkStore((s) => s.fetchTrash)
  const emptyTrash = useLinkStore((s) => s.emptyTrash)

  const selectionMode = useUiStore((s) => s.selectionMode)

  useEffect(() => {
    fetchTrash()
  }, [fetchTrash])

  const handleEmptyTrash = () => {
    modals.openConfirmModal({
      title: 'Empty trash?',
      children: `This will permanently delete all ${trashTotal} trashed link(s). This cannot be undone.`,
      labels: { confirm: 'Empty Trash', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await emptyTrash()
          notifications.show({ message: 'Trash emptied', color: 'green' })
        } catch (err) {
          notifications.show({ message: err.message, color: 'red' })
        }
      },
    })
  }

  if (trashLoading) return <LoadingSkeletons />

  if (trashError && trashLinks.length === 0) {
    return <ErrorState message={trashError} onRetry={() => fetchTrash()} />
  }

  if (!trashLinks.length) {
    return (
      <EmptyState
        icon={<IconTrash size={34} />}
        title="Trash is empty"
        subtitle="Links move here when you delete them and are permanently removed after 7 days."
      />
    )
  }

  return (
    <div className="fade-up links-view-wrap">
      <div className="trash-header">
        <div className="trash-banner">
          <IconTrash size={15} />
          <span>Links in trash are permanently deleted after 7 days.</span>
        </div>
        {!selectionMode && (
          <Button variant="light" color="red" onClick={handleEmptyTrash}>
            Empty Trash
          </Button>
        )}
      </div>

      <TrashToolbar />

      <LinkGrid links={trashLinks} trashMode />
    </div>
  )
}