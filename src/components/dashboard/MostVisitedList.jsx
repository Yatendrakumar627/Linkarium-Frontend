import { IconEye, IconTrophy } from '@tabler/icons-react'
import { useLinkStore } from '../../store/linkStore'
import { faviconUrl, hostOf } from '../../utils'

export default function MostVisitedList({ links = [] }) {
  const recordVisit = useLinkStore((s) => s.recordVisit)

  if (!links.length) {
    return (
      <div className="dash-panel-body dash-panel-empty">
        <IconTrophy size={22} className="dash-panel-empty-icon" />
        <span>No visited links yet — open a link to start tracking.</span>
      </div>
    )
  }

  const maxVisits = Math.max(...links.map((l) => l.visits || 0), 1)

  const openLink = (link) => {
    window.open(link.url, '_blank', 'noopener,noreferrer')
    recordVisit(link)
  }

  return (
    <div className="dash-toplinks">
      {links.map((link, i) => {
        const favicon = faviconUrl(link.url)
        const share = Math.round(((link.visits || 0) / maxVisits) * 100)
        return (
          <div key={link._id} className="dash-toplink">
            <div
              className="dash-toplink-row"
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
              <span className="dash-toplink-rank">{i + 1}</span>
              {favicon ? (
                <img src={favicon} alt="" width={26} height={26} className="dash-toplink-favicon" />
              ) : (
                <div className="dash-toplink-chip" style={{ background: link.color || '#8b5cf6' }}>
                  {(link.title || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="dash-toplink-body">
                <div className="dash-toplink-title">{link.title}</div>
                <div className="dash-toplink-domain">{hostOf(link.url)}</div>
              </div>
              <span className="dash-toplink-visits">
                <IconEye size={13} /> {link.visits || 0}
              </span>
            </div>
            <div className="dash-toplink-bar" aria-hidden="true">
              <span className="dash-toplink-bar-fill" style={{ width: `${share}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}