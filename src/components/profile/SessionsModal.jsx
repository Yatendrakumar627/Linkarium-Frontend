import { useEffect, useState } from 'react'
import {
  Modal,
  Button,
  Group,
  Stack,
  Text,
  Badge,
  Alert,
  Loader,
  Paper,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconDeviceDesktop,
  IconDeviceMobile,
  IconTrash,
  IconLogout,
  IconRefresh,
} from '@tabler/icons-react'
import { sessionsApi } from '../../api/endpoints'
import { timeAgoShort } from '../../utils'
import { useUiStore } from '../../store/uiStore'

export function SessionsList() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [revokingOthers, setRevokingOthers] = useState(false)
  const [error, setError] = useState(null)

  const loadSessions = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await sessionsApi.list()
      setSessions(Array.isArray(data) ? data : data?.sessions || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  const revokeSession = async (id) => {
    setBusyId(id)
    try {
      await sessionsApi.revoke(id)
      setSessions((prev) => prev.filter((s) => (s.id || s._id) !== id))
      notifications.show({ message: 'Session revoked', color: 'green' })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setBusyId(null)
    }
  }

  const revokeOthers = async () => {
    setRevokingOthers(true)
    try {
      await sessionsApi.revokeOthers()
      await loadSessions()
      notifications.show({ message: 'All other sessions revoked', color: 'green' })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setRevokingOthers(false)
    }
  }

  if (loading) {
    return (
      <Group justify="center" p="xl">
        <Loader size="sm" />
      </Group>
    )
  }

  const otherSessions = sessions.filter((s) => !s.current)

  return (
    <Stack gap="sm">
      {error && (
        <Alert color="red" variant="light">
          {error}
        </Alert>
      )}

      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          These devices are currently signed into your account.
        </Text>
        <Group gap="xs">
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            onClick={loadSessions}
            leftSection={<IconRefresh size={13} />}
          >
            Refresh
          </Button>
          {otherSessions.length > 0 && (
            <Button
              size="xs"
              color="red"
              variant="light"
              loading={revokingOthers}
              onClick={revokeOthers}
              leftSection={<IconLogout size={13} />}
            >
              Sign out other devices
            </Button>
          )}
        </Group>
      </Group>

      <Stack gap="xs">
        {sessions.map((s) => {
          const sid = s.id || s._id
          const isMobile = /mobile|iphone|android|ipad/i.test(s.device || s.userAgent || '')
          return (
            <Paper
              key={sid}
              withBorder
              p="sm"
              radius="sm"
              style={{
                background: s.current ? 'rgba(139, 92, 246, 0.08)' : 'var(--bg-glass)',
                borderColor: s.current ? 'rgba(139, 92, 246, 0.4)' : undefined,
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                  <div style={{ color: s.current ? 'var(--color-primary, #8b5cf6)' : 'var(--text-dimmed)' }}>
                    {isMobile ? <IconDeviceMobile size={22} /> : <IconDeviceDesktop size={22} />}
                  </div>
                  <div>
                    <Group gap="xs">
                      <Text size="sm" fw={600}>
                        {s.device || 'Web Browser'}
                      </Text>
                      {s.current && (
                        <Badge size="xs" color="violet" variant="filled">
                          This device
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed">
                      {s.ip ? `${s.ip} · ` : ''}
                      Active {timeAgoShort(s.lastUsedAt || s.createdAt)}
                    </Text>
                  </div>
                </Group>
                {!s.current && (
                  <Button
                    size="xs"
                    color="red"
                    variant="subtle"
                    loading={busyId === sid}
                    onClick={() => revokeSession(sid)}
                    leftSection={<IconTrash size={13} />}
                  >
                    Revoke
                  </Button>
                )}
              </Group>
            </Paper>
          )
        })}
      </Stack>
    </Stack>
  )
}

export default function SessionsModal() {
  const opened = useUiStore((s) => s.sessionsOpen)
  const close = useUiStore((s) => s.closeSessions)

  return (
    <Modal opened={opened} onClose={close} title="Active Sessions" size="md">
      <SessionsList />
    </Modal>
  )
}
