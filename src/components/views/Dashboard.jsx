import { useEffect, useState } from 'react'
import {
  IconBookmark,
  IconClock,
  IconFolder,
  IconLink,
  IconStar,
  IconTrash,
  IconTrendingUp,
  IconTrophy,
} from '@tabler/icons-react'
import { linksApi, analyticsApi } from '../../api/endpoints'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import StatCard from '../dashboard/StatCard'
import WelcomeBanner from '../dashboard/WelcomeBanner'
import MostVisitedList from '../dashboard/MostVisitedList'
import LinkGrid from '../links/LinkGrid'
import GradientAreaChart from '../common/GradientAreaChart'
import LoadingSkeletons from '../common/LoadingSkeletons'
import EmptyState from '../common/EmptyState'
import ErrorState from '../common/ErrorState'
import './Dashboard.css'

export default function Dashboard() {
  const summary = useLinkStore((s) => s.summary)
  const collections = useLinkStore((s) => s.collections)
  const tags = useLinkStore((s) => s.tags)
  const setView = useUiStore((s) => s.setView)
  const openEditor = useUiStore((s) => s.openEditor)

  const [state, setState] = useState({ status: 'loading', recent: [], topLinks: [], visits: null, error: '' })
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let mounted = true
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    ;(async () => {
      try {
        const [recentRes, topLinks, visits] = await Promise.all([
          linksApi.list({ sort: 'newest', limit: 8 }),
          analyticsApi.topLinks(),
          analyticsApi.visits(14, tz),
        ])
        if (mounted) setState({ status: 'ready', recent: recentRes.links, topLinks, visits, error: '' })
      } catch (err) {
        if (mounted) setState((s) => ({ ...s, status: 'error', error: err.message }))
      }
    })()
    return () => {
      mounted = false
    }
  }, [reload])

  const retry = () => {
    setState((s) => ({ ...s, status: 'loading', error: '' }))
    setReload((r) => r + 1)
  }

  const stats = [
    { label: 'Total Links', subtext: 'Vault archive', value: summary?.totalLinks ?? 0, icon: IconBookmark, tint: 'violet', go: () => setView({ type: 'all' }) },
    { label: 'Favorites', subtext: 'Hand-picked', value: summary?.favoriteLinks ?? 0, icon: IconStar, tint: 'amber', go: () => setView({ type: 'favorites' }) },
    { label: 'Total Visits', subtext: 'Engagements', value: summary?.totalVisits ?? 0, icon: IconTrendingUp, tint: 'cyan', go: () => setView({ type: 'analytics' }) },
    { label: 'Trash', subtext: 'Purges in 7d', value: summary?.trashCount ?? 0, icon: IconTrash, tint: 'indigo', go: () => setView({ type: 'trash' }) },
  ]

  const chartData = state.visits?.labels.map((day, i) => ({ day, visits: state.visits.values[i] })) || []
  const hasVisits = chartData.some((d) => d.visits > 0)

  return (
    <div className="fade-up dashboard-wrap">
      <WelcomeBanner recent={state.status === 'ready' ? state.recent : []} />

      <div className="dash-stats-grid">
        {stats.map((s) => (
          <StatCard
            key={s.label}
            icon={s.icon}
            label={s.label}
            subtext={s.subtext}
            value={s.value}
            tint={s.tint}
            loading={!summary}
            onClick={s.go}
          />
        ))}
      </div>

      {state.status === 'error' ? (
        <ErrorState message={state.error} onRetry={retry} />
      ) : (
        <div className="dash-panels">
          <div className="dash-panel">
            <div className="dash-panel-head">
              <div className="dash-panel-title-wrap">
                <div className="dash-panel-icon-wrap tint-cyan">
                  <IconTrendingUp size={17} />
                </div>
                <div>
                  <h3 className="dash-panel-title">Traffic & Engagement</h3>
                  <p className="dash-panel-subtitle">Visits recorded over the past 14 days</p>
                </div>
              </div>
              <span className="dash-panel-chip">14-Day Trend</span>
            </div>
            {state.status === 'loading' ? (
              <div className="dash-panel-body">
                <div className="dash-chart-skeleton" />
              </div>
            ) : hasVisits ? (
              <div className="dash-panel-body">
                <GradientAreaChart h={185} data={chartData} />
              </div>
            ) : (
              <div className="dash-panel-body dash-panel-empty">
                <IconTrendingUp size={24} className="dash-panel-empty-icon" />
                <span>No visits tracked yet — click links from your vault to generate telemetry.</span>
              </div>
            )}
          </div>

          <div className="dash-panel">
            <div className="dash-panel-head">
              <div className="dash-panel-title-wrap">
                <div className="dash-panel-icon-wrap tint-amber">
                  <IconTrophy size={17} />
                </div>
                <div>
                  <h3 className="dash-panel-title">Most Visited</h3>
                  <p className="dash-panel-subtitle">Your top frequented destinations</p>
                </div>
              </div>
              <button
                className="dash-panel-link-btn"
                onClick={() => setView({ type: 'analytics' })}
                title="View full analytics"
              >
                Analytics →
              </button>
            </div>
            <div className="dash-panel-body">
              <MostVisitedList links={state.status === 'ready' ? state.topLinks : []} />
            </div>
          </div>
        </div>
      )}

      <section className="dash-section">
        <div className="dash-section-head">
          <div className="dash-section-title">
            <IconClock size={17} className="dash-section-head-icon" />
            Recently added
          </div>
          <button className="dash-view-all" onClick={() => setView({ type: 'recentadded' })}>
            View all
          </button>
        </div>
        {state.status === 'loading' ? (
          <LoadingSkeletons count={4} />
        ) : state.recent.length === 0 ? (
          <EmptyState
            icon={<IconLink size={34} />}
            title="Nothing saved yet"
            subtitle="Save your first link and it will show up here."
          />
        ) : (
          <LinkGrid links={state.recent} />
        )}
      </section>

      {(collections.length > 0 || tags.length > 0) && (
        <section className="dash-section">
          <div className="dash-section-head">
            <div className="dash-section-title">Explore your universe</div>
          </div>
          {collections.length > 0 && (
            <div className="dash-chip-row">
              {collections.map((c) => (
                <button
                  key={c.id}
                  className="dash-chip"
                  onClick={() => setView({ type: 'collection', id: c.id, label: c.name })}
                >
                  <span className="dash-chip-dot" style={{ background: c.color || '#8b5cf6' }} />
                  <span className="dash-chip-label">{c.name}</span>
                  <span className="dash-chip-count">{c.count}</span>
                </button>
              ))}
            </div>
          )}
          {tags.length > 0 && (
            <div className="dash-chip-row">
              {tags.map((t) => (
                <button
                  key={t.tag}
                  className="dash-chip"
                  onClick={() => setView({ type: 'tag', id: t.tag, label: t.tag })}
                >
                  <IconFolder size={13} className="dash-chip-tag-icon" />
                  <span className="dash-chip-label">#{t.tag}</span>
                  <span className="dash-chip-count">{t.count}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {summary && summary.totalLinks === 0 && (
        <button className="dash-add-link" onClick={() => openEditor(null)}>
          <IconLink size={16} />
          Add your first link
        </button>
      )}
    </div>
  )
}