import { useState } from 'react'
import { notifications } from '@mantine/notifications'
import { useUiStore } from '../../store/uiStore'
import {
  AppButton,
  AppModal,
  AppModalBody,
  AppModalFooter,
  AppModalHeader,
} from './ModalShell'
import './ConfirmDialog.css'

// A themed replacement for Mantine's stock confirm modal.
//
// Mantine's `openConfirmModal` renders a bare title + paragraph, which reads as
// an interruption rather than part of the app. This component gives destructive
// actions the same obsidian/cyan shell as the rest of the UI, and keeps the
// dialog open with a spinner while the action runs.
//
// `config` shape (see uiStore.openConfirmDialog):
//   title        string           required
//   subtitle     string
//   icon         ReactNode
//   tone         'danger' | 'default' | 'warning'
//   body         ReactNode
//   confirmLabel string
//   cancelLabel  string
//   onConfirm    () => Promise<void> | void   required
//
// If `onConfirm` rejects, the dialog stays open and the error is surfaced as a
// notification so the user can retry.

function ConfirmDialogInner({ config }) {
  const close = useUiStore((s) => s.closeConfirmDialog)
  const [busy, setBusy] = useState(false)

  const tone = config.tone || 'default'
  const isDanger = tone === 'danger'

  const handleConfirm = async () => {
    if (busy) return
    setBusy(true)
    try {
      await config.onConfirm?.()
      close()
    } catch (err) {
      notifications.show({
        message: err?.message || 'Something went wrong. Please try again.',
        color: 'red',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppModal
      opened
      onClose={busy ? undefined : close}
      size="sm"
      tone={tone}
      closeOnClickOutside={!busy}
      closeOnEscape={!busy}
      className="confirm-dialog-root"
    >
      <AppModalHeader
        icon={config.icon}
        title={config.title}
        subtitle={config.subtitle}
        onClose={busy ? undefined : close}
      />

      {config.body ? <AppModalBody>{config.body}</AppModalBody> : null}

      <AppModalFooter>
        <AppButton variant="subtle" onClick={close} disabled={busy}>
          {config.cancelLabel || 'Cancel'}
        </AppButton>
        <AppButton
          variant={isDanger ? 'danger' : 'primary'}
          onClick={handleConfirm}
          loading={busy}
        >
          {config.confirmLabel || 'Confirm'}
        </AppButton>
      </AppModalFooter>
    </AppModal>
  )
}

export default function ConfirmDialog() {
  const config = useUiStore((s) => s.confirmDialog)
  if (!config) return null
  // Keyed by id so a fresh dialog always starts with a clean busy state.
  return <ConfirmDialogInner key={config.id} config={config} />
}
