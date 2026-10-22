import { useEffect, useState } from 'react'
import {
  Button,
  TextInput,
  PasswordInput,
  Group,
  Stack,
  Text,
  Badge,
  Alert,
  Loader,
  Paper,
  Code,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconShieldCheck,
  IconShieldLock,
  IconCopy,
  IconDownload,
  IconCheck,
} from '@tabler/icons-react'
import { QRCodeSVG } from 'qrcode.react'
import { userApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'

export default function TwoFactorSetup() {
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null)
  const [setupData, setSetupData] = useState(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [disableModal, setDisableModal] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [revealedRecoveryCodes, setRevealedRecoveryCodes] = useState(null)

  const loadStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await userApi.totpStatus()
      setStatus(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const startSetup = async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await userApi.totpSetup()
      setSetupData(data)
      setRevealedRecoveryCodes(data.recoveryCodes || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const cancelSetup = () => {
    setSetupData(null)
    setVerifyCode('')
    setRevealedRecoveryCodes(null)
    setError(null)
  }

  const confirmEnable = async () => {
    if (!verifyCode.trim()) {
      setError('Please enter the 6-digit code from your authenticator app.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await userApi.totpEnable(verifyCode.trim())
      notifications.show({
        title: 'Two-Factor Authentication Enabled',
        message: 'Your account is now protected with 2FA.',
        color: 'green',
      })
      await loadStatus()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDisable = async () => {
    if (!disablePassword && !disableCode) {
      setError('Enter your current password or a 2FA code to disable 2FA.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await userApi.totpDisable({ currentPassword: disablePassword, code: disableCode })
      notifications.show({
        message: 'Two-Factor Authentication disabled.',
        color: 'gray',
      })
      setDisableModal(false)
      setDisablePassword('')
      setDisableCode('')
      setSetupData(null)
      await loadStatus()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const copySecret = () => {
    if (!setupData?.secret) return
    navigator.clipboard.writeText(setupData.secret)
    notifications.show({ message: 'Secret key copied', color: 'green' })
  }

  const copyCodes = () => {
    if (!revealedRecoveryCodes) return
    navigator.clipboard.writeText(revealedRecoveryCodes.join('\n'))
    notifications.show({ message: 'Recovery codes copied', color: 'green' })
  }

  const downloadCodes = () => {
    if (!revealedRecoveryCodes) return
    const text = `Linkarium Emergency Recovery Codes (${user?.email || 'account'})\nGenerated: ${new Date().toISOString()}\n\n` +
      revealedRecoveryCodes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      '\n\nKeep these codes in a secure location. Each code can be used once.'
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `linkarium-recovery-codes-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Group justify="center" p="xl">
        <Loader size="sm" />
      </Group>
    )
  }

  return (
    <Stack gap="md">
      {error && (
        <Alert color="red" variant="light" title="Error">
          {error}
        </Alert>
      )}

      {status?.enabled ? (
        <Paper withBorder p="md" radius="md" style={{ background: 'var(--bg-glass)' }}>
          <Group justify="space-between" align="flex-start">
            <Group>
              <div style={{ color: 'var(--color-success, #10b981)' }}>
                <IconShieldCheck size={28} />
              </div>
              <div>
                <Group gap="xs">
                  <Text fw={600} size="sm">Two-Factor Authentication is ON</Text>
                  <Badge color="green" size="xs" variant="light">Active</Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  Your account requires a TOTP code from your authenticator app on sign-in.
                </Text>
                {status.recoveryCodesLeft !== undefined && (
                  <Text size="xs" c="dimmed" mt={4}>
                    {status.recoveryCodesLeft} recovery code{status.recoveryCodesLeft === 1 ? '' : 's'} remaining.
                  </Text>
                )}
              </div>
            </Group>
            <Button
              size="xs"
              color="red"
              variant="light"
              onClick={() => setDisableModal(!disableModal)}
            >
              {disableModal ? 'Cancel' : 'Disable 2FA'}
            </Button>
          </Group>

          {disableModal && (
            <Stack gap="xs" mt="md" pt="md" style={{ borderTop: '1px solid var(--border-color)' }}>
              <Text size="xs" fw={500}>Confirm disabling Two-Factor Authentication</Text>
              <PasswordInput
                size="xs"
                label="Current password"
                placeholder="Enter password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.currentTarget.value)}
              />
              <TextInput
                size="xs"
                label="Or 6-digit TOTP code"
                placeholder="123456"
                value={disableCode}
                onChange={(e) => setDisableCode(e.currentTarget.value)}
              />
              <Group justify="flex-end" mt="xs">
                <Button size="xs" color="red" loading={busy} onClick={handleDisable}>
                  Confirm Disable
                </Button>
              </Group>
            </Stack>
          )}
        </Paper>
      ) : setupData ? (
        <Paper withBorder p="md" radius="md" style={{ background: 'var(--bg-glass)' }}>
          <Stack gap="md">
            <div>
              <Text fw={600} size="sm">Scan QR code in Authenticator</Text>
              <Text size="xs" c="dimmed">
                Use Google Authenticator, 1Password, Authy, or any standard TOTP app.
              </Text>
            </div>

            <Group justify="center" p="xs" style={{ background: '#fff', borderRadius: 8, alignSelf: 'center' }}>
              <QRCodeSVG value={setupData.otpauthUrl} size={160} />
            </Group>

            <div>
              <Text size="xs" c="dimmed" mb={4}>Or enter this secret key manually:</Text>
              <Group gap="xs">
                <Code block style={{ flex: 1, fontSize: '0.8rem', letterSpacing: '0.1em' }}>
                  {setupData.secret}
                </Code>
                <Button size="xs" variant="default" onClick={copySecret} leftSection={<IconCopy size={14} />}>
                  Copy
                </Button>
              </Group>
            </div>

            {revealedRecoveryCodes && (
              <Alert color="yellow" variant="light" title="Save your recovery codes now">
                <Text size="xs" mb="xs">
                  If you lose access to your authenticator, these codes are the ONLY way to regain access.
                </Text>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', marginBottom: '8px' }}>
                  {revealedRecoveryCodes.map((code) => (
                    <Code key={code} style={{ fontSize: '0.75rem', textAlign: 'center' }}>{code}</Code>
                  ))}
                </div>
                <Group gap="xs">
                  <Button size="xs" variant="default" onClick={copyCodes} leftSection={<IconCopy size={13} />}>
                    Copy all
                  </Button>
                  <Button size="xs" variant="default" onClick={downloadCodes} leftSection={<IconDownload size={13} />}>
                    Download
                  </Button>
                </Group>
              </Alert>
            )}

            <Stack gap="xs">
              <TextInput
                label="Enter the 6-digit code from the app"
                placeholder="123456"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.currentTarget.value)}
                maxLength={6}
                styles={{ input: { fontFamily: 'monospace', letterSpacing: '0.2em', fontSize: '1.1rem', textAlign: 'center' } }}
              />
              <Group justify="flex-end">
                <Button size="xs" variant="default" onClick={cancelSetup}>Cancel</Button>
                <Button size="xs" color="violet" loading={busy} onClick={confirmEnable} leftSection={<IconCheck size={14} />}>
                  Verify & Activate
                </Button>
              </Group>
            </Stack>
          </Stack>
        </Paper>
      ) : (
        <Paper withBorder p="md" radius="md" style={{ background: 'var(--bg-glass)' }}>
          <Group justify="space-between">
            <Group>
              <div style={{ color: 'var(--text-dimmed)' }}>
                <IconShieldLock size={28} />
              </div>
              <div>
                <Text fw={600} size="sm">Two-Factor Authentication is OFF</Text>
                <Text size="xs" c="dimmed">
                  Add an extra layer of security to prevent unauthorized access.
                </Text>
              </div>
            </Group>
            <Button size="xs" color="violet" loading={busy} onClick={startSetup}>
              Set up 2FA
            </Button>
          </Group>
        </Paper>
      )}
    </Stack>
  )
}
