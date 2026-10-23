import { useEffect, useState } from 'react'
import {
  Modal,
  Tabs,
  Badge,
  Button,
  Loader,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconUser,
  IconLink,
  IconFolder,
  IconDeviceDesktop,
  IconKey,
  IconCopy,
  IconCheck,
  IconExternalLink,
  IconSearch,
  IconClock,
  IconShieldCheck,
  IconShieldX,
  IconSettings,
} from '@tabler/icons-react'
import { adminApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { initialsOf } from '../../utils'
import './UserInspectorModal.css'

export default function UserInspectorModal({ opened, onClose, userId, onRefreshParent }) {
  const currentUser = useAuthStore((s) => s.user)
  const isSelfUser = Boolean(userId && currentUser?.id) && String(userId) === String(currentUser.id)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('summary')
  const [copiedId, setCopiedId] = useState(false)
  const [linkSearch, setLinkSearch] = useState('')
  const [actionBusy, setActionBusy] = useState(false)

  useEffect(() => {
    if (!opened || !userId) return
    setLoading(true)
    setData(null)
    adminApi
      .user(userId)
      .then((res) => setData(res))
      .catch((err) => {
        notifications.show({
          title: 'Error',
          message: err.message || 'Failed to load user details.',
          color: 'red',
        })
      })
      .finally(() => setLoading(false))
  }, [opened, userId])

  const copyUserId = () => {
    if (!data?.user?._id) return
    navigator.clipboard.writeText(String(data.user._id))
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
    notifications.show({ message: 'User ID copied to clipboard', color: 'teal' })
  }

  const handleRevokeSession = async (sessionId) => {
    try {
      await adminApi.revokeSession(sessionId)
      notifications.show({ message: 'Session revoked successfully', color: 'teal' })
      // Refresh user details
      const refreshed = await adminApi.user(userId)
      setData(refreshed)
      onRefreshParent?.()
    } catch (err) {
      notifications.show({ message: err.message || 'Failed to revoke session', color: 'red' })
    }
  }

  const handleForceLogout = async () => {
    if (isSelfUser) {
      notifications.show({
        title: 'Action Blocked',
        message: 'You cannot revoke your own active session from here. Use the Sign Out button.',
        color: 'orange',
      })
      return
    }
    setActionBusy(true)
    try {
      await adminApi.resetSessions(userId)
      notifications.show({
        title: 'Sessions Terminated',
        message: 'All device sessions for this user have been terminated.',
        color: 'teal',
      })
      const refreshed = await adminApi.user(userId)
      setData(refreshed)
      onRefreshParent?.()
    } catch (err) {
      notifications.show({ message: err.message || 'Failed to terminate sessions', color: 'red' })
    } finally {
      setActionBusy(false)
    }
  }

  const filteredLinks = (data?.recentLinks || []).filter((l) => {
    if (!linkSearch.trim()) return true
    const q = linkSearch.toLowerCase()
    return (
      l.title?.toLowerCase().includes(q) ||
      l.url?.toLowerCase().includes(q) ||
      (l.tags || []).some((t) => t.toLowerCase().includes(q))
    )
  })

  const user = data?.user
  const stats = data?.stats

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      centered
      overlayProps={{ blur: 4, opacity: 0.65 }}
      styles={{
        content: {
          background: 'rgba(15, 18, 28, 0.96)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 20,
          color: '#fff',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
        },
        header: {
          background: 'transparent',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#fff',
        },
        body: {
          padding: '1.5rem',
        },
      }}
      title={
        <div className="inspector-modal-header">
          <div
            className="inspector-avatar"
            style={{ background: user?.avatarColor || 'var(--accent-gradient)' }}
          >
            {initialsOf(user?.name)}
          </div>
          <div className="inspector-title-info">
            <div className="inspector-name-row">
              <span className="inspector-name">{user?.name || 'Loading...'}</span>
              {user?.isMaster ? (
                <Badge color="yellow" variant="filled" size="sm">
                  👑 Master Admin
                </Badge>
              ) : user?.role === 'admin' ? (
                <Badge color="blue" variant="light" size="sm">
                  🛡️ Admin
                </Badge>
              ) : (
                <Badge color="gray" variant="light" size="sm">
                  👤 User
                </Badge>
              )}
              {user?.status === 'suspended' ? (
                <Badge color="red" variant="filled" size="sm">
                  Suspended
                </Badge>
              ) : (
                <Badge color="teal" variant="light" size="sm">
                  Active
                </Badge>
              )}
            </div>
            <div className="inspector-email-row">
              <span className="inspector-email">{user?.email}</span>
              {user?._id && (
                <Tooltip label={copiedId ? 'Copied!' : 'Copy User ID'}>
                  <button type="button" className="copy-id-btn" onClick={copyUserId}>
                    {copiedId ? <IconCheck size={12} /> : <IconCopy size={12} />}
                    <span>{String(user._id).slice(-8)}</span>
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="inspector-loading">
          <Loader color="blue" size="md" />
          <Text size="sm" c="dimmed">
            Retrieving complete user telemetry...
          </Text>
        </div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <Text size="sm" c="red" mb="md">
            Failed to load user profile, or user no longer exists in database.
          </Text>
          <Button size="xs" variant="default" onClick={onClose}>
            Close Inspector
          </Button>
        </div>
      ) : (
        <div className="inspector-body">
          {/* Quick Metrics Bar */}
          <div className="inspector-kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Total Links</div>
              <div className="kpi-value">{stats?.links?.total || 0}</div>
              <div className="kpi-sub">
                {stats?.links?.active || 0} active • {stats?.links?.trash || 0} trash
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Platform Visits</div>
              <div className="kpi-value">{stats?.links?.totalVisits || 0}</div>
              <div className="kpi-sub">{stats?.totalVisitsLogged || 0} link click logs</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Collections</div>
              <div className="kpi-value">{stats?.collectionsCount || 0}</div>
              <div className="kpi-sub">{stats?.savedViewsCount || 0} saved views</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Active Sessions</div>
              <div className="kpi-value">{stats?.activeSessionsCount || 0}</div>
              <div className="kpi-sub">{stats?.sessionsCount || 0} total lifetime</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">API Keys</div>
              <div className="kpi-value">{stats?.apiKeysCount || 0}</div>
              <div className="kpi-sub">Developer tokens</div>
            </div>
          </div>

          {/* Tabbed deep dive */}
          <Tabs value={activeTab} onChange={setActiveTab} variant="pills" className="inspector-tabs">
            <Tabs.List className="inspector-tab-list">
              <Tabs.Tab value="summary" leftSection={<IconUser size={15} />}>
                Profile &amp; Settings
              </Tabs.Tab>
              <Tabs.Tab
                value="links"
                leftSection={<IconLink size={15} />}
                rightSection={<Badge size="xs" circle>{stats?.links?.total || 0}</Badge>}
              >
                Saved Links
              </Tabs.Tab>
              <Tabs.Tab
                value="collections"
                leftSection={<IconFolder size={15} />}
                rightSection={<Badge size="xs" circle>{stats?.collectionsCount || 0}</Badge>}
              >
                Collections
              </Tabs.Tab>
              <Tabs.Tab
                value="sessions"
                leftSection={<IconDeviceDesktop size={15} />}
                rightSection={<Badge size="xs" circle>{stats?.activeSessionsCount || 0}</Badge>}
              >
                Devices &amp; Sessions
              </Tabs.Tab>
              <Tabs.Tab
                value="apikeys"
                leftSection={<IconKey size={15} />}
                rightSection={<Badge size="xs" circle>{stats?.apiKeysCount || 0}</Badge>}
              >
                API Keys
              </Tabs.Tab>
            </Tabs.List>

            {/* TAB 1: Profile & Settings */}
            <Tabs.Panel value="summary" pt="md">
              <div className="detail-grid">
                <div className="detail-section glass-box">
                  <h4 className="detail-sec-title">
                    <IconUser size={16} /> Identity &amp; Auth
                  </h4>
                  <div className="detail-row">
                    <span className="lbl">Full Name</span>
                    <span className="val">{user.name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="lbl">Email</span>
                    <span className="val">{user.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="lbl">Account Status</span>
                    <span className="val">
                      {user.status === 'suspended' ? (
                        <span className="badge-red">Suspended</span>
                      ) : (
                        <span className="badge-green">Active</span>
                      )}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="lbl">Role</span>
                    <span className="val capitalize">{user.role}</span>
                  </div>
                  <div className="detail-row">
                    <span className="lbl">Registered</span>
                    <span className="val">
                      {new Date(user.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="lbl">Token Version</span>
                    <span className="val code-font">{user.tokenVersion}</span>
                  </div>
                </div>

                <div className="detail-section glass-box">
                  <h4 className="detail-sec-title">
                    <IconClock size={16} /> Activity &amp; Access Log
                  </h4>
                  <div className="detail-row">
                    <span className="lbl">Last Login</span>
                    <span className="val">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'Never recorded'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="lbl">Last Login IP</span>
                    <span className="val code-font">{user.lastLoginIp || 'Unknown'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="lbl">Total Login Count</span>
                    <span className="val">{user.loginCount || 0} logins</span>
                  </div>
                  <div className="detail-row">
                    <span className="lbl">2FA Status</span>
                    <span className="val">
                      {user.twoFactor?.enabled ? (
                        <span className="badge-green flex-center">
                          <IconShieldCheck size={14} /> Enabled
                        </span>
                      ) : (
                        <span className="badge-dim flex-center">
                          <IconShieldX size={14} /> Disabled
                        </span>
                      )}
                    </span>
                  </div>
                  {user.twoFactor?.verifiedAt && (
                    <div className="detail-row">
                      <span className="lbl">2FA Verified On</span>
                      <span className="val">
                        {new Date(user.twoFactor.verifiedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="detail-section glass-box full-width">
                  <h4 className="detail-sec-title">
                    <IconSettings size={16} /> User Preferences
                  </h4>
                  <div className="pref-grid">
                    <div className="pref-item">
                      <span className="lbl">Theme</span>
                      <span className="val capitalize">{user.preferences?.theme || 'dark'}</span>
                    </div>
                    <div className="pref-item">
                      <span className="lbl">Timezone</span>
                      <span className="val">{user.preferences?.timezone || 'UTC'}</span>
                    </div>
                    <div className="pref-item">
                      <span className="lbl">Default View</span>
                      <span className="val capitalize">{user.preferences?.defaultView || 'dashboard'}</span>
                    </div>
                    <div className="pref-item">
                      <span className="lbl">Auto-Enrich Links</span>
                      <span className="val">{user.preferences?.autoEnrich !== false ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="pref-item">
                      <span className="lbl">Weekly Digest</span>
                      <span className="val">
                        {user.preferences?.digestEnabled
                          ? `Day ${user.preferences.digestDay} @ ${user.preferences.digestHour}:00`
                          : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Tabs.Panel>

            {/* TAB 2: Links */}
            <Tabs.Panel value="links" pt="md">
              <div className="tab-pane-content">
                <div className="pane-header">
                  <TextInput
                    placeholder="Search this user's links..."
                    leftSection={<IconSearch size={15} />}
                    size="sm"
                    value={linkSearch}
                    onChange={(e) => setLinkSearch(e.currentTarget.value)}
                    style={{ maxWidth: 320 }}
                    styles={{
                      input: {
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                      },
                    }}
                  />
                  <Text size="xs" c="dimmed">
                    Showing {filteredLinks.length} links
                  </Text>
                </div>

                {filteredLinks.length === 0 ? (
                  <div className="empty-state">No links found for this user.</div>
                ) : (
                  <div className="inspector-links-table-wrapper">
                    <table className="inspector-table">
                      <thead>
                        <tr>
                          <th>Title &amp; URL</th>
                          <th>Collection</th>
                          <th>Visits</th>
                          <th>Tags</th>
                          <th>Saved At</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLinks.map((link) => (
                          <tr key={link._id}>
                            <td className="link-cell">
                              <div className="link-title-line">
                                <span
                                  className="link-dot"
                                  style={{ background: link.color || '#3b82f6' }}
                                />
                                <span className="link-title-text" title={link.title}>
                                  {link.title}
                                </span>
                              </div>
                              <div className="link-url-text" title={link.url}>
                                {link.url}
                              </div>
                            </td>
                            <td>
                              {link.collectionId ? (
                                <span
                                  className="coll-tag"
                                  style={{ borderColor: link.collectionId.color || '#3b82f6' }}
                                >
                                  {link.collectionId.name}
                                </span>
                              ) : (
                                <span className="dim-text">Unorganized</span>
                              )}
                            </td>
                            <td className="visits-cell">{link.visits || 0}</td>
                            <td>
                              <div className="tag-chips">
                                {(link.tags || []).slice(0, 3).map((t) => (
                                  <span key={t} className="tag-chip">
                                    #{t}
                                  </span>
                                ))}
                                {(link.tags || []).length > 3 && (
                                  <span className="tag-chip more">
                                    +{(link.tags || []).length - 3}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="date-cell">
                              {new Date(link.createdAt).toLocaleDateString()}
                            </td>
                            <td>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="icon-btn-ext"
                                title="Open link in new tab"
                              >
                                <IconExternalLink size={15} />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Tabs.Panel>

            {/* TAB 3: Collections */}
            <Tabs.Panel value="collections" pt="md">
              <div className="tab-pane-content">
                {(data?.collections || []).length === 0 ? (
                  <div className="empty-state">No collections created yet.</div>
                ) : (
                  <div className="collections-grid">
                    {data.collections.map((c) => (
                      <div
                        key={c._id}
                        className="collection-card"
                        style={{ borderLeftColor: c.color || '#3b82f6' }}
                      >
                        <div className="col-card-head">
                          <span
                            className="col-color-blob"
                            style={{ background: c.color || '#3b82f6' }}
                          />
                          <span className="col-name">{c.name}</span>
                        </div>
                        <div className="col-card-meta">
                          <span>
                            {c.isShared ? (
                              <Badge size="xs" color="teal">
                                Public Share
                              </Badge>
                            ) : (
                              <Badge size="xs" color="gray">
                                Private
                              </Badge>
                            )}
                          </span>
                          <span className="dim-text">
                            Created {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Tabs.Panel>

            {/* TAB 4: Devices & Sessions */}
            <Tabs.Panel value="sessions" pt="md">
              <div className="tab-pane-content">
                <div className="pane-header">
                  <Text size="sm" c="dimmed">
                    Active login sessions and authorized device tokens.
                  </Text>
                  {isSelfUser ? (
                    <Badge color="indigo" variant="light" size="sm">
                      🛡️ Current Session (Protected)
                    </Badge>
                  ) : (
                    <Button
                      size="xs"
                      color="red"
                      variant="light"
                      loading={actionBusy}
                      onClick={handleForceLogout}
                    >
                      Kill All User Sessions
                    </Button>
                  )}
                </div>

                {(data?.sessions || []).length === 0 ? (
                  <div className="empty-state">No recorded active sessions.</div>
                ) : (
                  <div className="sessions-list">
                    {data.sessions.map((s) => {
                      const isExpired = new Date(s.expiresAt) < new Date()
                      const isRevoked = Boolean(s.revokedAt)
                      const isLive = !isExpired && !isRevoked

                      return (
                        <div key={s._id} className={`session-card ${isLive ? 'live' : 'dead'}`}>
                          <div className="session-icon">
                            <IconDeviceDesktop size={20} />
                          </div>
                          <div className="session-details">
                            <div className="session-title-line">
                              <span className="session-device">
                                {s.device?.browser || 'Browser'} on {s.device?.os || 'OS'}
                              </span>
                              {isLive ? (
                                <Badge size="xs" color="teal">
                                  Live Active
                                </Badge>
                              ) : isRevoked ? (
                                <Badge size="xs" color="gray">
                                  Revoked
                                </Badge>
                              ) : (
                                <Badge size="xs" color="red">
                                  Expired
                                </Badge>
                              )}
                            </div>
                            <div className="session-meta-line">
                              <span>IP: <strong className="code-font">{s.ip || 'Unknown'}</strong></span>
                              <span>Last active: {new Date(s.lastUsedAt).toLocaleString()}</span>
                            </div>
                            <div className="session-ua-line" title={s.userAgent}>
                              {s.userAgent}
                            </div>
                          </div>
                          {isLive && (
                            <Button
                              size="xs"
                              color="red"
                              variant="subtle"
                              onClick={() => handleRevokeSession(s._id)}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </Tabs.Panel>

            {/* TAB 5: API Keys */}
            <Tabs.Panel value="apikeys" pt="md">
              <div className="tab-pane-content">
                {(data?.apiKeys || []).length === 0 ? (
                  <div className="empty-state">No personal API keys generated by this user.</div>
                ) : (
                  <div className="apikeys-list">
                    {data.apiKeys.map((k) => (
                      <div key={k._id} className="apikey-card">
                        <div className="apikey-name">{k.name}</div>
                        <div className="apikey-prefix code-font">Prefix: {k.prefix}...</div>
                        <div className="apikey-scopes">
                          {(k.scopes || []).map((sc) => (
                            <Badge key={sc} size="xs" color="blue" variant="light">
                              {sc}
                            </Badge>
                          ))}
                        </div>
                        <div className="apikey-meta">
                          Created {new Date(k.createdAt).toLocaleDateString()}
                          {k.lastUsedAt && ` • Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Tabs.Panel>
          </Tabs>
        </div>
      )}
    </Modal>
  )
}
