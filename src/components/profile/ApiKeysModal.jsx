import { useEffect, useState } from 'react'
import { Checkbox, Select } from '@mantine/core'
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
import {
  AppButton,
  AppModal,
  AppModalBody,
  AppModalFooter,
  AppModalHeader,
} from '../common/ModalShell'
import './ApiKeysModal.css'

export function ApiKeysList() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [readScope, setReadScope] = useState(true)
  const [writeScope, setWriteScope] = useState(true)
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
      notifications.show({ message: 'API key created', color: 'cyan' })
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
      notifications.show({ message: 'API key revoked', color: 'cyan' })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setBusyRevokeId(null)
    }
  }

  const copySecret = () => {
    if (!revealedKey?.secret) return
    navigator.clipboard.writeText(revealedKey.secret)
    notifications.show({ message: 'API key secret copied to clipboard', color: 'cyan' })
  }

  if (loading) {
    return (
      <div className="api-keys-loading">
        <span className="api-keys-spinner" />
        <span>Loading API keys…</span>
      </div>
    )
  }

  return (
    <div className="api-keys-list">
      {error ? (
        <div className="api-keys-error" role="alert">
          {error}
        </div>
      ) : null}

      {revealedKey ? (
        <div className="api-keys-reveal">
          <div className="api-keys-reveal-head">
            <IconAlertCircle size={16} />
            <span>Save your new API key now</span>
          </div>
          <p className="api-keys-reveal-copy">
            This key grants programmatic access to your links. It will <strong>never</strong> be
            shown again.
          </p>
          <div className="api-keys-reveal-row">
            <code className="api-keys-secret">{revealedKey.secret}</code>
            <button
              type="button"
              className="action-btn api-keys-copy-btn"
              onClick={copySecret}
            >
              <IconCopy size={13} />
              Copy
            </button>
          </div>
          <div className="api-keys-reveal-foot">
            <AppButton variant="subtle" size="sm" onClick={() => setRevealedKey(null)}>
              I have saved it
            </AppButton>
          </div>
        </div>
      ) : null}

      <div className="api-keys-toolbar">
        <span className="api-keys-toolbar-hint">
          API keys let the browser extension and CLI tools work with your library.
        </span>
        {!creating ? (
          <button
            type="button"
            className="action-btn api-keys-create-btn"
            onClick={() => setCreating(true)}
          >
            <IconPlus size={14} />
            Create API key
          </button>
        ) : null}
      </div>

      {creating ? (
        <form className="api-keys-create" onSubmit={handleCreate}>
          <div className="app-modal-field">
            <label className="app-modal-label" htmlFor="api-key-name">
              Key description / device
            </label>
            <input
              id="api-key-name"
              className="app-modal-input"
              placeholder="e.g. Chrome Extension on Laptop"
              required
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.currentTarget.value)}
            />
          </div>

          <div className="app-modal-field">
            <span className="app-modal-label">Permissions</span>
            <div className="api-keys-scopes">
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
            </div>
          </div>

          <div className="app-modal-field">
            <span className="app-modal-label">Expiration</span>
            <Select
              size="xs"
              value={expiresInDays}
              onChange={setExpiresInDays}
              data={[
                { value: '30', label: '30 days' },
                { value: '90', label: '90 days' },
                { value: '365', label: '1 year' },
                { value: '', label: 'No expiration' },
              ]}
            />
          </div>

          <div className="api-keys-create-actions">
            <AppButton variant="subtle" size="sm" onClick={() => setCreating(false)}>
              Cancel
            </AppButton>
            <AppButton size="sm" type="submit" loading={busy}>
              Generate key
            </AppButton>
          </div>
        </form>
      ) : null}

      <div className="api-keys-rows">
        {keys.length === 0 ? (
          <div className="app-modal-empty">
            <IconKey size={26} opacity={0.4} />
            <div>No active API keys yet.</div>
          </div>
        ) : (
          keys.map((k) => {
            const kid = k.id || k._id
            return (
              <div key={kid} className="api-key-row">
                <span className="api-key-row-icon">
                  <IconKey size={18} />
                </span>
                <div className="api-key-row-main">
                  <div className="api-key-row-title">
                    <span className="api-key-row-name">{k.name}</span>
                    <code className="api-key-prefix">{k.prefix}…</code>
                  </div>
                  <div className="api-key-row-meta">
                    {(k.scopes || []).map((scope) => (
                      <span key={scope} className="api-key-scope">
                        {scope}
                      </span>
                    ))}
                    <span className="api-key-used">
                      {k.lastUsedAt ? `Used ${timeAgoShort(k.lastUsedAt)}` : 'Never used'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="action-btn danger api-key-row-revoke"
                  onClick={() => handleRevoke(kid)}
                  disabled={busyRevokeId === kid}
                >
                  <IconTrash size={13} />
                  {busyRevokeId === kid ? 'Revoking…' : 'Revoke'}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default function ApiKeysModal() {
  const opened = useUiStore((s) => s.apiKeysOpen)
  const close = useUiStore((s) => s.closeApiKeys)

  return (
    <AppModal opened={opened} onClose={close} size="md" className="api-keys-root">
      <AppModalHeader
        icon={<IconKey size={20} />}
        title="Personal Access Tokens"
        subtitle="API keys for the extension and CLI tools"
        onClose={close}
      />
      <AppModalBody className="api-keys-body">
        <ApiKeysList />
      </AppModalBody>
      <AppModalFooter>
        <AppButton variant="subtle" onClick={close}>
          Done
        </AppButton>
      </AppModalFooter>
    </AppModal>
  )
}
