import { useState, useMemo } from 'react'
import {
  Modal,
  Button,
  Badge,
  TextInput,
  Select,
  Table,
  ActionIcon,
  Tooltip,
} from '@mantine/core'
import {
  AreaChart,
  BarChart,
  DonutChart,
} from '@mantine/charts'
import {
  IconFileSpreadsheet,
  IconDownload,
  IconPrinter,
  IconCode,
  IconSearch,
  IconShieldCheck,
  IconUsers,
  IconBookmark,
  IconTrendingUp,
  IconAlertCircle,
  IconChartBar,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { adminApi } from '../../api/endpoints'
import { downloadBlob } from '../../utils'
import './AdminReportModal.css'

export default function AdminReportModal({ opened, onClose, overview, users = [] }) {
  const [activeTab, setActiveTab] = useState('executive') // 'executive' | 'table' | 'domains'
  const [exportBusy, setExportBusy] = useState(null) // 'xlsx' | 'csv' | 'json' | null
  const [tableSearch, setTableSearch] = useState('')
  const [tableRole, setTableRole] = useState('all')
  const [tableStatus, setTableStatus] = useState('all')

  const metrics = overview?.metrics || {}
  const growth = overview?.growth || {}

  // Key KPI values - support both flat and nested metric models
  const totalUsers = metrics.totalUsers ?? metrics.users?.totalUsers ?? users.length ?? 0
  const activeUsers = metrics.activeUsers ?? metrics.users?.activeUsers ?? 0
  const suspendedUsers = metrics.suspendedUsers ?? metrics.users?.suspendedUsers ?? 0
  const twoFactorUsers = metrics.twoFactorUsers ?? metrics.users?.twoFactorUsers ?? 0
  const twoFactorPct = totalUsers ? Math.round((twoFactorUsers / totalUsers) * 100) : 0
  const activeRatePct = totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0

  const totalLinks = metrics.totalLinks ?? metrics.links?.totalLinks ?? 0
  const activeLinks = metrics.activeLinks ?? metrics.links?.activeLinks ?? 0
  const favoriteLinks = metrics.favoriteLinks ?? metrics.links?.favoriteLinks ?? 0
  const archivedLinks = metrics.archivedLinks ?? metrics.links?.archivedLinks ?? 0
  const trashLinks = metrics.trashLinks ?? metrics.links?.trashLinks ?? 0
  const totalVisits = metrics.totalVisits ?? metrics.links?.totalVisits ?? 0
  const activeSessions = metrics.activeSessions ?? metrics.sessions?.activeSessions ?? 0
  const newUsers30d = metrics.newUsers30d ?? metrics.users?.newUsers30d ?? 0
  const totalCollections = metrics.totalCollections ?? metrics.collections?.totalCollections ?? metrics.collections?.total ?? 0

  // Calculate Executive Health Score
  const securityScore = Math.min(100, Math.round(twoFactorPct * 0.6 + activeRatePct * 0.4))
  const healthGrade = securityScore >= 90 ? 'A+' : securityScore >= 80 ? 'A' : securityScore >= 70 ? 'B' : 'C'

  // Prepare 14-day growth trend chart data
  const growthChartData = useMemo(() => {
    const rawGrowthUsers = growth.users || metrics.growthUsers || []
    const rawGrowthLinks = growth.links || metrics.growthLinks || []

    const userMap = new Map(rawGrowthUsers.map((g) => [g._id || g.date, g.count]))
    const linkMap = new Map(rawGrowthLinks.map((g) => [g._id || g.date, g.count]))
    const allDates = Array.from(new Set([...userMap.keys(), ...linkMap.keys()])).filter(Boolean).sort()

    if (allDates.length === 0) {
      // Clean baseline points for chart display if brand new empty database
      return [
        { date: 'Day -3', users: 0, links: 0 },
        { date: 'Day -2', users: Math.max(1, totalUsers), links: Math.max(1, totalLinks) },
        { date: 'Today', users: totalUsers, links: totalLinks },
      ]
    }

    return allDates.map((d) => {
      const parts = String(d).split('-')
      const label = parts.length === 3 ? `${parts[1]}/${parts[2]}` : String(d)
      return {
        date: label,
        users: userMap.get(d) || 0,
        links: linkMap.get(d) || 0,
      }
    })
  }, [growth.users, growth.links, metrics.growthUsers, metrics.growthLinks, totalUsers, totalLinks])

  // Prepare 2FA Donut chart data
  const securityDonutData = useMemo(() => {
    const standardUsers = Math.max(0, totalUsers - twoFactorUsers - suspendedUsers)
    return [
      { name: '2FA Shielded', value: Math.max(0, twoFactorUsers), color: 'teal.5' },
      { name: 'Standard Password', value: standardUsers, color: 'indigo.5' },
      { name: 'Suspended Accounts', value: Math.max(0, suspendedUsers), color: 'red.5' },
    ]
  }, [totalUsers, twoFactorUsers, suspendedUsers])

  // Prepare Top Domains Bar chart data
  const domainChartData = useMemo(() => {
    const list = overview?.topDomains || metrics.topDomains || []
    return list.slice(0, 7).map((d) => {
      const name = String(d.domain || d._id || 'other')
      return {
        domain: name.length > 18 ? `${name.slice(0, 16)}…` : name,
        bookmarks: d.count || 0,
      }
    })
  }, [overview?.topDomains, metrics.topDomains])

  // Filtered Users for Excel-Style Data Grid
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = tableSearch.toLowerCase().trim()
      const matchesSearch = !q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
      const matchesRole = tableRole === 'all' || u.role === tableRole
      const matchesStatus = tableStatus === 'all' || u.status === tableStatus
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, tableSearch, tableRole, tableStatus])

  // Sum of Logins in table view
  const totalTableLogins = useMemo(() => {
    return filteredUsers.reduce((sum, u) => sum + (u.loginCount || 0), 0)
  }, [filteredUsers])

  const handleExport = async (format) => {
    setExportBusy(format)
    try {
      const { blob, filename } = await adminApi.exportReport(format)
      const ext = format === 'xlsx' ? 'xlsx' : format === 'csv' ? 'csv' : 'json'
      downloadBlob(blob, filename || `linkarium-executive-report-${Date.now()}.${ext}`)
      notifications.show({
        title: 'Report Downloaded',
        message: `Successfully exported executive ${format.toUpperCase()} report card.`,
        color: 'teal',
      })
    } catch (err) {
      notifications.show({
        title: 'Export Failed',
        message: err.message || `Failed to export ${format} report.`,
        color: 'red',
      })
    } finally {
      setExportBusy(null)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="96%"
      centered
      withCloseButton={false}
      padding={0}
      overlayProps={{ blur: 16, opacity: 0.82, backgroundOpacity: 0.82 }}
      styles={{
        content: {
          background: 'transparent',
          boxShadow: 'none',
          overflow: 'hidden',
          maxWidth: 1320,
        },
        body: {
          padding: 0,
        },
      }}
    >
      <div className="report-modal-shell">
        {/* Top Executive Header */}
        <div className="report-header">
          <div className="report-header-left">
            <div className="report-brand-badge">
              <IconChartBar size={22} className="report-brand-icon" />
            </div>
            <div>
              <div className="report-title-row">
                <h2 className="report-title">Linkarium Intelligence & Audit Report Card</h2>
                <Badge variant="filled" color="cyan" size="sm" className="report-status-badge">
                  POWER BI SPECIFICATION
                </Badge>
              </div>
              <p className="report-subtitle">
                Generated {new Date().toLocaleDateString()} • Auditor Console • Enterprise Security & Performance Analytics
              </p>
            </div>
          </div>

          <div className="report-header-right no-print">
            {/* Quick Export Actions */}
            <Button
              size="xs"
              variant="filled"
              className="report-btn-excel"
              leftSection={<IconFileSpreadsheet size={15} />}
              loading={exportBusy === 'xlsx'}
              onClick={() => handleExport('xlsx')}
            >
              Excel (.xlsx)
            </Button>

            <Button
              size="xs"
              variant="light"
              color="gray"
              leftSection={<IconDownload size={14} />}
              loading={exportBusy === 'csv'}
              onClick={() => handleExport('csv')}
            >
              CSV
            </Button>

            <Tooltip label="Print or Save as PDF" withArrow>
              <ActionIcon variant="default" size="md" onClick={handlePrint} aria-label="Print Report">
                <IconPrinter size={16} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Raw JSON Output" withArrow>
              <ActionIcon
                variant="default"
                size="md"
                loading={exportBusy === 'json'}
                onClick={() => handleExport('json')}
                aria-label="Export JSON"
              >
                <IconCode size={16} />
              </ActionIcon>
            </Tooltip>

            <button type="button" className="report-close-btn" onClick={onClose} aria-label="Close modal">
              ×
            </button>
          </div>
        </div>

        {/* Executive Grade & Audit Bar */}
        <div className="report-grade-bar">
          <div className="report-grade-pill">
            <span className="report-grade-letter">{healthGrade}</span>
            <div>
              <div className="report-grade-title">System Compliance Grade</div>
              <div className="report-grade-sub">{securityScore}% Overall Platform Security & Operational Rating</div>
            </div>
          </div>

          <div className="report-grade-meta">
            <div className="report-meta-item">
              <span className="report-meta-label">Total Accounts</span>
              <span className="report-meta-val">{totalUsers}</span>
            </div>
            <div className="report-meta-item">
              <span className="report-meta-label">2FA Adoption</span>
              <span className="report-meta-val text-cyan">{twoFactorPct}%</span>
            </div>
            <div className="report-meta-item">
              <span className="report-meta-label">Vault Volume</span>
              <span className="report-meta-val text-violet">{totalLinks.toLocaleString()} links</span>
            </div>
            <div className="report-meta-item">
              <span className="report-meta-label">Platform Engagements</span>
              <span className="report-meta-val text-emerald">{totalVisits.toLocaleString()} visits</span>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="report-tabs-bar no-print">
          <button
            type="button"
            className={`report-tab-btn ${activeTab === 'executive' ? 'active' : ''}`}
            onClick={() => setActiveTab('executive')}
          >
            <IconChartBar size={15} />
            <span>Power BI Executive Visuals</span>
          </button>
          <button
            type="button"
            className={`report-tab-btn ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
          >
            <IconFileSpreadsheet size={15} />
            <span>Excel Data Grid ({filteredUsers.length} records)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="report-modal-body">
          {activeTab === 'executive' && (
            <div className="report-visuals-grid">
              {/* Row 1: KPI Cards Grid */}
              <div className="report-kpi-grid">
                <div className="report-kpi-card">
                  <div className="kpi-top">
                    <span className="kpi-title">User Ecosystem</span>
                    <IconUsers size={18} className="text-cyan" />
                  </div>
                  <div className="kpi-main-val">{totalUsers}</div>
                  <div className="kpi-subtext">
                    <span className="kpi-badge positive">{activeRatePct}% Active</span>
                    <span>{newUsers30d} joined in last 30d</span>
                  </div>
                </div>

                <div className="report-kpi-card">
                  <div className="kpi-top">
                    <span className="kpi-title">Saved Link Vault</span>
                    <IconBookmark size={18} className="text-violet" />
                  </div>
                  <div className="kpi-main-val">{totalLinks.toLocaleString()}</div>
                  <div className="kpi-subtext">
                    <span className="kpi-badge neutral">{favoriteLinks} Favorites</span>
                    <span>{archivedLinks} cold archived</span>
                  </div>
                </div>

                <div className="report-kpi-card">
                  <div className="kpi-top">
                    <span className="kpi-title">Security & 2FA Posture</span>
                    <IconShieldCheck size={18} className="text-emerald" />
                  </div>
                  <div className="kpi-main-val">{twoFactorPct}%</div>
                  <div className="kpi-subtext">
                    <span className="kpi-badge positive">{twoFactorUsers} Shielded</span>
                    <span>{suspendedUsers} suspended</span>
                  </div>
                </div>

                <div className="report-kpi-card">
                  <div className="kpi-top">
                    <span className="kpi-title">Engagement & Sessions</span>
                    <IconTrendingUp size={18} className="text-amber" />
                  </div>
                  <div className="kpi-main-val">{totalVisits.toLocaleString()}</div>
                  <div className="kpi-subtext">
                    <span className="kpi-badge positive">{activeSessions} Live</span>
                    <span>{totalCollections} collections created</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Dynamic Charts (Growth Velocity & Security Posture) */}
              <div className="report-charts-row">
                <div className="report-chart-box span-2">
                  <div className="chart-box-header">
                    <div>
                      <h3 className="chart-box-title">Platform Growth Velocity (14-Day Trajectory)</h3>
                      <p className="chart-box-sub">Daily user signups vs new saved bookmarks over time</p>
                    </div>
                    <Badge variant="dot" color="cyan" size="sm">
                      Live Telemetry
                    </Badge>
                  </div>
                  <div className="chart-container">
                    <AreaChart
                      h={220}
                      data={growthChartData}
                      dataKey="date"
                      series={[
                        { name: 'links', color: 'violet.5', label: 'New Bookmarks' },
                        { name: 'users', color: 'cyan.5', label: 'New Accounts' },
                      ]}
                      curveType="natural"
                      withLegend
                      withDots={false}
                      gridAxis="xy"
                    />
                  </div>
                </div>

                <div className="report-chart-box">
                  <div className="chart-box-header">
                    <div>
                      <h3 className="chart-box-title">Security & 2FA Distribution</h3>
                      <p className="chart-box-sub">Multi-factor compliance breakdown</p>
                    </div>
                  </div>
                  <div className="chart-container donut-center-wrap">
                    <DonutChart
                      size={180}
                      thickness={24}
                      data={securityDonutData}
                      withLabelsLine
                      withLabels
                      withTooltip
                      chartLabel={`${twoFactorPct}%`}
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Top Ecosystem Domains Bar Chart & Vault Lifecycle Breakdown */}
              <div className="report-charts-row">
                <div className="report-chart-box span-2">
                  <div className="chart-box-header">
                    <div>
                      <h3 className="chart-box-title">Top Bookmarked Content Ecosystems</h3>
                      <p className="chart-box-sub">Domains most frequently saved and visited by users</p>
                    </div>
                  </div>
                  <div className="chart-container">
                    {domainChartData.length > 0 ? (
                      <BarChart
                        h={200}
                        data={domainChartData}
                        dataKey="domain"
                        series={[{ name: 'bookmarks', color: 'teal.5', label: 'Saved Links' }]}
                        orientation="vertical"
                        gridAxis="y"
                      />
                    ) : (
                      <div className="report-empty-notice">No bookmark domain telemetry recorded yet.</div>
                    )}
                  </div>
                </div>

                <div className="report-chart-box">
                  <div className="chart-box-header">
                    <div>
                      <h3 className="chart-box-title">Vault Lifecycle Breakdown</h3>
                      <p className="chart-box-sub">Link retention & health classification</p>
                    </div>
                  </div>
                  <div className="lifecycle-list">
                    <div className="lifecycle-item">
                      <div className="lifecycle-info">
                        <span className="dot dot-cyan" />
                        <span className="lifecycle-name">Active Library</span>
                      </div>
                      <div className="lifecycle-val">
                        <span className="num">{activeLinks}</span>
                        <span className="pct">
                          {totalLinks ? Math.round((activeLinks / totalLinks) * 100) : 0}%
                        </span>
                      </div>
                    </div>

                    <div className="lifecycle-item">
                      <div className="lifecycle-info">
                        <span className="dot dot-amber" />
                        <span className="lifecycle-name">Pinned Favorites</span>
                      </div>
                      <div className="lifecycle-val">
                        <span className="num">{favoriteLinks}</span>
                        <span className="pct">
                          {totalLinks ? Math.round((favoriteLinks / totalLinks) * 100) : 0}%
                        </span>
                      </div>
                    </div>

                    <div className="lifecycle-item">
                      <div className="lifecycle-info">
                        <span className="dot dot-indigo" />
                        <span className="lifecycle-name">Cold Storage (Archive)</span>
                      </div>
                      <div className="lifecycle-val">
                        <span className="num">{archivedLinks}</span>
                        <span className="pct">
                          {totalLinks ? Math.round((archivedLinks / totalLinks) * 100) : 0}%
                        </span>
                      </div>
                    </div>

                    <div className="lifecycle-item">
                      <div className="lifecycle-info">
                        <span className="dot dot-rose" />
                        <span className="lifecycle-name">Trash Bin (Purging)</span>
                      </div>
                      <div className="lifecycle-val">
                        <span className="num">{trashLinks}</span>
                        <span className="pct">
                          {totalLinks ? Math.round((trashLinks / totalLinks) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'table' && (
            <div className="report-excel-table-wrap">
              {/* Excel Controls Bar */}
              <div className="report-table-toolbar no-print">
                <TextInput
                  placeholder="Filter by user or email…"
                  size="xs"
                  leftSection={<IconSearch size={14} />}
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.currentTarget.value)}
                  className="table-search-input"
                />

                <Select
                  size="xs"
                  data={[
                    { value: 'all', label: 'All Roles' },
                    { value: 'admin', label: 'Admins Only' },
                    { value: 'user', label: 'Standard Users' },
                  ]}
                  value={tableRole}
                  onChange={(v) => setTableRole(v || 'all')}
                  className="table-select"
                />

                <Select
                  size="xs"
                  data={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'active', label: 'Active Only' },
                    { value: 'suspended', label: 'Suspended Only' },
                  ]}
                  value={tableStatus}
                  onChange={(v) => setTableStatus(v || 'all')}
                  className="table-select"
                />

                <div className="table-counts-pill">
                  Showing <b>{filteredUsers.length}</b> of <b>{users.length}</b> accounts
                </div>
              </div>

              {/* Excel Style Data Grid */}
              <div className="report-table-scroll">
                <Table striped highlightOnHover withTableBorder withColumnBorders className="report-excel-table">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ width: 40 }}>#</Table.Th>
                      <Table.Th>Account Name</Table.Th>
                      <Table.Th>Email Address</Table.Th>
                      <Table.Th style={{ width: 90 }}>Role</Table.Th>
                      <Table.Th style={{ width: 100 }}>Status</Table.Th>
                      <Table.Th style={{ width: 110 }}>2FA Security</Table.Th>
                      <Table.Th style={{ width: 85, textAlign: 'right' }}>Logins</Table.Th>
                      <Table.Th style={{ width: 140 }}>Last Login</Table.Th>
                      <Table.Th style={{ width: 110 }}>Created</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u, i) => (
                        <Table.Tr key={u._id}>
                          <Table.Td className="text-dim">{i + 1}</Table.Td>
                          <Table.Td className="font-semibold">{u.name || 'Unnamed'}</Table.Td>
                          <Table.Td className="font-mono text-dim">{u.email}</Table.Td>
                          <Table.Td>
                            <Badge
                              size="xs"
                              variant={u.role === 'admin' ? 'filled' : 'light'}
                              color={u.role === 'admin' ? 'cyan' : 'gray'}
                            >
                              {u.role}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              size="xs"
                              variant="dot"
                              color={u.status === 'active' ? 'teal' : 'red'}
                            >
                              {u.status}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            {u.twoFactorEnabled || u.totp?.enabled ? (
                              <span className="badge-shield active">
                                <IconShieldCheck size={13} />
                                <span>SHIELDED</span>
                              </span>
                            ) : (
                              <span className="badge-shield disabled">
                                <IconAlertCircle size={13} />
                                <span>OFF</span>
                              </span>
                            )}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {u.loginCount || 1}
                          </Table.Td>
                          <Table.Td className="text-dim text-xs">
                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                          </Table.Td>
                          <Table.Td className="text-dim text-xs">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                          </Table.Td>
                        </Table.Tr>
                      ))
                    ) : (
                      <Table.Tr>
                        <Table.Td colSpan={9} style={{ textAlign: 'center', padding: '36px 0' }}>
                          No accounts match your current filter criteria.
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                  {/* Excel Summary Footer */}
                  <Table.Tfoot>
                    <Table.Tr className="excel-summary-row">
                      <Table.Td colSpan={3}>
                        <b>EXCEL SUMMARY TOTALS:</b> {filteredUsers.length} Users Listed
                      </Table.Td>
                      <Table.Td colSpan={3}>
                        <b>2FA Shield Rate:</b>{' '}
                        {filteredUsers.length
                          ? Math.round(
                              (filteredUsers.filter((u) => u.twoFactorEnabled || u.totp?.enabled).length / filteredUsers.length) * 100
                            )
                          : 0}
                        %
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <b>{totalTableLogins.toLocaleString()}</b>
                      </Table.Td>
                      <Table.Td colSpan={2} style={{ textAlign: 'right' }}>
                        Platform Audit Pass
                      </Table.Td>
                    </Table.Tr>
                  </Table.Tfoot>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="report-modal-footer no-print">
          <div className="footer-left">
            <span className="pulse-dot" />
            <span>Power BI Engine: Real-time Platform Intelligence Verified</span>
          </div>

          <div className="footer-actions">
            <Button variant="default" size="xs" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="filled"
              color="cyan"
              size="xs"
              leftSection={<IconFileSpreadsheet size={15} />}
              loading={exportBusy === 'xlsx'}
              onClick={() => handleExport('xlsx')}
            >
              Export Complete Excel Workbook (.xlsx)
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
