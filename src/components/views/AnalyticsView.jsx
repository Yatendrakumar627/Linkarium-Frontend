import { useEffect, useState } from 'react'
import { AreaChart } from '@mantine/charts'
import { Text } from '@mantine/core'
import {
  IconLink,
  IconStar,
  IconEye,
  IconFolder,
  IconTrophy,
  IconTrendingUp,
} from '@tabler/icons-react'
import { analyticsApi } from '../../api/endpoints'
import { useLinkStore } from '../../store/linkStore'
import { faviconUrl, hostOf } from '../../utils'
import EmptyState from '../common/EmptyState'
import ErrorState from '../common/ErrorState'
import './AnalyticsView.css'

export default function AnalyticsView() {
  const recordVisit = useLinkStore((s) => s.recordVisit)
  const [summary, setSummary] = useState(null)
  const [topLinks, setTopLinks] = useState([])
  const [visits, setVisits] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let mounted = true
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    ;(async () => {
      try {
        const [s, t, v] = await Promise.all([
          analyticsApi.summary(),
          analyticsApi.topLinks(),
          analyticsApi.visits(14, tz),
        ])
        if (mounted) {
          setSummary(s)
          setTopLinks(t)
          setVisits(v)
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err.message)
          setLoading(false)
        }
      }
    })()
    return () => {
      mounted = false
    }
  }, [reload])

  const retry = () => {
    setLoading(true)
    setError('')
    setReload((r) => r + 1)
  }

  const stats = [
    { label: 'Total links', value: summary?.totalLinks ?? '—', icon: IconLink },
    { label: 'Favorites', value: summary?.favoriteLinks ?? '—', icon: IconStar },
    { label: 'Total visits', value: summary?.totalVisits ?? '—', icon: IconEye },
    { label: 'Collections', value: summary?.totalCollections ?? '—', icon: IconFolder },
  ]

  const chartData = visits?.labels.map((day, i) => ({ day, visits: visits.values[i] })) || []

  if (error) {
    return <ErrorState message={error} onRetry={retry} />
  }

  if (loading) {
    return (
      <div className="link-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-card analytics-skeleton" />
        ))}
      </div>
    )
  }

  return (
    <div className="fade-up analytics-wrap">
      {/* Stat cards */}
      <div className="analytics-stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="analytics-stat-head">
              <s.icon size={15} />
              <span className="stat-label">{s.label}</span>
            </div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Visits chart */}
      <div className="stat-card analytics-block">
        <div className="analytics-block-head">
          <IconTrendingUp size={18} color="var(--accent-1)" />
          <Text className="analytics-block-title">Visits last 14 days</Text>
        </div>
        {chartData.every((d) => d.visits === 0) ? (
          <EmptyState
            icon={<IconTrendingUp size={30} />}
            title="No visits tracked yet"
            subtitle="Open links from your cards — each visit is recorded here."
          />
        ) : (
          <AreaChart
            h={240}
            data={chartData}
            dataKey="day"
            type="gradient"
            series={[{ name: 'visits', color: 'violet.5' }]}
            curveType="natural"
            withDots={false}
            gradientStopsFrom="#8b5cf6"
            gradientStopsTo="#22d3ee"
            tickLine="none"
          />
        )}
      </div>

      {/* Top links */}
      <div className="stat-card analytics-block">
        <div className="analytics-block-head">
          <IconTrophy size={18} color="#f59e0b" />
          <Text className="analytics-block-title">Most visited</Text>
        </div>
        {topLinks.length === 0 ? (
          <Text c="dimmed" size="sm">No visited links yet.</Text>
        ) : (
          <div className="analytics-toplinks">
            {topLinks.map((link, i) => {
              const favicon = faviconUrl(link.url)
              return (
                <div
                  key={link._id}
                  className="nav-item"
                  onClick={() => {
                    window.open(link.url, '_blank', 'noopener,noreferrer')
                    recordVisit(link)
                  }}
                >
                  <span className="analytics-rank">
                    {i + 1}
                  </span>
                  {favicon ? (
                    <img src={favicon} alt="" width={26} height={26} className="analytics-link-ico" />
                  ) : (
                    <div className="link-favicon analytics-link-favicon" style={{ background: link.color }}>
                      {(link.title || '?')[0]}
                    </div>
                  )}
                  <div className="analytics-link-body">
                    <div className="analytics-link-title">{link.title}</div>
                    <div className="analytics-link-domain">{hostOf(link.url)}</div>
                  </div>
                  <span className="analytics-link-visits">
                    <IconEye size={13} /> {link.visits}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}