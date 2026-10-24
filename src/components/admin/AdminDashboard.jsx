import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  TextInput,
  Select,
  Loader,
  Menu,
  ActionIcon,
  Tooltip,
  Text,
  Tabs,
  Progress,
  Pagination,
  Table,
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  IconCrown,
  IconShield,
  IconShieldCheck,
  IconUsers,
  IconKey,
  IconSearch,
  IconRefresh,
  IconTrash,
  IconExternalLink,
  IconDeviceDesktop,
  IconLogout,
  IconArrowLeft,
  IconWorld,
  IconFolder,
  IconLink,
  IconFlame,
  IconDotsVertical,
  IconDownload,
  IconEye,
  IconServer,
  IconActivity,
  IconBan,
  IconUserCheck,
  IconDatabase,
  IconCode,
  IconLayersLinked,
  IconClock,
  IconUserPlus,
} from '@tabler/icons-react'
import { adminApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { initialsOf, downloadBlob } from '../../utils'
import UserInspectorModal from './UserInspectorModal'
import AdminResetPasswordModal from './AdminResetPasswordModal'
import RawDocumentModal from './RawDocumentModal'
import ConfirmDialog from './ConfirmDialog'
import './AdminDashboard.css'

function formatRelativeTime(dateInput) {
  if (!dateInput) return ''
  const then = new Date(dateInput).getTime()
  const now = Date.now()
  const diffSec = Math.max(0, Math.floor((now - then) / 1000))
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay}d ago`
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const currentUser = useAuthStore((s) => s.user)

  const [activeTab, setActiveTab] = useState('overview')
  const [loadingOverview, setLoadingOverview] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Real-Time Dynamic Synchronization Engine State
  const [autoSyncSecs, setAutoSyncSecs] = useState(5) // Default 5-second live telemetry pulse
  const [isLiveSyncing, setIsLiveSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState(() => Date.now())
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [activityEvents, setActivityEvents] = useState([])
  const [loadingActivity, setLoadingActivity] = useState(true)

  // Guards against stale/slow responses overwriting a newer request.
  const requestSeq = useRef({ overview: 0, users: 0, links: 0, sessions: 0, collection: 0, activity: 0 })

  // Per-row busy flags so an action can't be submitted twice.
  const [busyUserId, setBusyUserId] = useState(null)
  const [busyLinkId, setBusyLinkId] = useState(null)
  const [busySessionId, setBusySessionId] = useState(null)

  // Branded confirmation dialog state.
  const [confirmAction, setConfirmAction] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  // Database Vault state
  const [dbOverview, setDbOverview] = useState(null)
  const [loadingDb, setLoadingDb] = useState(true)
  const [selectedCollection, setSelectedCollection] = useState('links')
  const [collectionData, setCollectionData] = useState(null)
  const [loadingCollectionData, setLoadingCollectionData] = useState(true)
  const [collectionPage, setCollectionPage] = useState(1)
  const [collectionSearch, setCollectionSearch] = useState('')
  const [rawDocModalData, setRawDocModalData] = useState(null)
  const [downloadingDbDump, setDownloadingDbDump] = useState(false)

  // Overview data
  const [overview, setOverview] = useState(null)

  // Users data & filters
  const [users, setUsers] = useState([])
  const [usersPagination, setUsersPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 })
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [twoFactorFilter, setTwoFactorFilter] = useState('all')
  const [sortOption, setSortOption] = useState('newest')

  // Global links data & filters
  const [globalLinks, setGlobalLinks] = useState([])
  const [linksPagination, setLinksPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 })
  const [linkSearch, setLinkSearch] = useState('')

  // Global sessions data
  const [globalSessions, setGlobalSessions] = useState([])
  const [sessionsPagination, setSessionsPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 })

  // Modals state
  const [inspectUserId, setInspectUserId] = useState(null)
  const [resetPasswordUser, setResetPasswordUser] = useState(null)

  // Debounce free-text search so typing does not fire one request per keystroke.
  const [debouncedSearchQuery] = useDebouncedValue(searchQuery, 350)
  const [debouncedLinkSearch] = useDebouncedValue(linkSearch, 350)
  const [debouncedCollectionSearch] = useDebouncedValue(collectionSearch, 350)

  const isSelfUser = (u) =>
    Boolean(u?._id && currentUser?.id) && String(u._id) === String(currentUser.id)

  // Fetch overview (supports silent background revalidation)
  const fetchOverview = useCallback(async (options = {}) => {
    const { silent = false } = options
    const seq = ++requestSeq.current.overview
    if (!silent) setLoadingOverview(true)
    try {
      const data = await adminApi.overview()
      if (seq !== requestSeq.current.overview) return false
      setOverview(data)
      return true
    } catch (err) {
      if (seq === requestSeq.current.overview && !silent) {
        notifications.show({ title: 'Error', message: err.message || 'Failed to load overview.', color: 'red' })
      }
      return false
    } finally {
      if (seq === requestSeq.current.overview && !silent) setLoadingOverview(false)
    }
  }, [])

  // Fetch live activity stream
  const fetchActivityStream = useCallback(async (options = {}) => {
    const { silent = false } = options
    const seq = ++requestSeq.current.activity
    if (!silent) setLoadingActivity(true)
    try {
      const res = await adminApi.activityStream()
      if (seq !== requestSeq.current.activity) return false
      if (res && Array.isArray(res.events)) {
        setActivityEvents(res.events)
      }
      return true
    } catch (err) {
      if (seq === requestSeq.current.activity && !silent) {
        console.error('Failed to load activity stream', err)
      }
      return false
    } finally {
      if (seq === requestSeq.current.activity && !silent) setLoadingActivity(false)
    }
  }, [])

  // Fetch users list (supports silent background revalidation)
  const fetchUsers = useCallback(async (options = {}) => {
    const { silent = false } = options
    const seq = ++requestSeq.current.users
    if (!silent) setLoadingUsers(true)
    let clamped = false
    try {
      const res = await adminApi.users({
        search: debouncedSearchQuery,
        role: roleFilter,
        status: statusFilter,
        twoFactor: twoFactorFilter,
        sort: sortOption,
        page: usersPagination.page,
        limit: usersPagination.limit,
      })
      if (seq !== requestSeq.current.users) return false

      const pagination = res.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 }
      const lastPage = Math.max(1, pagination.totalPages || 1)
      if ((res.users || []).length === 0 && pagination.page > lastPage) {
        clamped = true
        setUsers([])
        setUsersPagination((prev) => ({ ...prev, ...pagination, page: lastPage }))
        return true
      }

      setUsers(res.users || [])
      setUsersPagination(pagination)
      return true
    } catch (err) {
      if (seq === requestSeq.current.users && !silent) {
        notifications.show({ title: 'Error', message: err.message || 'Failed to load users list.', color: 'red' })
      }
      return false
    } finally {
      if (seq === requestSeq.current.users && !clamped && !silent) setLoadingUsers(false)
    }
  }, [debouncedSearchQuery, roleFilter, statusFilter, twoFactorFilter, sortOption, usersPagination.page, usersPagination.limit])

  // Fetch global links (supports silent background revalidation)
  const fetchGlobalLinks = useCallback(async (options = {}) => {
    const { silent = false } = options
    const seq = ++requestSeq.current.links
    if (!silent) setLoadingLinks(true)
    let clamped = false
    try {
      const res = await adminApi.links({
        search: debouncedLinkSearch,
        page: linksPagination.page,
        limit: linksPagination.limit,
      })
      if (seq !== requestSeq.current.links) return false

      const pagination = res.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 }
      const lastPage = Math.max(1, pagination.totalPages || 1)
      if ((res.links || []).length === 0 && pagination.page > lastPage) {
        clamped = true
        setGlobalLinks([])
        setLinksPagination((prev) => ({ ...prev, ...pagination, page: lastPage }))
        return true
      }

      setGlobalLinks(res.links || [])
      setLinksPagination(pagination)
      return true
    } catch (err) {
      if (seq === requestSeq.current.links && !silent) {
        notifications.show({ title: 'Error', message: err.message || 'Failed to load global links.', color: 'red' })
      }
      return false
    } finally {
      if (seq === requestSeq.current.links && !clamped && !silent) setLoadingLinks(false)
    }
  }, [debouncedLinkSearch, linksPagination.page, linksPagination.limit])

  // Fetch global sessions (supports silent background revalidation)
  const fetchGlobalSessions = useCallback(async (options = {}) => {
    const { silent = false } = options
    const seq = ++requestSeq.current.sessions
    if (!silent) setLoadingSessions(true)
    let clamped = false
    try {
      const res = await adminApi.sessions({
        page: sessionsPagination.page,
        limit: sessionsPagination.limit,
      })
      if (seq !== requestSeq.current.sessions) return false

      const pagination = res.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 }
      const lastPage = Math.max(1, pagination.totalPages || 1)
      if ((res.sessions || []).length === 0 && pagination.page > lastPage) {
        clamped = true
        setGlobalSessions([])
        setSessionsPagination((prev) => ({ ...prev, ...pagination, page: lastPage }))
        return true
      }

      setGlobalSessions(res.sessions || [])
      setSessionsPagination(pagination)
      return true
    } catch (err) {
      if (seq === requestSeq.current.sessions && !silent) {
        notifications.show({ title: 'Error', message: err.message || 'Failed to load sessions.', color: 'red' })
      }
      return false
    } finally {
      if (seq === requestSeq.current.sessions && !clamped && !silent) setLoadingSessions(false)
    }
  }, [sessionsPagination.page, sessionsPagination.limit])

  // Fetch complete database overview (supports silent background revalidation)
  const fetchDbOverview = useCallback(async (options = {}) => {
    const { silent = false } = options
    if (!silent) setLoadingDb(true)
    try {
      const data = await adminApi.databaseOverview()
      setDbOverview(data)
      return true
    } catch (err) {
      if (!silent) {
        notifications.show({ title: 'Error', message: err.message || 'Failed to load database overview.', color: 'red' })
      }
      return false
    } finally {
      if (!silent) setLoadingDb(false)
    }
  }, [])

  // Fetch collection documents (supports silent background revalidation)
  const fetchCollectionData = useCallback(async (colName, page = 1, search = '', options = {}) => {
    const { silent = false } = options
    const seq = ++requestSeq.current.collection
    if (!silent) setLoadingCollectionData(true)
    let clamped = false
    try {
      const res = await adminApi.databaseCollection(colName, { page, limit: 25, search })
      if (seq !== requestSeq.current.collection) return false

      const pagination = res.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 }
      const lastPage = Math.max(1, pagination.totalPages || 1)
      if ((res.documents || []).length === 0 && pagination.page > lastPage) {
        clamped = true
        setCollectionData(null)
        setCollectionPage(lastPage)
        return true
      }

      setCollectionData(res)
      return true
    } catch (err) {
      if (seq === requestSeq.current.collection && !silent) {
        notifications.show({ title: 'Error', message: err.message || 'Failed to query collection.', color: 'red' })
      }
      return false
    } finally {
      if (seq === requestSeq.current.collection && !clamped && !silent) setLoadingCollectionData(false)
    }
  }, [])

  // Unified synchronized telemetry heartbeat
  const syncTelemetry = useCallback(
    async (silent = true) => {
      if (isLiveSyncing) return false
      setIsLiveSyncing(true)
      try {
        const tasks = [
          fetchOverview({ silent }),
          fetchActivityStream({ silent }),
        ]

        if (activeTab === 'users') {
          tasks.push(fetchUsers({ silent }))
        } else if (activeTab === 'links') {
          tasks.push(fetchGlobalLinks({ silent }))
        } else if (activeTab === 'sessions') {
          tasks.push(fetchGlobalSessions({ silent }))
        } else if (activeTab === 'database') {
          tasks.push(fetchDbOverview({ silent }))
          tasks.push(fetchCollectionData(selectedCollection, collectionPage, debouncedCollectionSearch, { silent }))
        }

        const res = await Promise.all(tasks)
        setLastSyncedAt(Date.now())
        setSecondsAgo(0)
        return res.every(Boolean)
      } finally {
        setIsLiveSyncing(false)
      }
    },
    [
      activeTab,
      fetchOverview,
      fetchActivityStream,
      fetchUsers,
      fetchGlobalLinks,
      fetchGlobalSessions,
      fetchDbOverview,
      fetchCollectionData,
      selectedCollection,
      collectionPage,
      debouncedCollectionSearch,
      isLiveSyncing,
    ]
  )

  // 1-second live ticker for relative time and active server uptime
  useEffect(() => {
    const ticker = setInterval(() => {
      setSecondsAgo(Math.max(0, Math.floor((Date.now() - lastSyncedAt) / 1000)))
    }, 1000)
    return () => clearInterval(ticker)
  }, [lastSyncedAt])

  // Smart background live polling with tab visibility detection
  useEffect(() => {
    if (!autoSyncSecs || autoSyncSecs <= 0) return

    const interval = setInterval(() => {
      // Don't poll if document is hidden or if an active modal dialog is blocking
      if (document.visibilityState === 'visible' && !inspectUserId && !resetPasswordUser && !rawDocModalData && !confirmAction) {
        syncTelemetry(true)
      }
    }, autoSyncSecs * 1000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Tab brought back into focus: perform immediate live catch-up
        syncTelemetry(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [autoSyncSecs, syncTelemetry, inspectUserId, resetPasswordUser, rawDocModalData, confirmAction])

  // Tab switching triggers
  useEffect(() => {
    if (activeTab === 'users') fetchUsers()
    else if (activeTab === 'links') fetchGlobalLinks()
    else if (activeTab === 'sessions') fetchGlobalSessions()
    else if (activeTab === 'overview') {
      fetchOverview()
      fetchActivityStream()
    }
  }, [activeTab, fetchUsers, fetchGlobalLinks, fetchGlobalSessions, fetchOverview, fetchActivityStream])

  useEffect(() => {
    if (activeTab !== 'database') return
    fetchDbOverview()
  }, [activeTab, fetchDbOverview])

  useEffect(() => {
    if (activeTab !== 'database') return
    fetchCollectionData(selectedCollection, collectionPage, debouncedCollectionSearch)
  }, [activeTab, selectedCollection, collectionPage, debouncedCollectionSearch, fetchCollectionData])

  // Initial load
  useEffect(() => {
    fetchActivityStream()
  }, [fetchActivityStream])

  // Manual refresh button
  const handleRefreshAll = async () => {
    setRefreshing(true)
    const ok = await syncTelemetry(false)
    setRefreshing(false)
    notifications.show({
      message: ok
        ? 'Telemetry updated with latest live data'
        : 'Refresh completed with partial response — check server connection.',
      color: ok ? 'teal' : 'red',
    })
  }


  const handleDownloadDbDump = async () => {
    setDownloadingDbDump(true)
    try {
      const { blob, filename } = await adminApi.databaseDump()
      downloadBlob(blob, filename || `linkarium-full-database-dump-${Date.now()}.json`)
      notifications.show({ title: 'Success', message: 'Full database dump downloaded successfully!', color: 'teal' })
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message || 'Failed to export database dump.', color: 'red' })
    } finally {
      setDownloadingDbDump(false)
    }
  }

  // User Actions
  const requestConfirm = (options) => setConfirmAction(options)

  const handleConfirmAction = async () => {
    if (!confirmAction) return
    setConfirmBusy(true)
    try {
      await confirmAction.onConfirm()
    } finally {
      setConfirmBusy(false)
      setConfirmAction(null)
    }
  }

  const handleToggleStatus = (user) => {
    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended'
    requestConfirm({
      title: nextStatus === 'suspended' ? 'Suspend this account?' : 'Reactivate this account?',
      message:
        nextStatus === 'suspended'
          ? `${user.name} (${user.email}) will be signed out of every device immediately and blocked from signing in until the account is re-activated.`
          : `${user.name} (${user.email}) will regain access to their account, links and collections.`,
      confirmLabel: nextStatus === 'suspended' ? 'Suspend account' : 'Reactivate account',
      color: nextStatus === 'suspended' ? 'orange' : 'teal',
      onConfirm: async () => {
        setBusyUserId(user._id)
        try {
          await adminApi.updateStatus(user._id, nextStatus)
          notifications.show({
            title: 'Status Updated',
            message: `${user.name} is now ${nextStatus}.`,
            color: nextStatus === 'active' ? 'teal' : 'orange',
          })
          await Promise.all([fetchUsers(), fetchOverview(), fetchActivityStream()])
          setLastSyncedAt(Date.now())
          setSecondsAgo(0)
        } catch (err) {
          notifications.show({ title: 'Error', message: err.message || 'Failed to change status.', color: 'red' })
        } finally {
          setBusyUserId(null)
        }
      },
    })
  }

  const handleToggleRole = (user) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin'
    requestConfirm({
      title: nextRole === 'admin' ? 'Grant administrator access?' : 'Remove administrator access?',
      message:
        nextRole === 'admin'
          ? `${user.name} (${user.email}) will gain full admin console access. Their active sessions will be revoked so the new permissions apply immediately.`
          : `${user.name} (${user.email}) will lose admin console access. Their active sessions will be revoked and they will need to sign in again.`,
      confirmLabel: nextRole === 'admin' ? 'Make administrator' : 'Demote to user',
      color: nextRole === 'admin' ? 'yellow' : 'blue',
      onConfirm: async () => {
        setBusyUserId(user._id)
        try {
          await adminApi.updateRole(user._id, nextRole)
          notifications.show({
            title: 'Role Updated',
            message: `${user.name} role changed to ${nextRole}.`,
            color: nextRole === 'admin' ? 'yellow' : 'blue',
          })
          await Promise.all([fetchUsers(), fetchOverview(), fetchActivityStream()])
          setLastSyncedAt(Date.now())
          setSecondsAgo(0)
        } catch (err) {
          notifications.show({ title: 'Error', message: err.message || 'Failed to update role.', color: 'red' })
        } finally {
          setBusyUserId(null)
        }
      },
    })
  }

  const handleForceLogout = (user) => {
    requestConfirm({
      title: 'Sign out all devices?',
      message: `${user.name} (${user.email}) will be signed out of every active browser and device. They can sign back in with their existing password.`,
      confirmLabel: 'Sign out everywhere',
      color: 'orange',
      onConfirm: async () => {
        setBusyUserId(user._id)
        try {
          await adminApi.resetSessions(user._id)
          notifications.show({
            title: 'Sessions Terminated',
            message: `Terminated all active device sessions for ${user.email}.`,
            color: 'teal',
          })
          await Promise.all([fetchUsers(), fetchOverview(), fetchActivityStream()])
          setLastSyncedAt(Date.now())
          setSecondsAgo(0)
        } catch (err) {
          notifications.show({ title: 'Error', message: err.message || 'Failed to terminate sessions.', color: 'red' })
        } finally {
          setBusyUserId(null)
        }
      },
    })
  }

  const handleDeleteUser = (user) => {
    requestConfirm({
      title: 'Delete user permanently?',
      message: `This permanently deletes ${user.name} (${user.email}), ${user.totalLinks || 0} links, ${user.collectionsCount || 0} collections, every session and all related records. This action cannot be undone.`,
      confirmLabel: 'Delete user',
      color: 'red',
      onConfirm: async () => {
        setBusyUserId(user._id)
        try {
          await adminApi.deleteUser(user._id)
          notifications.show({
            title: 'User Deleted',
            message: `Permanently removed user ${user.email} and all data.`,
            color: 'red',
          })
          await Promise.all([fetchUsers(), fetchOverview(), fetchActivityStream()])
          setLastSyncedAt(Date.now())
          setSecondsAgo(0)
        } catch (err) {
          notifications.show({ title: 'Error', message: err.message || 'Failed to delete user.', color: 'red' })
        } finally {
          setBusyUserId(null)
        }
      },
    })
  }

  const handleDeleteLink = (linkId, title) => {
    const label = (title || '').trim() || 'Untitled link'
    requestConfirm({
      title: 'Delete this link?',
      message: `"${label}" will be permanently removed from the database, including its visit history. This cannot be undone.`,
      confirmLabel: 'Delete link',
      color: 'red',
      onConfirm: async () => {
        setBusyLinkId(linkId)
        try {
          await adminApi.deleteLink(linkId)
          notifications.show({ message: 'Link permanently deleted', color: 'teal' })
          await Promise.all([fetchGlobalLinks(), fetchOverview(), fetchActivityStream()])
          setLastSyncedAt(Date.now())
          setSecondsAgo(0)
        } catch (err) {
          notifications.show({ message: err.message || 'Failed to delete link', color: 'red' })
        } finally {
          setBusyLinkId(null)
        }
      },
    })
  }

  const handleRevokeSession = (sessionId) => {
    requestConfirm({
      title: 'Terminate this session?',
      message:
        'The device will be signed out immediately. If this is the session you are currently using, you will also be signed out.',
      confirmLabel: 'Terminate session',
      color: 'red',
      onConfirm: async () => {
        setBusySessionId(sessionId)
        try {
          await adminApi.revokeSession(sessionId)
          notifications.show({ message: 'Session revoked successfully', color: 'teal' })
          await Promise.all([fetchGlobalSessions(), fetchOverview(), fetchActivityStream()])
          setLastSyncedAt(Date.now())
          setSecondsAgo(0)
        } catch (err) {
          notifications.show({ message: err.message || 'Failed to revoke session', color: 'red' })
        } finally {
          setBusySessionId(null)
        }
      },
    })
  }

  const handleExportAudit = async () => {
    try {
      const { blob, filename } = await adminApi.exportReport()
      downloadBlob(blob, filename || `linkarium-audit-${Date.now()}.json`)
      notifications.show({ message: 'Audit report downloaded successfully', color: 'teal' })
    } catch (err) {
      notifications.show({ message: err.message || 'Export failed', color: 'red' })
    }
  }

  const metrics = overview?.metrics || {}
  const system = overview?.system || {}

  const hasUserFilters =
    Boolean(searchQuery.trim()) ||
    roleFilter !== 'all' ||
    statusFilter !== 'all' ||
    twoFactorFilter !== 'all' ||
    sortOption !== 'newest'

  const resetUserFilters = () => {
    setSearchQuery('')
    setRoleFilter('all')
    setStatusFilter('all')
    setTwoFactorFilter('all')
    setSortOption('newest')
    setUsersPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleSelectCollection = (name) => {
    if (name === selectedCollection) return
    setSelectedCollection(name)
    setCollectionPage(1)
    setCollectionSearch('')
    setCollectionData(null)
    setLoadingCollectionData(true)
  }

  return (
    <div className="admin-shell">
      {/* Top Console Bar */}
      <header className="admin-header">
        <div className="admin-header-main-row">
          <div className="admin-brand-cluster">
            <div className="master-crown-badge">
              <IconCrown size={20} color="#ffffff" />
            </div>
            <div className="admin-brand-info">
              <div className="admin-brand-title">
                <span>Linkarium</span> <span className="gold-text">Admin</span>
                <Badge variant="gradient" gradient={{ from: '#6a18b8', to: '#00e5ff', deg: 135 }} size="xs" radius="sm" className="root-console-badge">
                  ROOT
                </Badge>
              </div>
              <div className="admin-brand-sub">
                Platform Governance &amp; Deep Telemetry
              </div>
            </div>
          </div>

          {/* Desktop Direct Action Buttons */}
          <div className="admin-desktop-actions">
            <div className="system-status-pill">
              <span className="pulse-dot" />
              <span>MongoDB {system.mongoState || 'connected'}</span>
              <span className="dot-sep">•</span>
              <span>{(metrics.totalUsers || 0).toLocaleString()} Users</span>
              <span className="dot-sep">•</span>
              <span>{(metrics.totalLinks || 0).toLocaleString()} Links</span>
            </div>

            <Button
              size="xs"
              variant="light"
              color="cyan"
              leftSection={<IconDownload size={14} />}
              onClick={handleExportAudit}
            >
              Export Audit
            </Button>

            <Button
              size="xs"
              variant="subtle"
              color="gray"
              leftSection={<IconArrowLeft size={15} />}
              onClick={() => navigate('/')}
            >
              Back to App
            </Button>

            <Button
              size="xs"
              color="red"
              variant="subtle"
              leftSection={<IconLogout size={14} />}
              onClick={() => {
                logout()
                navigate('/auth')
              }}
            >
              Sign Out
            </Button>
          </div>

          {/* Mobile Quick Action Buttons */}
          <div className="admin-mobile-actions">
            <Tooltip label="Back to App" withArrow>
              <ActionIcon
                size="md"
                variant="subtle"
                color="gray"
                onClick={() => navigate('/')}
                aria-label="Back to App"
              >
                <IconArrowLeft size={18} />
              </ActionIcon>
            </Tooltip>

            <Menu position="bottom-end" withArrow shadow="md">
              <Menu.Target>
                <ActionIcon size="md" variant="default" aria-label="Console Actions">
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Console Actions</Menu.Label>
                <Menu.Item
                  leftSection={<IconDownload size={15} />}
                  onClick={handleExportAudit}
                >
                  Export Audit JSON
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconArrowLeft size={15} />}
                  onClick={() => navigate('/')}
                >
                  Return to Linkarium App
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={15} />}
                  onClick={() => {
                    logout()
                    navigate('/auth')
                  }}
                >
                  Sign Out of Console
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
        </div>

        {/* Live Dynamic Sync Control Bar */}
        <div className="admin-sync-bar-row">
          <div className="live-sync-pill">
            <span className={`live-radar-dot ${autoSyncSecs > 0 ? 'active' : 'paused'}`} />
            <div className="live-sync-meta">
              <span className="live-sync-label">
                {autoSyncSecs > 0 ? (
                  <>
                    <strong>LIVE</strong> <span className="sync-rate">({autoSyncSecs}s)</span>
                  </>
                ) : (
                  <span className="text-dimmed">PAUSED</span>
                )}
              </span>
              <span className="live-sync-time">
                {isLiveSyncing ? 'Syncing...' : secondsAgo === 0 ? 'Just now' : `${secondsAgo}s ago`}
              </span>
            </div>

            <Select
              size="xs"
              variant="unstyled"
              value={String(autoSyncSecs)}
              onChange={(val) => setAutoSyncSecs(Number(val))}
              data={[
                { value: '3', label: '⚡ Ultra (3s)' },
                { value: '5', label: '🟢 Realtime (5s)' },
                { value: '15', label: '⏱️ Normal (15s)' },
                { value: '30', label: '🐢 Eco (30s)' },
                { value: '0', label: '⏸️ Paused' },
              ]}
              className="sync-interval-select"
              styles={{
                input: {
                  color: '#94a3b8',
                  fontSize: '0.72rem',
                  padding: '2px 6px',
                  height: '24px',
                  minHeight: '24px',
                  cursor: 'pointer',
                },
              }}
            />

            <Tooltip label="Instant Telemetry Sync" withArrow>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="cyan"
                loading={isLiveSyncing || refreshing}
                onClick={() => syncTelemetry(false)}
                className="sync-now-btn"
              >
                <IconRefresh size={14} />
              </ActionIcon>
            </Tooltip>
          </div>

          {/* Quick mobile status info */}
          <div className="mobile-status-quick">
            <span className="pulse-dot" />
            <span>{(metrics.totalUsers || 0).toLocaleString()} Users</span>
            <span className="dot-sep">•</span>
            <span>{(metrics.totalLinks || 0).toLocaleString()} Links</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="admin-main-stage">
        {/* Navigation Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab} variant="outline" className="admin-tabs">
          <Tabs.List className="admin-tab-bar">
            <Tabs.Tab value="overview" leftSection={<IconActivity size={16} />}>
              Executive Pulse &amp; Metrics
            </Tabs.Tab>
            <Tabs.Tab
              value="users"
              leftSection={<IconUsers size={16} />}
              rightSection={<Badge size="xs" variant="filled" color="grape" radius="xl">{(metrics.totalUsers || 0).toLocaleString()}</Badge>}
            >
              User Directory &amp; Tracking
            </Tabs.Tab>
            <Tabs.Tab
              value="links"
              leftSection={<IconLink size={16} />}
              rightSection={<Badge size="xs" variant="filled" color="cyan" radius="xl">{(metrics.totalLinks || 0).toLocaleString()}</Badge>}
            >
              Global Links Explorer
            </Tabs.Tab>
            <Tabs.Tab
              value="sessions"
              leftSection={<IconDeviceDesktop size={16} />}
              rightSection={<Badge size="xs" variant="filled" color="teal" radius="xl">{(metrics.activeSessions || 0).toLocaleString()}</Badge>}
            >
              Active Sessions Radar
            </Tabs.Tab>
            <Tabs.Tab
              value="database"
              leftSection={<IconDatabase size={16} />}
              rightSection={<Badge size="xs" variant="filled" color="indigo" radius="xl">{(dbOverview?.collections?.length || 0).toLocaleString()}</Badge>}
            >
              Database Center &amp; Atlas Vault
            </Tabs.Tab>
            <Tabs.Tab
              value="security"
              leftSection={<IconShieldCheck size={16} />}
              rightSection={<Badge size="xs" variant="filled" color="yellow" radius="xl">Root</Badge>}
            >
              Security &amp; Master Authority
            </Tabs.Tab>
          </Tabs.List>

          {/* ================================================================= */}
          {/* TAB 1: EXECUTIVE PULSE & METRICS */}
          {/* ================================================================= */}
          <Tabs.Panel value="overview" pt="lg">
            {loadingOverview && !overview ? (
              <div className="tab-loading-state">
                <Loader color="cyan" size="lg" />
                <Text size="sm" c="dimmed">Loading system intelligence &amp; metrics...</Text>
              </div>
            ) : (
              <div className="overview-container">
                {/* 6 Hero KPI Cards */}
                <div className="hero-kpi-grid">
                  <div className="hero-kpi-card glass-panel border-gold">
                    <div className="hero-kpi-head">
                      <span className="hero-kpi-title">Total Users</span>
                      <div className="kpi-icon-box bg-gold"><IconUsers size={20} /></div>
                    </div>
                    <div className="hero-kpi-number">{metrics.totalUsers || 0}</div>
                    <div className="hero-kpi-footer">
                      <span className="pill-badge pill-green">{metrics.activeUsers || 0} Active</span>
                      <span className="pill-badge pill-red">{metrics.suspendedUsers || 0} Suspended</span>
                      <span className="pill-badge pill-yellow">{metrics.adminUsers || 0} Admins</span>
                    </div>
                    <div className="kpi-sub-trend">+{metrics.newUsers7d || 0} registered this week</div>
                  </div>

                  <div className="hero-kpi-card glass-panel border-blue">
                    <div className="hero-kpi-head">
                      <span className="hero-kpi-title">Total Links Stored</span>
                      <div className="kpi-icon-box bg-blue"><IconLink size={20} /></div>
                    </div>
                    <div className="hero-kpi-number">{metrics.totalLinks || 0}</div>
                    <div className="hero-kpi-footer">
                      <span className="pill-badge pill-blue">{metrics.activeLinks || 0} Active</span>
                      <span className="pill-badge pill-gray">{metrics.trashLinks || 0} Trash</span>
                      <span className="pill-badge pill-purple">{metrics.favoriteLinks || 0} Starred</span>
                    </div>
                    <div className="kpi-sub-trend">+{metrics.newLinks7d || 0} saved in last 7 days</div>
                  </div>

                  <div className="hero-kpi-card glass-panel border-emerald">
                    <div className="hero-kpi-head">
                      <span className="hero-kpi-title">Platform Visits</span>
                      <div className="kpi-icon-box bg-emerald"><IconFlame size={20} /></div>
                    </div>
                    <div className="hero-kpi-number">{metrics.totalVisits || 0}</div>
                    <div className="hero-kpi-footer">
                      <span className="pill-badge pill-emerald">Live Engagement</span>
                      <span className="pill-badge pill-gray">All users combined</span>
                    </div>
                    <div className="kpi-sub-trend">Total clicks on stored bookmarks</div>
                  </div>

                  <div className="hero-kpi-card glass-panel border-teal">
                    <div className="hero-kpi-head">
                      <span className="hero-kpi-title">Active Devices &amp; Sessions</span>
                      <div className="kpi-icon-box bg-teal"><IconDeviceDesktop size={20} /></div>
                    </div>
                    <div className="hero-kpi-number">{metrics.activeSessions || 0}</div>
                    <div className="hero-kpi-footer">
                      <span className="pill-badge pill-teal">{metrics.activeSessions || 0} Online</span>
                      <span className="pill-badge pill-gray">{metrics.totalSessions || 0} Total logged</span>
                    </div>
                    <div className="kpi-sub-trend">Live authenticated browser &amp; app tokens</div>
                  </div>

                  <div className="hero-kpi-card glass-panel border-indigo">
                    <div className="hero-kpi-head">
                      <span className="hero-kpi-title">Collections</span>
                      <div className="kpi-icon-box bg-indigo"><IconFolder size={20} /></div>
                    </div>
                    <div className="hero-kpi-number">{metrics.totalCollections || 0}</div>
                    <div className="hero-kpi-footer">
                      <span className="pill-badge pill-indigo">{metrics.totalCollections || 0} Folders</span>
                      <span className="pill-badge pill-blue">{metrics.sharedCollections || 0} Shared</span>
                    </div>
                    <div className="kpi-sub-trend">Organized workspaces across all users</div>
                  </div>

                  <div className="hero-kpi-card glass-panel border-amber">
                    <div className="hero-kpi-head">
                      <span className="hero-kpi-title">2FA &amp; Developer Keys</span>
                      <div className="kpi-icon-box bg-amber"><IconKey size={20} /></div>
                    </div>
                    <div className="hero-kpi-number">{metrics.totalApiKeys || 0}</div>
                    <div className="hero-kpi-footer">
                      <span className="pill-badge pill-emerald">{metrics.twoFactorUsers || 0} on 2FA</span>
                      <span className="pill-badge pill-amber">{metrics.totalApiKeys || 0} API Keys</span>
                    </div>
                    <div className="kpi-sub-trend">Security posture &amp; developer integrations</div>
                  </div>
                </div>

                {/* Two-Column Analytics: Top Domains & Platform Pulse */}
                <div className="analytics-split-row">
                  {/* Top Domains saved */}
                  <div className="glass-panel domain-radar-panel">
                    <div className="panel-header">
                      <div className="panel-title-group">
                        <IconWorld size={18} color="#3b82f6" />
                        <h3>Top Saved Web Domains</h3>
                      </div>
                      <Badge variant="light" color="blue">Global Intelligence</Badge>
                    </div>
                    <div className="domain-list">
                      {(overview?.topDomains || []).length === 0 ? (
                        <div className="empty-sub">No domain data available yet.</div>
                      ) : (
                        overview.topDomains.map((d, idx) => {
                          const maxCount = overview.topDomains[0]?.count || 1
                          const percent = Math.round((d.count / maxCount) * 100)
                          return (
                            <div key={d.domain} className="domain-row">
                              <div className="domain-info-line">
                                <span className="domain-rank">#{idx + 1}</span>
                                <span className="domain-name">{d.domain}</span>
                                <span className="domain-count">{d.count} links</span>
                              </div>
                              <Progress
                                value={percent}
                                color="blue"
                                size="sm"
                                radius="xl"
                                styles={{ root: { background: 'rgba(255, 255, 255, 0.05)' } }}
                              />
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* System & Server Health */}
                  <div className="glass-panel sys-health-panel">
                    <div className="panel-header">
                      <div className="panel-title-group">
                        <IconServer size={18} color="#10b981" />
                        <h3>Host &amp; Infrastructure Health</h3>
                      </div>
                      <Badge variant="light" color="teal">Online</Badge>
                    </div>

                    <div className="sys-metrics-grid">
                      <div className="sys-metric-box">
                        <span className="sys-lbl">Node Runtime</span>
                        <span className="sys-val code-font">{system.nodeVersion || 'v22.x'}</span>
                      </div>
                      <div className="sys-metric-box">
                        <span className="sys-lbl">Database State</span>
                        <span className="sys-val sys-green">{system.mongoState || 'Connected'}</span>
                      </div>
                      <div className="sys-metric-box">
                        <span className="sys-lbl">Server Uptime (Live)</span>
                        <span className="sys-val">
                          {Math.floor(((system.uptime || 0) + secondsAgo) / 3600)}h{' '}
                          {Math.floor((((system.uptime || 0) + secondsAgo) % 3600) / 60)}m{' '}
                          {Math.floor(((system.uptime || 0) + secondsAgo) % 60)}s
                        </span>
                      </div>
                      <div className="sys-metric-box">
                        <span className="sys-lbl">RAM Usage (RSS)</span>
                        <span className="sys-val">{system.memoryRssMb || 0} MB</span>
                      </div>
                      <div className="sys-metric-box">
                        <span className="sys-lbl">Memory Heap Used</span>
                        <span className="sys-val">{system.memoryHeapUsedMb || 0} MB</span>
                      </div>
                      <div className="sys-metric-box">
                        <span className="sys-lbl">Environment</span>
                        <span className="sys-val capitalize">{system.env || 'development'}</span>
                      </div>
                    </div>

                    <div className="sys-platform-note">
                      Host: {system.platform || 'Operating System'}
                    </div>
                  </div>
                </div>

                {/* Real-time Platform Activity Radar */}
                <div className="glass-panel activity-radar-panel">
                  <div className="panel-header">
                    <div className="panel-title-group">
                      <IconActivity size={18} color="#10b981" />
                      <h3>Real-Time Platform Activity Radar</h3>
                      <Badge variant="filled" color="teal" size="xs" radius="xl">
                        LIVE RADAR
                      </Badge>
                    </div>
                    <Text size="xs" c="dimmed">
                      {activityEvents.length} events logged &bull; Streaming dynamically across Linkarium
                    </Text>
                  </div>

                  <div className="activity-list">
                    {loadingActivity && activityEvents.length === 0 ? (
                      <div className="tab-loading-state" style={{ minHeight: '120px' }}>
                        <Loader size="sm" color="teal" />
                        <Text size="xs" c="dimmed">Listening for live platform events...</Text>
                      </div>
                    ) : activityEvents.length === 0 ? (
                      <div className="empty-sub">No recent activity detected.</div>
                    ) : (
                      activityEvents.map((evt) => {
                        const isRecent = Date.now() - new Date(evt.timestamp).getTime() < 5 * 60 * 1000
                        return (
                          <div key={evt.id} className="activity-row">
                            <div className="activity-left">
                              <div
                                className={`activity-icon-badge ${
                                  evt.type === 'user_signup'
                                    ? 'type-signup'
                                    : evt.type === 'link_created'
                                    ? 'type-link'
                                    : 'type-session'
                                }`}
                              >
                                {evt.type === 'user_signup' && <IconUserPlus size={18} />}
                                {evt.type === 'link_created' && <IconLink size={18} />}
                                {evt.type === 'session_active' && <IconDeviceDesktop size={18} />}
                              </div>
                              <div className="activity-info">
                                <div className="activity-title-line">
                                  <span className="activity-title">{evt.title}</span>
                                  <Badge size="xs" variant="light" color={evt.badgeColor}>
                                    {evt.badgeText}
                                  </Badge>
                                  {isRecent && (
                                    <Badge size="xs" variant="dot" color="teal">
                                      NEW
                                    </Badge>
                                  )}
                                </div>
                                <span className="activity-desc" title={evt.description}>
                                  {evt.description}
                                </span>
                              </div>
                            </div>

                            <div className="activity-right">
                              <span className="activity-relative-time">
                                <IconClock size={12} />
                                {formatRelativeTime(evt.timestamp)}
                              </span>
                              <span className="activity-user-tag">
                                {evt.user?.name || evt.user?.email || ''}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Real-time Global Link Stream */}
                <div className="glass-panel live-stream-panel">
                  <div className="panel-header">
                    <div className="panel-title-group">
                      <IconFlame size={18} color="#f59e0b" />
                      <h3>Recent Saves Stream (Across All Users)</h3>
                    </div>
                    <Button size="xs" variant="subtle" onClick={() => setActiveTab('links')}>
                      View All Links →
                    </Button>
                  </div>

                  <div className="stream-links-grid">
                    {(overview?.recentLinks || []).map((link) => (
                      <div key={link._id} className="stream-link-card">
                        <div className="stream-user-row">
                          <span
                            className="stream-avatar"
                            style={{ background: link.user?.avatarColor || '#3b82f6' }}
                          >
                            {initialsOf(link.user?.name)}
                          </span>
                          <span className="stream-user-name">{link.user?.name || 'Unknown User'}</span>
                          <span className="stream-time">
                            {new Date(link.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="stream-link-title" title={link.title}>
                          {link.title}
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="stream-link-url"
                          title={link.url}
                        >
                          {link.url} <IconExternalLink size={12} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Tabs.Panel>

          {/* ================================================================= */}
          {/* TAB 2: USER DIRECTORY & DEEP TRACKING (THE MAIN REQUEST) */}
          {/* ================================================================= */}
          <Tabs.Panel value="users" pt="lg">
            <div className="users-management-container">
              {/* Filter & Search Bar */}
              <div className="glass-panel filter-bar-panel">
                <div className="filter-left-cluster">
                  <TextInput
                    placeholder="Search by name, email, or user ID..."
                    leftSection={<IconSearch size={16} />}
                    size="sm"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.currentTarget.value)
                      setUsersPagination((prev) => ({ ...prev, page: 1 }))
                    }}
                    style={{ minWidth: 280 }}
                    styles={{
                      input: {
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                      },
                    }}
                  />

                  <Select
                    size="sm"
                    value={roleFilter}
                    onChange={(v) => {
                      setRoleFilter(v || 'all')
                      setUsersPagination((prev) => ({ ...prev, page: 1 }))
                    }}
                    data={[
                      { value: 'all', label: 'All Roles' },
                      { value: 'admin', label: '👑 Admins Only' },
                      { value: 'user', label: '👤 Users Only' },
                    ]}
                    styles={{
                      input: {
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                      },
                    }}
                  />

                  <Select
                    size="sm"
                    value={statusFilter}
                    onChange={(v) => {
                      setStatusFilter(v || 'all')
                      setUsersPagination((prev) => ({ ...prev, page: 1 }))
                    }}
                    data={[
                      { value: 'all', label: 'All Statuses' },
                      { value: 'active', label: '🟢 Active Only' },
                      { value: 'suspended', label: '🔴 Suspended Only' },
                    ]}
                    styles={{
                      input: {
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                      },
                    }}
                  />

                  <Select
                    size="sm"
                    value={twoFactorFilter}
                    onChange={(v) => {
                      setTwoFactorFilter(v || 'all')
                      setUsersPagination((prev) => ({ ...prev, page: 1 }))
                    }}
                    data={[
                      { value: 'all', label: 'All 2FA States' },
                      { value: 'enabled', label: '🛡️ 2FA Enabled' },
                      { value: 'disabled', label: '⚠️ 2FA Disabled' },
                    ]}
                    styles={{
                      input: {
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                      },
                    }}
                  />

                  <Select
                    size="sm"
                    value={sortOption}
                    onChange={(v) => {
                      setSortOption(v || 'newest')
                      setUsersPagination((prev) => ({ ...prev, page: 1 }))
                    }}
                    data={[
                      { value: 'newest', label: 'Sort: Newest First' },
                      { value: 'oldest', label: 'Sort: Oldest First' },
                      { value: 'links_desc', label: 'Sort: Most Links' },
                      { value: 'visits_desc', label: 'Sort: Most Visits' },
                      { value: 'last_login', label: 'Sort: Last Login' },
                      { value: 'name_asc', label: 'Sort: Name (A-Z)' },
                    ]}
                    styles={{
                      input: {
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                      },
                    }}
                  />

                  {hasUserFilters && (
                    <Button size="xs" variant="subtle" color="gray" onClick={resetUserFilters}>
                      Clear filters
                    </Button>
                  )}
                </div>

                <div className="filter-right-cluster">
                  <Badge variant="light" color="orange" size="lg">
                    {usersPagination.total} Users Recorded
                  </Badge>
                  <ActionIcon
                    variant="default"
                    size="md"
                    title="Reload users"
                    loading={loadingUsers}
                    onClick={fetchUsers}
                  >
                    <IconRefresh size={16} />
                  </ActionIcon>
                </div>
              </div>

              {/* High-Density Users Table */}
              <div className="glass-panel table-panel">
                {loadingUsers ? (
                  <div className="tab-loading-state">
                    <Loader color="orange" size="md" />
                    <Text size="sm" c="dimmed">Fetching user directory &amp; tracking metrics...</Text>
                  </div>
                ) : users.length === 0 ? (
                  <div className="empty-sub">No users found matching current filters.</div>
                ) : (
                  <Table.ScrollContainer minWidth={1180} type="native" className="admin-table-scroll-container">
                    <Table
                      highlightOnHover
                      verticalSpacing="md"
                      horizontalSpacing="md"
                      className="admin-mantine-table"
                    >
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th style={{ minWidth: 240 }}>User Identity</Table.Th>
                          <Table.Th style={{ minWidth: 120 }}>Role</Table.Th>
                          <Table.Th style={{ minWidth: 110 }}>Status</Table.Th>
                          <Table.Th style={{ minWidth: 110 }}>Security</Table.Th>
                          <Table.Th style={{ minWidth: 90 }}>Links</Table.Th>
                          <Table.Th style={{ minWidth: 90 }}>Visits</Table.Th>
                          <Table.Th style={{ minWidth: 110 }}>Collections</Table.Th>
                          <Table.Th style={{ minWidth: 120 }}>Active Devices</Table.Th>
                          <Table.Th style={{ minWidth: 160 }}>Last Login &amp; IP</Table.Th>
                          <Table.Th style={{ minWidth: 110 }}>Joined</Table.Th>
                          <Table.Th style={{ textAlign: 'right', minWidth: 160 }}>Actions</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {users.map((u) => (
                          <Table.Tr key={u._id} className={u.status === 'suspended' ? 'row-suspended' : ''}>
                            {/* User Identity */}
                            <Table.Td className="user-id-cell">
                              <div className="user-flex-item">
                                <span
                                  className="user-table-avatar"
                                  style={{ background: u.avatarColor || '#3b82f6' }}
                                >
                                  {initialsOf(u.name)}
                                </span>
                                <div className="user-text-cluster">
                                  <div className="user-name-title">
                                    {u.name}
                                    {u.isMaster && (
                                      <Tooltip label="Master Account with Root Authority">
                                        <span className="crown-icon-inline">👑</span>
                                      </Tooltip>
                                    )}
                                    {isSelfUser(u) && (
                                      <Badge size="xs" color="indigo" variant="light">
                                        You
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="user-email-subtitle">
                                    {u.email}
                                  </div>
                                </div>
                              </div>
                            </Table.Td>

                            {/* Role */}
                            <Table.Td className="user-role-cell">
                              {u.isMaster ? (
                                <Badge color="yellow" variant="filled" size="sm">
                                  👑 Master
                                </Badge>
                              ) : u.role === 'admin' ? (
                                <Badge color="blue" variant="light" size="sm">
                                  🛡️ Admin
                                </Badge>
                              ) : (
                                <Badge color="gray" variant="light" size="sm">
                                  👤 User
                                </Badge>
                              )}
                            </Table.Td>

                            {/* Status */}
                            <Table.Td className="user-status-cell">
                              {u.status === 'suspended' ? (
                                <Badge color="red" variant="filled" size="sm">
                                  Suspended
                                </Badge>
                              ) : (
                                <Badge color="teal" variant="light" size="sm">
                                  Active
                                </Badge>
                              )}
                            </Table.Td>

                            {/* Security (2FA) */}
                            <Table.Td className="user-security-cell">
                              {u.twoFactorEnabled ? (
                                <Tooltip label="Two-factor authentication active">
                                  <span className="shield-active">
                                    <IconShieldCheck size={16} /> 2FA On
                                  </span>
                                </Tooltip>
                              ) : (
                                <span className="shield-none">
                                  <IconShield size={14} /> None
                                </span>
                              )}
                            </Table.Td>

                            {/* Links Breakdown */}
                            <Table.Td>
                              <div className="links-count-pill" title={`${u.activeLinks || 0} active, ${u.trashLinks || 0} trash`}>
                                <IconLink size={13} />
                                <strong>{u.totalLinks || 0}</strong>
                              </div>
                            </Table.Td>

                            {/* Visits */}
                            <Table.Td className="visits-count-cell">
                              <span className="visit-badge">
                                <IconFlame size={13} color="#f59e0b" />
                                {u.totalVisits || 0}
                              </span>
                            </Table.Td>

                            {/* Collections */}
                            <Table.Td>
                              <span className="coll-count-text">
                                {u.collectionsCount || 0}
                              </span>
                            </Table.Td>

                            {/* Active Devices */}
                            <Table.Td>
                              <span className={`device-pill ${u.activeSessionsCount > 0 ? 'online' : ''}`}>
                                <IconDeviceDesktop size={13} />
                                {u.activeSessionsCount || 0}
                              </span>
                            </Table.Td>

                            {/* Last Login & IP */}
                            <Table.Td className="last-login-cell">
                              <div className="last-login-time">
                                {u.lastLoginAt
                                  ? new Date(u.lastLoginAt).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : 'Never'}
                              </div>
                              <div className="last-login-ip code-font">
                                {u.lastLoginIp || '—'}
                              </div>
                            </Table.Td>

                            {/* Joined Date */}
                            <Table.Td className="joined-date-cell">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </Table.Td>

                            {/* Actions Dropdown */}
                            <Table.Td style={{ textAlign: 'right' }}>
                              <div className="action-buttons-cell">
                                <Button
                                  size="xs"
                                  variant="light"
                                  color="blue"
                                  leftSection={<IconEye size={13} />}
                                  onClick={() => setInspectUserId(u._id)}
                                >
                                  Inspect
                                </Button>

                                <Menu position="bottom-end" shadow="md" width={250}>
                                  <Menu.Target>
                                    <ActionIcon
                                      variant="subtle"
                                      color="gray"
                                      size="sm"
                                      loading={busyUserId === u._id}
                                      disabled={busyUserId === u._id}
                                    >
                                      <IconDotsVertical size={16} />
                                    </ActionIcon>
                                  </Menu.Target>
                                  <Menu.Dropdown>
                                    <Menu.Item
                                      leftSection={<IconEye size={15} />}
                                      onClick={() => setInspectUserId(u._id)}
                                    >
                                      Deep Inspector
                                    </Menu.Item>

                                    {!u.isMaster ? (
                                      <Menu.Item
                                        leftSection={<IconKey size={15} />}
                                        onClick={() => setResetPasswordUser(u)}
                                      >
                                        Reset Password
                                      </Menu.Item>
                                    ) : (
                                      <Menu.Item
                                        leftSection={<IconKey size={15} />}
                                        disabled
                                        title="The master password is controlled by the MASTER_ADMIN_PASSWORD environment variable."
                                      >
                                        Password managed by server
                                      </Menu.Item>
                                    )}

                                    {isSelfUser(u) ? (
                                      <Menu.Item leftSection={<IconLogout size={15} />} disabled>
                                        Sign Out All Devices (use header)
                                      </Menu.Item>
                                    ) : (
                                      <Menu.Item
                                        leftSection={<IconLogout size={15} />}
                                        onClick={() => handleForceLogout(u)}
                                      >
                                        Sign Out All Devices
                                      </Menu.Item>
                                    )}

                                    {!u.isMaster && !isSelfUser(u) && (
                                      <>
                                        <Menu.Divider />
                                        <Menu.Item
                                          leftSection={
                                            u.status === 'suspended' ? (
                                              <IconUserCheck size={15} />
                                            ) : (
                                              <IconBan size={15} />
                                            )
                                          }
                                          color={u.status === 'suspended' ? 'teal' : 'orange'}
                                          onClick={() => handleToggleStatus(u)}
                                        >
                                          {u.status === 'suspended'
                                            ? 'Re-activate Account'
                                            : 'Suspend Account'}
                                        </Menu.Item>

                                        <Menu.Item
                                          leftSection={<IconCrown size={15} />}
                                          onClick={() => handleToggleRole(u)}
                                        >
                                          {u.role === 'admin' ? 'Demote to User' : 'Make Administrator'}
                                        </Menu.Item>

                                        <Menu.Divider />
                                        <Menu.Item
                                          color="red"
                                          leftSection={<IconTrash size={15} />}
                                          onClick={() => handleDeleteUser(u)}
                                        >
                                          Delete User
                                        </Menu.Item>
                                      </>
                                    )}

                                    {isSelfUser(u) && (
                                      <>
                                        <Menu.Divider />
                                        <Menu.Label>
                                          Self-protected — status, role and deletion are disabled.
                                        </Menu.Label>
                                      </>
                                    )}
                                  </Menu.Dropdown>
                                </Menu>
                              </div>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                )}
                {!loadingUsers && users.length > 0 && (
                  <TablePager
                    pagination={usersPagination}
                    onChange={(page) => setUsersPagination((prev) => ({ ...prev, page }))}
                  />
                )}
              </div>
            </div>
          </Tabs.Panel>

          {/* ================================================================= */}
          {/* TAB 3: GLOBAL LINKS EXPLORER */}
          {/* ================================================================= */}
          <Tabs.Panel value="links" pt="lg">
            <div className="global-links-container">
              <div className="glass-panel filter-bar-panel">
                <TextInput
                  placeholder={
                    linksPagination.total
                      ? `Search ${linksPagination.total.toLocaleString()} links by title, URL, or tag...`
                      : 'Search all links by title, URL, or tag...'
                  }
                  leftSection={<IconSearch size={16} />}
                  size="sm"
                  value={linkSearch}
                  onChange={(e) => {
                    setLinkSearch(e.currentTarget.value)
                    setLinksPagination((p) => ({ ...p, page: 1 }))
                  }}
                  style={{ minWidth: 340 }}
                  styles={{
                    input: {
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'rgba(255, 255, 255, 0.12)',
                      color: '#fff',
                    },
                  }}
                />
                <div className="filter-right-cluster">
                  {linkSearch && (
                    <Button
                      size="xs"
                      variant="subtle"
                      color="gray"
                      onClick={() => {
                        setLinkSearch('')
                        setLinksPagination((p) => ({ ...p, page: 1 }))
                      }}
                    >
                      Clear search
                    </Button>
                  )}
                  <Badge variant="light" color="blue" size="lg">
                    {linksPagination.total.toLocaleString()} Total Links
                  </Badge>
                  <ActionIcon
                    variant="default"
                    size="md"
                    loading={loadingLinks}
                    onClick={fetchGlobalLinks}
                  >
                    <IconRefresh size={16} />
                  </ActionIcon>
                </div>
              </div>

              <div className="glass-panel table-panel">
                {loadingLinks ? (
                  <div className="tab-loading-state">
                    <Loader color="blue" size="md" />
                    <Text size="sm" c="dimmed">Searching global links database...</Text>
                  </div>
                ) : globalLinks.length === 0 ? (
                  <div className="empty-sub">No links found matching search query.</div>
                ) : (
                  <Table.ScrollContainer minWidth={980} type="native" className="admin-table-scroll-container">
                    <Table
                      highlightOnHover
                      verticalSpacing="md"
                      horizontalSpacing="md"
                      className="admin-mantine-table"
                    >
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th style={{ minWidth: 280 }}>Link Title &amp; Target URL</Table.Th>
                          <Table.Th style={{ minWidth: 180 }}>Owner Account</Table.Th>
                          <Table.Th style={{ minWidth: 140 }}>Collection</Table.Th>
                          <Table.Th style={{ minWidth: 90 }}>Visits</Table.Th>
                          <Table.Th style={{ minWidth: 140 }}>Tags</Table.Th>
                          <Table.Th style={{ minWidth: 110 }}>Created</Table.Th>
                          <Table.Th style={{ textAlign: 'right', minWidth: 110 }}>Actions</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {globalLinks.map((link) => (
                          <Table.Tr key={link._id}>
                            <Table.Td style={{ maxWidth: 320 }}>
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
                            </Table.Td>
                            <Table.Td>
                              {link.user ? (
                                <div className="user-flex-item">
                                  <span
                                    className="user-table-avatar mini"
                                    style={{ background: link.user.avatarColor || '#3b82f6' }}
                                  >
                                    {initialsOf(link.user.name)}
                                  </span>
                                  <div className="user-text-cluster">
                                    <div className="user-name-title">{link.user.name}</div>
                                    <div className="user-email-subtitle">{link.user.email}</div>
                                  </div>
                                </div>
                              ) : (
                                <span className="dim-text">Unknown</span>
                              )}
                            </Table.Td>
                            <Table.Td>
                              {link.collectionId ? (
                                <span className="coll-tag" style={{ borderColor: link.collectionId.color }}>
                                  {link.collectionId.name}
                                </span>
                              ) : (
                                <span className="dim-text">Unorganized</span>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <span className="visit-badge">
                                <IconFlame size={13} color="#f59e0b" /> {link.visits || 0}
                              </span>
                            </Table.Td>
                            <Table.Td>
                              <div className="tag-chips">
                                {(link.tags || []).slice(0, 3).map((t) => (
                                  <span key={t} className="tag-chip">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            </Table.Td>
                            <Table.Td className="joined-date-cell">
                              {new Date(link.createdAt).toLocaleDateString()}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right' }}>
                              <div className="action-buttons-cell">
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="icon-btn-ext"
                                  title="Open in new tab"
                                >
                                  <IconExternalLink size={16} />
                                </a>
                                <ActionIcon
                                  color="red"
                                  variant="subtle"
                                  size="sm"
                                  title="Delete link"
                                  loading={busyLinkId === link._id}
                                  disabled={busyLinkId === link._id}
                                  onClick={() => handleDeleteLink(link._id, link.title)}
                                >
                                  <IconTrash size={15} />
                                </ActionIcon>
                              </div>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                )}
                {!loadingLinks && globalLinks.length > 0 && (
                  <TablePager
                    pagination={linksPagination}
                    color="blue"
                    onChange={(page) => setLinksPagination((prev) => ({ ...prev, page }))}
                  />
                )}
              </div>
            </div>
          </Tabs.Panel>

          {/* ================================================================= */}
          {/* TAB 4: ACTIVE SESSIONS RADAR */}
          {/* ================================================================= */}
          <Tabs.Panel value="sessions" pt="lg">
            <div className="sessions-radar-container">
              <div className="glass-panel filter-bar-panel">
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                    Live Active Device Sessions Across All Users
                  </h3>
                  <Text size="xs" c="dimmed">
                    Track logged-in platforms, browsers, OS and IP origins in real-time.
                  </Text>
                </div>
                <div className="filter-right-cluster">
                  <Badge variant="light" color="teal" size="lg">
                    {sessionsPagination.total.toLocaleString()} Active Sessions
                  </Badge>
                  <ActionIcon
                    variant="default"
                    size="md"
                    loading={loadingSessions}
                    onClick={fetchGlobalSessions}
                  >
                    <IconRefresh size={16} />
                  </ActionIcon>
                </div>
              </div>

              <div className="glass-panel table-panel">
                {loadingSessions ? (
                  <div className="tab-loading-state">
                    <Loader color="teal" size="md" />
                    <Text size="sm" c="dimmed">Scanning active session tokens...</Text>
                  </div>
                ) : globalSessions.length === 0 ? (
                  <div className="empty-sub">No active sessions found.</div>
                ) : (
                  <Table.ScrollContainer minWidth={920} type="native" className="admin-table-scroll-container">
                    <Table
                      highlightOnHover
                      verticalSpacing="md"
                      horizontalSpacing="md"
                      className="admin-mantine-table"
                    >
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th style={{ minWidth: 220 }}>User</Table.Th>
                          <Table.Th style={{ minWidth: 220 }}>Device &amp; Operating System</Table.Th>
                          <Table.Th style={{ minWidth: 140 }}>IP Origin</Table.Th>
                          <Table.Th style={{ minWidth: 150 }}>Last Activity</Table.Th>
                          <Table.Th style={{ minWidth: 150 }}>Session Expiry</Table.Th>
                          <Table.Th style={{ textAlign: 'right', minWidth: 100 }}>Action</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {globalSessions.map((s) => (
                          <Table.Tr key={s._id}>
                            <Table.Td>
                              {s.user ? (
                                <div className="user-flex-item">
                                  <span
                                    className="user-table-avatar mini"
                                    style={{ background: s.user.avatarColor || '#3b82f6' }}
                                  >
                                    {initialsOf(s.user.name)}
                                  </span>
                                  <div className="user-text-cluster">
                                    <div className="user-name-title">
                                      {s.user.name} {s.user.isMaster && '👑'}
                                      {isSelfUser(s.user) && (
                                        <Badge size="xs" color="indigo" variant="light">
                                          You
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="user-email-subtitle">{s.user.email}</div>
                                  </div>
                                </div>
                              ) : (
                                <span className="dim-text">Orphaned Token</span>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <IconDeviceDesktop size={18} color="#10b981" />
                                <div>
                                  <div style={{ fontWeight: 600, color: '#fff' }}>
                                    {s.device?.browser || 'Browser'} on {s.device?.os || 'OS'}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {s.userAgent}
                                  </div>
                                </div>
                              </div>
                            </Table.Td>
                            <Table.Td className="code-font" style={{ color: '#60a5fa' }}>
                              {s.ip || 'Local / Unknown'}
                            </Table.Td>
                            <Table.Td className="last-login-cell">
                              {new Date(s.lastUsedAt).toLocaleString()}
                            </Table.Td>
                            <Table.Td className="dim-text" style={{ fontSize: '0.8rem' }}>
                              {new Date(s.expiresAt).toLocaleString()}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right' }}>
                              <Button
                                size="xs"
                                color="red"
                                variant="subtle"
                                loading={busySessionId === s._id}
                                disabled={busySessionId === s._id}
                                onClick={() => handleRevokeSession(s._id)}
                              >
                                Terminate
                              </Button>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                )}
                {!loadingSessions && globalSessions.length > 0 && (
                  <TablePager
                    pagination={sessionsPagination}
                    color="teal"
                    onChange={(page) => setSessionsPagination((prev) => ({ ...prev, page }))}
                  />
                )}
              </div>
            </div>
          </Tabs.Panel>

          {/* ================================================================= */}
          {/* TAB 5: MASTER CREDENTIALS & SECURITY AUDIT */}
          {/* ================================================================= */}
          <Tabs.Panel value="security" pt="lg">
            <div className="security-panel-container">
              <div className="glass-panel security-info-box">
                <div className="sec-head-line">
                  <div className="gold-crown-circle">
                    <IconCrown size={28} color="#f59e0b" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>
                      Master Account Security &amp; Privileges
                    </h3>
                    <Text size="sm" c="dimmed">
                      Root administrative authority, access parameters and fail-safe authentication.
                    </Text>
                  </div>
                </div>

                <div className="sec-credentials-card">
                  <div className="cred-field">
                    <span className="cred-label">Signed-in Administrator</span>
                    <span className="cred-value">
                      {currentUser?.name || 'Unknown'}
                      <span className="cred-sub code-font">{currentUser?.email || '—'}</span>
                    </span>
                  </div>
                  <div className="cred-field">
                    <span className="cred-label">Master Email</span>
                    <span className="cred-value code-font">
                      {currentUser?.isMaster ? currentUser.email : 'Configured via MASTER_ADMIN_EMAIL'}
                    </span>
                  </div>
                  <div className="cred-field">
                    <span className="cred-label">Master Password</span>
                    <span className="cred-value" style={{ color: '#fbbf24' }}>
                      Environment-managed (MASTER_ADMIN_PASSWORD)
                    </span>
                  </div>
                  <div className="cred-field">
                    <span className="cred-label">Master Account Authority</span>
                    <span className="cred-value">
                      <Badge color="yellow" variant="filled">Root Administrator</Badge>
                    </span>
                  </div>
                  <div className="cred-field">
                    <span className="cred-label">Fail-Safe Auto-Initialization</span>
                    <span className="cred-value" style={{ color: '#10b981' }}>
                      Active (Always synchronized on boot &amp; login)
                    </span>
                  </div>
                  <div className="cred-field">
                    <span className="cred-label">Self-Protection Safeguard</span>
                    <span className="cred-value">
                      Enabled — master account is immutable, and admins cannot suspend, demote, or
                      delete themselves.
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', gap: 12 }}>
                  <Button
                    color="orange"
                    leftSection={<IconDownload size={16} />}
                    onClick={handleExportAudit}
                  >
                    Download Full JSON Audit Manifest
                  </Button>
                </div>
              </div>
            </div>
          </Tabs.Panel>

          {/* ================================================================= */}
          {/* TAB 6: COMPLETE DATABASE VAULT & ATLAS EXPLORER */}
          {/* ================================================================= */}
          <Tabs.Panel value="database" pt="lg">
            {loadingDb && !dbOverview ? (
              <div className="glass-panel tab-loading-state" style={{ minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Loader color="cyan" size="lg" />
                <Text size="sm" c="dimmed">
                  Querying MongoDB Atlas cluster telemetry &amp; collection catalog...
                </Text>
              </div>
            ) : (
              <div className="database-vault-container">
              {/* 1. Engine & Storage Architecture Hero Banner */}
              <div className="glass-panel db-hero-banner">
                <div className="db-hero-left">
                  <div className="db-cluster-badge">
                    <IconDatabase size={26} color="#06b6d4" />
                  </div>
                  <div>
                    <div className="db-title-row">
                      <h2 className="db-cluster-name">
                        MongoDB Atlas Database: <span className="cyan-text">{dbOverview?.database?.name || 'linksaver'}</span>
                      </h2>
                      <Badge color="teal" variant="filled" size="sm">
                        🟢 Cluster Online ({dbOverview?.database?.pingMs || 0} ms latency)
                      </Badge>
                    </div>
                    <div className="db-cluster-meta">
                      <span>Cluster Host: <strong className="code-font">{dbOverview?.database?.host || 'MongoDB Atlas'}</strong></span>
                      <span className="dot-sep">•</span>
                      <span>Total Objects: <strong style={{ color: '#fff' }}>{(dbOverview?.database?.totalObjects || 0).toLocaleString()} documents</strong></span>
                      <span className="dot-sep">•</span>
                      <span>Collections: <strong style={{ color: '#fff' }}>{dbOverview?.database?.totalCollections || 0} collections</strong></span>
                    </div>
                  </div>
                </div>

                <div className="db-hero-actions">
                  <Button
                    color="cyan"
                    variant="filled"
                    leftSection={<IconDownload size={16} />}
                    loading={downloadingDbDump}
                    onClick={handleDownloadDbDump}
                    styles={{
                      root: {
                        background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                        boxShadow: '0 4px 15px rgba(6, 182, 212, 0.35)',
                      },
                    }}
                  >
                    Download Complete Database Dump (.json)
                  </Button>
                </div>
              </div>

              {/* 2. Database Storage & Memory Metrics Grid */}
              <div className="db-storage-grid">
                <div className="db-stat-card glass-panel border-cyan">
                  <div className="db-stat-lbl">Compressed Storage Size</div>
                  <div className="db-stat-val">{dbOverview?.database?.storageSizeMb || '0'} MB</div>
                  <div className="db-stat-sub">{((dbOverview?.database?.storageSizeBytes || 0) / 1024).toFixed(0)} KB on disk</div>
                </div>
                <div className="db-stat-card glass-panel border-blue">
                  <div className="db-stat-lbl">Uncompressed Data Size</div>
                  <div className="db-stat-val">{dbOverview?.database?.dataSizeMb || '0'} MB</div>
                  <div className="db-stat-sub">Raw document payload</div>
                </div>
                <div className="db-stat-card glass-panel border-purple">
                  <div className="db-stat-lbl">Total Index Footprint</div>
                  <div className="db-stat-val">{dbOverview?.database?.indexSizeMb || '0'} MB</div>
                  <div className="db-stat-sub">{dbOverview?.database?.indexesCount || 0} active compound indexes</div>
                </div>
                <div className="db-stat-card glass-panel border-teal">
                  <div className="db-stat-lbl">Average Document Size</div>
                  <div className="db-stat-val">{dbOverview?.database?.avgObjSizeBytes || 0} bytes</div>
                  <div className="db-stat-sub">Efficient BSON density</div>
                </div>
                <div className="db-stat-card glass-panel border-gold">
                  <div className="db-stat-lbl">Cluster Latency</div>
                  <div className="db-stat-val sys-green">{dbOverview?.database?.pingMs || 0} ms</div>
                  <div className="db-stat-sub">Direct ping to Atlas</div>
                </div>
              </div>

              {/* 3. Collection-by-Collection Catalog Grid */}
              <div className="glass-panel db-collections-catalog">
                <div className="panel-header">
                  <div className="panel-title-group">
                    <IconLayersLinked size={18} color="#06b6d4" />
                    <h3>All Database Collections Breakdown</h3>
                  </div>
                  <Badge variant="light" color="cyan">{(dbOverview?.collections || []).length} Collections Verified</Badge>
                </div>

                <div className="db-collections-grid">
                  {(dbOverview?.collections || []).map((col) => {
                    const isSelected = selectedCollection === col.name
                    return (
                      <div
                        key={col.name}
                        className={`db-col-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectCollection(col.name)}
                      >
                        <div className="db-col-card-top">
                          <span className="db-col-name code-font">{col.name}</span>
                          <Badge size="sm" color={isSelected ? 'cyan' : 'gray'} variant={isSelected ? 'filled' : 'light'}>
                            {col.count.toLocaleString()} docs
                          </Badge>
                        </div>
                        <div className="db-col-desc">{col.description}</div>
                        <div className="db-col-card-meta">
                          <span>Storage: {((col.storageSizeBytes || 0) / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>Indexes: {col.indexesCount}</span>
                          <span>•</span>
                          <span>Avg: {col.avgObjSizeBytes} B</span>
                        </div>
                        <div className="db-col-action-hint">
                          {isSelected ? '✓ Viewing in Compass below' : 'Click to Browse Collection →'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 4. Interactive Live Collection Browser (Database Compass) */}
              <div className="glass-panel db-compass-panel" id="db-compass-view">
                <div className="compass-header">
                  <div className="compass-title-row">
                    <div className="panel-title-group">
                      <IconCode size={20} color="#06b6d4" />
                      <h3>
                        Live Collection Browser: <span className="code-font cyan-text">{selectedCollection}</span>
                      </h3>
                    </div>
                    <Badge color="cyan" variant="light" size="lg">
                      {(collectionData?.total || 0).toLocaleString()} Documents in "{selectedCollection}"
                    </Badge>
                  </div>

                  {/* Quick Collection Switcher Pills */}
                  <div className="compass-col-pills">
                    {(dbOverview?.collections || []).map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        className={`col-pill-btn ${selectedCollection === c.name ? 'active' : ''}`}
                        onClick={() => handleSelectCollection(c.name)}
                      >
                        <span className="pill-name">{c.name}</span>
                        <span className="pill-count">{c.count}</span>
                      </button>
                    ))}
                  </div>

                  {/* Search & Action Bar */}
                  <div className="compass-filter-row">
                    <TextInput
                      placeholder={`Search ${selectedCollection} documents by keyword or ObjectId...`}
                      leftSection={<IconSearch size={15} />}
                      size="sm"
                      value={collectionSearch}
                      onChange={(e) => {
                        setCollectionSearch(e.currentTarget.value)
                        setCollectionPage(1)
                      }}
                      style={{ minWidth: 320 }}
                      styles={{
                        input: {
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderColor: 'rgba(255, 255, 255, 0.12)',
                          color: '#fff',
                        },
                      }}
                    />

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {collectionSearch && (
                        <Button
                          size="xs"
                          variant="subtle"
                          color="gray"
                          onClick={() => {
                            setCollectionSearch('')
                            setCollectionPage(1)
                          }}
                        >
                          Clear search
                        </Button>
                      )}
                      <ActionIcon
                        variant="default"
                        size="md"
                        loading={loadingCollectionData}
                        onClick={() =>
                          fetchCollectionData(
                            selectedCollection,
                            collectionPage,
                            debouncedCollectionSearch
                          )
                        }
                      >
                        <IconRefresh size={16} />
                      </ActionIcon>
                    </div>
                  </div>
                </div>

                {/* Dynamic Data Table */}
                {loadingCollectionData ? (
                  <div className="tab-loading-state">
                    <Loader color="cyan" size="md" />
                    <Text size="sm" c="dimmed">Querying MongoDB collection "{selectedCollection}"...</Text>
                  </div>
                ) : (collectionData?.documents || []).length === 0 ? (
                  <div className="empty-sub">No documents found in "{selectedCollection}".</div>
                ) : (
                  <Table.ScrollContainer minWidth={850} type="native" className="admin-table-scroll-container">
                    <Table
                      highlightOnHover
                      verticalSpacing="md"
                      horizontalSpacing="md"
                      className="admin-mantine-table db-data-table"
                    >
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th style={{ width: 100, minWidth: 90 }}>Action</Table.Th>
                          <Table.Th style={{ width: 220, minWidth: 200 }}>Document _id</Table.Th>
                          {(collectionData?.schemaKeys || [])
                            .filter((k) => k !== '_id' && k !== '__v' && k !== 'password' && k !== 'totp' && k !== 'recoveryCodes')
                            .slice(0, 6)
                            .map((k) => (
                              <Table.Th key={k} className="code-font" style={{ minWidth: 140 }}>{k}</Table.Th>
                            ))}
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {collectionData.documents.map((doc) => (
                          <Table.Tr key={String(doc._id)} className="db-doc-row">
                            <Table.Td>
                              <Button
                                size="xs"
                                variant="light"
                                color="cyan"
                                leftSection={<IconCode size={13} />}
                                onClick={() => setRawDocModalData({ document: doc, collectionName: selectedCollection })}
                              >
                                JSON
                              </Button>
                            </Table.Td>
                            <Table.Td className="code-font" style={{ color: '#06b6d4', fontWeight: 600 }}>
                              {String(doc._id)}
                            </Table.Td>
                            {(collectionData.schemaKeys || [])
                              .filter((k) => k !== '_id' && k !== '__v' && k !== 'password' && k !== 'totp' && k !== 'recoveryCodes')
                              .slice(0, 6)
                              .map((k) => {
                                const val = doc[k]
                                let displayVal = '—'
                                if (val !== undefined && val !== null) {
                                  if (typeof val === 'object') {
                                    if (val instanceof Date || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val))) {
                                      displayVal = new Date(val).toLocaleDateString()
                                    } else if (Array.isArray(val)) {
                                      displayVal = `[Array (${val.length})]`
                                    } else {
                                      displayVal = '{Object}'
                                    }
                                  } else if (typeof val === 'boolean') {
                                    displayVal = val ? 'true' : 'false'
                                  } else {
                                    displayVal = String(val)
                                  }
                                }
                                return (
                                  <Table.Td key={k} className="doc-field-cell" title={String(displayVal)}>
                                    {displayVal}
                                  </Table.Td>
                                )
                              })}
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                )}
                {!loadingCollectionData && (collectionData?.documents || []).length > 0 && (
                  <TablePager
                    pagination={collectionData?.pagination}
                    color="cyan"
                    onChange={setCollectionPage}
                  />
                )}
              </div>
            </div>
          )}
        </Tabs.Panel>
        </Tabs>
      </main>

      {/* Deep User Inspector Modal */}
      <UserInspectorModal
        opened={Boolean(inspectUserId)}
        onClose={() => setInspectUserId(null)}
        userId={inspectUserId}
        onRefreshParent={() => {
          fetchUsers()
          fetchOverview()
        }}
      />

      {/* Admin Reset Password Modal */}
      {resetPasswordUser && (
        <AdminResetPasswordModal
          opened={Boolean(resetPasswordUser)}
          onClose={() => setResetPasswordUser(null)}
          user={resetPasswordUser}
          onSuccess={() => {
            fetchUsers()
            fetchOverview()
          }}
        />
      )}

      {/* Raw Document JSON Modal */}
      <RawDocumentModal
        opened={Boolean(rawDocModalData)}
        onClose={() => setRawDocModalData(null)}
        document={rawDocModalData?.document}
        collectionName={rawDocModalData?.collectionName}
      />

      {/* Branded confirmation dialog for destructive actions */}
      <ConfirmDialog
        opened={Boolean(confirmAction)}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmLabel={confirmAction?.confirmLabel}
        color={confirmAction?.color}
        loading={confirmBusy}
        onConfirm={handleConfirmAction}
        onClose={() => {
          if (!confirmBusy) setConfirmAction(null)
        }}
      />
    </div>
  )
}

function TablePager({ pagination, onChange, color = 'orange' }) {
  const total = pagination?.total || 0
  if (!total) return null

  const page = pagination?.page || 1
  const limit = pagination?.limit || 50
  const totalPages = Math.max(1, pagination?.totalPages || 1)
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div className="table-pager">
      <Text size="xs" c="dimmed">
        Showing <strong>{from.toLocaleString()}</strong>–<strong>{to.toLocaleString()}</strong> of{' '}
        <strong>{total.toLocaleString()}</strong>
      </Text>
      <Pagination
        size="sm"
        radius="md"
        color={color}
        value={page}
        onChange={onChange}
        total={totalPages}
        withEdges={totalPages > 7}
      />
    </div>
  )
}
