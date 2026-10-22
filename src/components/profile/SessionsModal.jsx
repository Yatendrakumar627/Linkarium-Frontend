import { useEffect, useState } from 'react'
import { Loader } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconDeviceDesktop,
  IconDeviceMobile,
  IconTrash,
  IconLogout,
  IconRefresh,
  IconDevices,
} from '@tabler/icons-react'
import { sessionsApi } from '../../api/endpoints'
import { timeAgoShort } from '../../utils'
import { useUiStore } from '../../store/uiStore'
import {
  AppButton,
  AppModal,
  AppModalBody,
  AppModalFooter,
  AppModalHeader,
} from '../common/ModalShell'
import './SessionsModal.css'

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
      notifications.show({ message: 'Session revoked', color: 'cyan' })
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
      notifications.show({ message: 'All other sessions revoked', color: 'cyan' })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setRevokingOthers(false)
    }
  }

  if (loading) {
    return (
      <div className="sessions-loading">
        <Loader size="sm" color="cyan" />
        <span>Loading active sessions…</span>
      </div>
    )
  }

  const otherSessions = sessions.filter((s) => !s.current)

  return (
    <div className="sessions-list">
      {error ? (
        <div className="sessions-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="sessions-toolbar">
        <span className="sessions-toolbar-hint">
          These devices are currently signed into your account.
        </span>
        <div className="sessions-toolbar-actions">
          <button
            type="button"
            className="action-btn sessions-tool-btn"
            onClick={loadSessions}
          >
            <IconRefresh size={13} />
            Refresh
          </button>
          {otherSessions.length > 0 ? (
            <button
              type="button"
              className="action-btn sessions-tool-btn is-danger"
              onClick={revokeOthers}
              disabled={revokingOthers}
            >
              <IconLogout size={13} />
              {revokingOthers ? 'Signing out…' : 'Sign out other devices'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="sessions-rows">
        {sessions.map((s) => {
          const sid = s.id || s._id
          const isMobile = /mobile|iphone|android|ipad/i.test(s.device || s.userAgent || '')
          return (
            <div key={sid} className={`session-row ${s.current ? 'is-current' : ''}`}>
              <span className="session-row-icon">
                {isMobile ? <IconDeviceMobile size={20} /> : <IconDeviceDesktop size={20} />}
              </span>
              <div className="session-row-main">
                <div className="session-row-title">
                  <span className="session-row-name">{s.device || 'Web Browser'}</span>
                  {s.current ? <span className="session-row-badge">This device</span> : null}
                </div>
                <div className="session-row-meta">
                  {s.ip ? `${s.ip} · ` : ''}
                  Active {timeAgoShort(s.lastUsedAt || s.createdAt)}
                </div>
              </div>
              {!s.current ? (
                <button
                  type="button"
                  className="action-btn danger session-row-revoke"
                  onClick={() => revokeSession(sid)}
                  disabled={busyId === sid}
                >
                  <IconTrash size={13} />
                  {busyId === sid ? 'Revoking…' : 'Revoke'}
                </button>
              ) : null}
            </div>
          )
        })}

        {sessions.length === 0 ? (
          <div className="app-modal-empty">
            <IconDevices size={26} opacity={0.4} />
            <div>No active sessions found.</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function SessionsModal() {
  const opened = useUiStore((s) => s.sessionsOpen)
  const close = useUiStore((s) => s.closeSessions)

  return (
    <AppModal opened={opened} onClose={close} size="md" className="sessions-modal-root">
      <AppModalHeader
        icon={<IconDevices size={20} />}
        title="Active Sessions"
        subtitle="Devices currently signed into your account"
        onClose={close}
      />
      <AppModalBody className="sessions-body">
        <SessionsList />
      </AppModalBody>
      <AppModalFooter>
        <AppButton variant="subtle" onClick={close}>
          Done
        </AppButton>
      </AppModalFooter>
    </AppModal>
  )
}
