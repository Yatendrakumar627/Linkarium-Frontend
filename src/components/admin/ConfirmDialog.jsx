import { Button, Modal, Text } from '@mantine/core'

/**
 * Small branded confirmation dialog used for every destructive admin action.
 * Keeps the dashboard visually consistent instead of dropping to window.confirm.
 */
export default function ConfirmDialog({
  opened,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  color = 'red',
  loading = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      opened={opened}
      onClose={loading ? () => {} : onClose}
      title={title}
      centered
      radius="lg"
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
      overlayProps={{ backgroundOpacity: 0.68, blur: 5 }}
      classNames={{
        content: 'admin-confirm-modal',
        header: 'admin-confirm-header',
        title: 'admin-confirm-title',
        close: 'admin-confirm-close',
      }}
    >
      <Text size="sm" className="admin-confirm-message">
        {message}
      </Text>
      <div className="admin-confirm-actions">
        <Button variant="default" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button color={color} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
