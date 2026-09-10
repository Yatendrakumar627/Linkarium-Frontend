import { useState } from 'react'
import { Button, Modal, TextInput, PasswordInput, Divider, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { AVATAR_COLORS } from '../../constants'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { initialsOf } from '../../utils'
import './ProfileModal.css'

function ProfileForm({ user, updateProfile }) {
  const [name, setName] = useState(user?.name || '')
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || AVATAR_COLORS[0])
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const payload = { name: name.trim() || user?.name, avatarColor }
      if (currentPassword || newPassword) {
        payload.currentPassword = currentPassword
        payload.newPassword = newPassword
      }
      await updateProfile(payload)
      setCurrentPassword('')
      setNewPassword('')
      notifications.show({ message: 'Profile updated', color: 'green' })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="profile-form">
      <div className="profile-head">
        <div
          className="profile-avatar"
          style={{ background: avatarColor || user?.avatarColor }}
        >
          {initialsOf(name || user?.name)}
        </div>
        <div className="profile-avatar-info">
          <Text size="sm" fw={600} className="profile-name">{user?.name}</Text>
          <Text size="xs" c="dimmed" className="profile-email">{user?.email}</Text>
        </div>
      </div>

      <TextInput label="Display name" value={name} onChange={(e) => setName(e.currentTarget.value)} />

      <div>
        <div className="profile-color-label">Avatar colour</div>
        <div className="profile-colors">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setAvatarColor(c)}
              className={`profile-swatch ${avatarColor === c ? 'selected' : ''}`}
              style={{ background: c }}
              aria-label={`Avatar colour ${c}`}
            />
          ))}
        </div>
      </div>

      <Divider label="Change password" labelPosition="center" />

      <PasswordInput
        label="Current password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.currentTarget.value)}
        autoComplete="current-password"
      />
      <PasswordInput
        label="New password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.currentTarget.value)}
        placeholder="At least 6 characters"
        autoComplete="new-password"
      />

      <Button type="submit" loading={busy} className="profile-submit gradient-btn">
        Save changes
      </Button>
    </form>
  )
}

export default function ProfileModal() {
  const open = useUiStore((s) => s.profileOpen)
  const close = useUiStore((s) => s.closeProfile)
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)

  return (
    <Modal opened={open} onClose={close} title="Profile & settings" size="md">
      {open && user && (
        <ProfileForm
          key={user.id}
          user={user}
          updateProfile={updateProfile}
        />
      )}
    </Modal>
  )
}