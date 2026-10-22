import { useEffect, useState } from 'react'
import {
  Modal,
  Button,
  TextInput,
  Group,
  Stack,
  Text,
  Badge,
  Alert,
  Loader,
  Paper,
  Code,
  Checkbox,
  Select,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconKey,
  IconPlus,
  IconCopy,
  IconTrash,
  IconAlertCircle,
} from '@tabler/icons-react'
import { apiKeysApi } from '../../api/endpoints'
import { timeAgoShort } from '../../utils'
import { useUiStore } from '../../store/uiStore'

export function ApiKeysList() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [readScope, setReadScope] = useState(true)
  const [writeScope, setWriteScope] = useState(true)
  const [deleteScope, setDeleteScope] = useState(false)
  const [expiresInDays, setExpiresInDays] = useState('90')
  const [busy, setBusy] = useState(false)
  const [revealedKey, setRevealedKey] = useState(null)
  const [busyRevokeId, setBusyRevokeId] = useState(null)
  const [error, setError] = useState(null)

  const loadKeys = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiKeysApi.list()
      setKeys(Array.isArray(data) ? data : data?.keys || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKeys()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newKeyName.trim()) {
      setError('Please provide a name for this API key.')
      return
    }
    const scopes = []
    if (readScope) scopes.push('links:read')
    if (writeScope) scopes.push('links:write')
    if (deleteScope) scopes.push('links:delete')

    if (!scopes.length) {
      setError('Please select at least one permission scope.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const payload = {
        name: newKeyName.trim(),
        scopes,
        expiresInDays: expiresInDays ? parseInt(expiresInDays, 10) : null,
      }
      const data = await apiKeysApi.create(payload)
      const secret = data?.secret || data?.key?.secret
      setRevealedKey({
        name: newKeyName.trim(),
        secret,
      })
      setNewKeyName('')
      setCreating(false)
      await loadKeys()
      notifications.show({ message: 'API key created', color: 'green' })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleRevoke = async (id) => {
    setBusyRevokeId(id)
    try {
      await apiKeysApi.remove(id)
      setKeys((prev) => prev.filter((k) => (k.id || k._id) !== id))
      notifications.show({ message: 'API key revoked', color: 'green' })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setBusyRevokeId(null)
    }
  }

  const copySecret = () => {
    if (!revealedKey?.secret) return
    navigator.clipboard.writeText(revealedKey.secret)
    notifications.show({ message: 'API key secret copied to clipboard', color: 'green' })
  }

  if (loading) {
    return (
      <Group justify="center" p="xl">
        <Loader size="sm" />
      </Group>
    )
  }

  return (
    <Stack gap="sm">
      {error && (
        <Alert color="red" variant="light" title="Error">
          {error}
        </Alert>
      )}

      {revealedKey && (
        <Alert
          color="green"
          variant="light"
          title="Save your new API key now"
          icon={<IconAlertCircle size={18} />}
        >
          <Text size="xs" mb="xs">
            This key grants programmatic access to your links. It will <strong>never</strong> be shown again.
          </Text>
          <Group gap="xs">
            <Code block style={{ flex: 1, fontSize: '0.8rem', userSelect: 'all' }}>
              {revealedKey.secret}
            </Code>
            <Button size="xs" variant="default" onClick={copySecret} leftSection={<IconCopy size={13} />}>
              Copy
            </Button>
          </Group>
          <Group justify="flex-end" mt="xs">
            <Button size="xs" variant="subtle" color="gray" onClick={() => setRevealedKey(null)}>
              Done
            </Button>
          </Group>
        </Alert>
      )}

      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          API keys allow the browser extension and CLI tools to interact with your library.
        </Text>
        {!creating && (
          <Button
            size="xs"
            color="violet"
            variant="light"
            onClick={() => setCreating(true)}
            leftSection={<IconPlus size={13} />}
          >
            Create API Key
          </Button>
        )}
      </Group>

      {creating && (
        <Paper withBorder p="sm" radius="sm" style={{ background: 'var(--bg-glass)' }}>
          <form onSubmit={handleCreate}>
            <Stack gap="xs">
              <Text size="xs" fw={600}>New API Key</Text>
              <TextInput
                size="xs"
                label="Key description / device"
                placeholder="e.g. Chrome Extension on Laptop"
                required
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.currentTarget.value)}
              />
              <div>
                <Text size="xs" fw={500} mb={4}>Permissions</Text>
                <Group gap="md">
                  <Checkbox
                    size="xs"
                    label="links:read"
                    checked={readScope}
                    onChange={(e) => setReadScope(e.currentTarget.checked)}
                  />
                  <Checkbox
                    size="xs"
                    label="links:write"
                    checked={writeScope}
                    onChange={(e) => setWriteScope(e.currentTarget.checked)}
                  />
                  <Checkbox
                    size="xs"
                    label="links:delete"
                    checked={deleteScope}
                    onChange={(e) => setDeleteScope(e.currentTarget.checked)}
                  />
                </Group>
              </div>
              <Select
                size="xs"
                label="Expiration"
                value={expiresInDays}
                onChange={setExpiresInDays}
                data={[
                  { value: '30', label: '30 days' },
                  { value: '90', label: '90 days' },
                  { value: '365', label: '1 year' },
                  { value: '', label: 'No expiration' },
                ]}
              />
              <Group justify="flex-end" mt="xs">
                <Button size="xs" variant="default" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
                <Button size="xs" color="violet" type="submit" loading={busy}>
                  Generate Key
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>
      )}

      <Stack gap="xs">
        {keys.length === 0 ? (
          <Text size="xs" c="dimmed" ta="center" py="md">
            No active API keys yet.
          </Text>
        ) : (
          keys.map((k) => {
            const kid = k.id || k._id
            return (
              <Paper key={kid} withBorder p="sm" radius="sm" style={{ background: 'var(--bg-glass)' }}>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap">
                    <div style={{ color: 'var(--text-dimmed)' }}>
                      <IconKey size={20} />
                    </div>
                    <div>
                      <Group gap="xs">
                        <Text size="sm" fw={600}>
                          {k.name}
                        </Text>
                        <Code style={{ fontSize: '0.7rem' }}>{k.prefix}…</Code>
                      </Group>
                      <Group gap="xs" mt={2}>
                        {(k.scopes || []).map((scope) => (
                          <Badge key={scope} size="xs" variant="outline" color="gray">
                            {scope}
                          </Badge>
                        ))}
                        <Text size="xs" c="dimmed">
                          {k.lastUsedAt ? `Used ${timeAgoShort(k.lastUsedAt)}` : 'Never used'}
                        </Text>
                      </Group>
                    </div>
                  </Group>
                  <Button
                    size="xs"
                    color="red"
                    variant="subtle"
                    loading={busyRevokeId === kid}
                    onClick={() => handleRevoke(kid)}
                    leftSection={<IconTrash size={13} />}
                  >
                    Revoke
                  </Button>
                </Group>
              </Paper>
            )
          })
        )}
      </Stack>
    </Stack>
  )
}

export default function ApiKeysModal() {
  const opened = useUiStore((s) => s.apiKeysOpen)
  const close = useUiStore((s) => s.closeApiKeys)

  return (
    <Modal opened={opened} onClose={close} title="Personal Access Tokens (API Keys)" size="md">
      <ApiKeysList />
    </Modal>
  )
}
