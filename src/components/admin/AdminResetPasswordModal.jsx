import { useState } from 'react'
import { Modal, Button, PasswordInput, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconKey } from '@tabler/icons-react'
import { adminApi } from '../../api/endpoints'

export default function AdminResetPasswordModal({ opened, onClose, user, onSuccess }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleReset = async (e) => {
    e.preventDefault()
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setBusy(true)
    setError('')
    try {
      await adminApi.resetPassword(user._id, password)
      notifications.show({
        title: 'Password Updated',
        message: `Successfully updated password for ${user.email}. All existing sessions were revoked.`,
        color: 'teal',
      })
      setPassword('')
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to reset password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <IconKey size={18} color="var(--accent-orange, #f59e0b)" />
          <span>Reset Password for {user?.name || user?.email}</span>
        </div>
      }
      centered
      overlayProps={{ blur: 12, opacity: 0.75, backgroundOpacity: 0.75 }}
      styles={{
        content: {
          background: 'radial-gradient(120% 120% at 50% 0%, rgba(20, 12, 38, 0.98) 0%, rgba(5, 5, 8, 0.99) 100%)',
          backdropFilter: 'blur(36px) saturate(180%)',
          border: '1px solid rgba(0, 229, 255, 0.22)',
          borderRadius: 20,
          color: '#fff',
          boxShadow: '0 0 0 1px rgba(0, 229, 255, 0.1), 0 24px 64px -12px rgba(0, 0, 0, 0.9), 0 0 70px -20px rgba(59, 10, 107, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        },
        header: {
          background: 'rgba(14, 8, 28, 0.98)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#fff',
          padding: '1.25rem 1.6rem',
        },
        body: {
          padding: '1.6rem',
        },
      }}
    >
      {user?.isMaster ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 12,
              padding: '1rem',
              color: '#fef3c7',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              👑 Root Master Administrator
            </div>
            <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>
              The Master Admin password is hard-synced with the server environment variable (<code>MASTER_ADMIN_PASSWORD</code>). It cannot be overridden via database reset. To change the master credentials, update your server <code>.env</code> file and restart the server.
            </Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="default" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          <Text size="sm" c="dimmed">
            Set a new temporary or permanent password for <strong>{user?.email}</strong>.
            This will also invalidate all active sessions and force a fresh login.
          </Text>

          <PasswordInput
            label="New Password"
            placeholder="At least 8 characters"
            required
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.currentTarget.value)
              setError('')
            }}
            error={error}
            styles={{
              label: { color: 'rgba(255, 255, 255, 0.85)', marginBottom: 4 },
              input: {
                background: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
                color: '#fff',
              },
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button variant="subtle" color="gray" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="submit"
              color="orange"
              loading={busy}
              styles={{
                root: {
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
                },
              }}
            >
              Update Password
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
