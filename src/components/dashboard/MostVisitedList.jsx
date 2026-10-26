import { IconEye, IconTrophy, IconArrowUpRight } from '@tabler/icons-react'
import { useLinkStore } from '../../store/linkStore'
import { faviconUrl, hostOf, safeUrl } from '../../utils'
import { resolveCardColor } from '../../utils/colorUtils'
import { useColorMode } from '../../hooks/useColorMode'

export default function MostVisitedList({ links = [] }) {
  const recordVisit = useLinkStore((s) => s.recordVisit)
  const colorMode = useColorMode()

  if (!links.length) {
    return (
      <div className="dash-panel-body dash-panel-empty">
        <IconTrophy size={26} className="dash-panel-empty-icon" />
        <span>No visited links yet — open a link to start tracking metrics.</span>
      </div>
    )
  }

  const maxVisits = Math.max(...links.map((l) => l.visits || 0), 1)

  const openLink = (link) => {
    const target = safeUrl(link.url)
    if (!target) return
    window.open(target, '_blank', 'noopener,noreferrer')
    recordVisit(link)
  }

  const getRankClass = (idx) => {
    if (idx === 0) return 'rank-gold'
    if (idx === 1) return 'rank-silver'
    if (idx === 2) return 'rank-bronze'
    return 'rank-default'
  }

  return (
    <div className="dash-toplinks">
      {links.slice(0, 5).map((link, i) => {
        const favicon = faviconUrl(link.url)
        const host = hostOf(link.url) || 'link'
        const initial = (link.title || host || 'L')[0].toUpperCase()
        const visits = link.visits || 0
        const percentage = Math.min(Math.round((visits / maxVisits) * 100), 100)

        return (
          <div
            key={link._id || i}
            className="dash-toplink-card"
            role="button"
            tabIndex={0}
            onClick={() => openLink(link)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openLink(link)
              }
            }}
          >
            <span className={`dash-toplink-rank ${getRankClass(i)}`}>
              {i + 1 < 10 ? `0${i + 1}` : i + 1}
            </span>

            <div className="dash-toplink-icon-wrap">
              {favicon ? (
                <img
                  src={favicon}
                  alt=""
                  width={24}
                  height={24}
                  className="dash-toplink-favicon"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : null}
              <div
                className="dash-toplink-chip"
                style={{ background: resolveCardColor(link, null, colorMode) }}
              >
                {initial}
              </div>
            </div>

            <div className="dash-toplink-body">
              <div className="dash-toplink-title">{link.title || host}</div>
              <div className="dash-toplink-domain">{host}</div>
            </div>

            <div className="dash-toplink-stats">
              <span className="dash-toplink-badge">
                <IconEye size={12} />
                <span>{visits} {visits === 1 ? 'visit' : 'visits'}</span>
              </span>
              <div className="dash-toplink-meter">
                <span className="dash-toplink-fill" style={{ width: `${percentage}%` }} />
              </div>
            </div>

            <IconArrowUpRight size={15} className="dash-toplink-ext" />
          </div>
        )
      })}
    </div>
  )
}