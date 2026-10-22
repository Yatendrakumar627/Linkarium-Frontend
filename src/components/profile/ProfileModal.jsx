import { useState } from 'react'
import {
  TextInput,
  PasswordInput,
  Divider,
  Text,
  Tabs,
  Switch,
  Select,
  NumberInput,
  Stack,
  Group,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconUser,
  IconShieldLock,
  IconSettings,
  IconMail,
  IconSparkles,
} from '@tabler/icons-react'
import { AVATAR_COLORS } from '../../constants'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { initialsOf, readableTextOn } from '../../utils'
import { userApi } from '../../api/endpoints'
import TwoFactorSetup from './TwoFactorSetup'
import { SessionsList } from './SessionsModal'
import { ApiKeysList } from './ApiKeysModal'
import {
  AppButton,
  AppModal,
  AppModalBody,
  AppModalFooter,
  AppModalHeader,
} from '../common/ModalShell'
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
      notifications.show({ message: 'Profile updated', color: 'cyan' })
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
          style={{
            background: avatarColor || user?.avatarColor,
            // The avatar colour is user-chosen, so the initials have to pick
            // an ink that actually contrasts with it.
            color: readableTextOn(avatarColor || user?.avatarColor || AVATAR_COLORS[0]),
          }}
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
              aria-pressed={avatarColor === c}
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
        placeholder="At least 10 characters"
        autoComplete="new-password"
      />

      <AppButton type="submit" loading={busy} className="profile-submit">
        Save changes
      </AppButton>
    </form>
  )
}

function PreferencesForm({ user }) {
  const prefs = user?.preferences || {}
  const setUser = useAuthStore((s) => s.setUser)
  const [digestEnabled, setDigestEnabled] = useState(Boolean(prefs.digestEnabled))
  const [digestDay, setDigestDay] = useState(String(prefs.digestDay ?? 1))
  const [digestHour, setDigestHour] = useState(prefs.digestHour ?? 8)
  const [autoEnrich, setAutoEnrich] = useState(prefs.autoEnrich !== false)
  const [defaultView, setDefaultView] = useState(prefs.defaultView || 'dashboard')
  const [theme, setTheme] = useState(prefs.theme || 'dark')
  const [timezone, setTimezone] = useState(prefs.timezone || (Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.timeZone || 'UTC'))
  const [busy, setBusy] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const data = await userApi.preferences({
        digestEnabled,
        digestDay: parseInt(digestDay, 10),
        digestHour: Number(digestHour),
        autoEnrich,
        defaultView,
        theme,
        timezone,
      })
      // The server returns the updated user. Without storing it the form kept
      // looking at stale preferences and the saved values never took effect.
      if (data?.user) setUser(data.user)
      notifications.show({ message: 'Preferences saved', color: 'cyan' })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSave}>
      <Stack gap="md">
        <div className="profile-card">
          <div className="profile-card-head">
            <span className="profile-card-icon">
              <IconMail size={17} />
            </span>
            <div className="profile-card-copy">
              <Text size="sm" fw={600}>Weekly Email Digest</Text>
              <Text size="xs" c="dimmed">Receive a weekly summary of resurfaced links and stats.</Text>
            </div>
            <Switch
              checked={digestEnabled}
              onChange={(e) => setDigestEnabled(e.currentTarget.checked)}
            />
          </div>

          {digestEnabled && (
            <div className="profile-card-body">
              <Group grow>
                <Select
                  size="xs"
                  label="Delivery day"
                  value={digestDay}
                  onChange={setDigestDay}
                  data={[
                    { value: '0', label: 'Sunday' },
                    { value: '1', label: 'Monday' },
                    { value: '2', label: 'Tuesday' },
                    { value: '3', label: 'Wednesday' },
                    { value: '4', label: 'Thursday' },
                    { value: '5', label: 'Friday' },
                    { value: '6', label: 'Saturday' },
                  ]}
                />
                <NumberInput
                  size="xs"
                  label="Hour of day (0-23)"
                  value={digestHour}
                  onChange={(v) => setDigestHour(Number(v) || 0)}
                  min={0}
                  max={23}
                />
              </Group>
            </div>
          )}
        </div>

        <div className="profile-card">
          <div className="profile-card-head">
            <span className="profile-card-icon">
              <IconSparkles size={17} />
            </span>
            <div className="profile-card-copy">
              <Text size="sm" fw={600}>Auto-enrich links</Text>
              <Text size="xs" c="dimmed">Fetch page title, OpenGraph preview and readable article text on save.</Text>
            </div>
            <Switch
              checked={autoEnrich}
              onChange={(e) => setAutoEnrich(e.currentTarget.checked)}
            />
          </div>
        </div>

        <Group grow>
          <Select
            size="xs"
            label="Default opening view"
            value={defaultView}
            onChange={setDefaultView}
            data={[
              { value: 'dashboard', label: 'Dashboard' },
              { value: 'links', label: 'All Links' },
              { value: 'favorites', label: 'Favorites' },
              { value: 'insights', label: 'Analytics' },
              { value: 'archive', label: 'Archive' },
            ]}
          />
          <Select
            size="xs"
            label="Color theme"
            value={theme}
            onChange={setTheme}
            data={[
              { value: 'dark', label: 'Dark universe' },
              { value: 'light', label: 'Light' },
              { value: 'system', label: 'System default' },
            ]}
          />
        </Group>

        <TextInput
          size="xs"
          label="Timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.currentTarget.value)}
          description="Used for weekly digest schedule and activity heatmaps."
        />

        <AppButton type="submit" loading={busy}>
          Save preferences
        </AppButton>
      </Stack>
    </form>
  )
}

function SecurityTab() {
  return (
    <Stack gap="lg">
      <div>
        <Text size="sm" fw={600} mb={4}>Two-Factor Authentication</Text>
        <TwoFactorSetup />
      </div>

      <Divider />

      <div>
        <Text size="sm" fw={600} mb={8}>Personal Access Tokens (API Keys)</Text>
        <ApiKeysList />
      </div>

      <Divider />

      <div>
        <Text size="sm" fw={600} mb={8}>Active Device Sessions</Text>
        <SessionsList />
      </div>
    </Stack>
  )
}

export default function ProfileModal() {
  const open = useUiStore((s) => s.profileOpen)
  const close = useUiStore((s) => s.closeProfile)
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)

  return (
    <AppModal opened={open} onClose={close} size="lg" className="profile-modal-root">
      <AppModalHeader
        icon={
          <span
            className="profile-header-avatar"
            style={{
              background: user?.avatarColor || AVATAR_COLORS[0],
              color: readableTextOn(user?.avatarColor || AVATAR_COLORS[0]),
            }}
          >
            {initialsOf(user?.name)}
          </span>
        }
        title="Account & Settings"
        subtitle={user?.email}
        onClose={close}
      />

      <AppModalBody className="profile-modal-body">
        {open && user && (
          <Tabs defaultValue="profile" className="profile-tabs">
            <Tabs.List mb="md">
              <Tabs.Tab value="profile" leftSection={<IconUser size={15} />}>
                Profile
              </Tabs.Tab>
              <Tabs.Tab value="security" leftSection={<IconShieldLock size={15} />}>
                Security
              </Tabs.Tab>
              <Tabs.Tab value="preferences" leftSection={<IconSettings size={15} />}>
                Preferences
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="profile">
              <ProfileForm
                key={user.id}
                user={user}
                updateProfile={updateProfile}
              />
            </Tabs.Panel>

            <Tabs.Panel value="security">
              <SecurityTab />
            </Tabs.Panel>

            <Tabs.Panel value="preferences">
              <PreferencesForm user={user} />
            </Tabs.Panel>
          </Tabs>
        )}
      </AppModalBody>

      <AppModalFooter>
        <AppButton variant="subtle" onClick={close}>
          Close
        </AppButton>
      </AppModalFooter>
    </AppModal>
  )
}
