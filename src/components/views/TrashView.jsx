import { useEffect } from 'react'
import { Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconTrash, IconInfoCircle } from '@tabler/icons-react'
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
  const trashHasMore = useLinkStore((s) => s.trashHasMore)
  const trashLoading = useLinkStore((s) => s.trashLoading)
  const trashError = useLinkStore((s) => s.trashError)
  const fetchTrash = useLinkStore((s) => s.fetchTrash)
  const emptyTrash = useLinkStore((s) => s.emptyTrash)

  const selectionMode = useUiStore((s) => s.selectionMode)
  const openConfirmDialog = useUiStore((s) => s.openConfirmDialog)

  useEffect(() => {
    fetchTrash()
  }, [fetchTrash])

  const handleEmptyTrash = () => {
    openConfirmDialog({
      title: 'Empty trash?',
      subtitle: 'Everything in the bin is removed for good',
      tone: 'danger',
      icon: <IconTrash size={20} />,
      confirmLabel: 'Empty trash',
      body: (
        <ul className="app-modal-consequences">
          <li className="is-destructive">
            <IconTrash size={14} />
            <span>
              <strong>
                {trashTotal} link{trashTotal === 1 ? '' : 's'}
              </strong>{' '}
              are permanently deleted. This cannot be undone.
            </span>
          </li>
          <li className="is-safe">
            <IconInfoCircle size={14} />
            <span>Links still in your library are not affected.</span>
          </li>
        </ul>
      ),
      onConfirm: async () => {
        await emptyTrash()
        notifications.show({ message: 'Trash emptied', color: 'cyan' })
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

      {trashHasMore && (
        <div className="trash-banner" style={{ marginBottom: 12 }}>
          <span>
            Showing the {trashLinks.length} most recent of {trashTotal} trashed links. Older items
            are still deleted automatically after 7 days.
          </span>
        </div>
      )}

      <TrashToolbar />

      <LinkGrid links={trashLinks} trashMode />
    </div>
  )
}