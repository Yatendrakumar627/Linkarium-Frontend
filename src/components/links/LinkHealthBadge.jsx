import { timeAgo } from '../../utils'

// The four health states a link can be in.
//
//   healthy  — the page answered
//   stale    — the page answered, but not for a while
//   broken   — the page is gone
//   unknown  — never checked
const LABELS = {
  healthy: 'Healthy',
  stale: 'Stale',
  broken: 'Broken',
  unknown: 'Unknown',
}

/**
 * A small coloured dot that tells the user how the link is doing.
 *
 * The badge is deliberately quiet: it only appears once the link has actually
 * been checked, so a fresh library is not covered in grey dots.
 */
export default function LinkHealthBadge({ status, checkedAt, httpStatus, error, className = '' }) {
  if (!status || status === 'unknown') return null

  const label = LABELS[status] || status
  const parts = [label]
  if (httpStatus) parts.push(`HTTP ${httpStatus}`)
  if (checkedAt) parts.push(`checked ${timeAgo(checkedAt)}`)
  if (error && !httpStatus) parts.push(error)

  const title = parts.join(' · ')

  return (
    <span
      className={`link-health-badge link-health-badge--${status} ${className}`.trim()}
      title={title}
      aria-label={title}
      role="img"
    >
      <span className="link-health-dot" aria-hidden="true" />
      <span className="link-health-label">{label}</span>
    </span>
  )
}
