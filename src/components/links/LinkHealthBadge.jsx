import { Tooltip, Loader } from '@mantine/core'
import { timeAgo } from '../../utils'

/**
 * Health badge states:
 * - healthy: Green dot + 'Healthy'
 * - broken: Red dot + 'Broken' with error details
 * - stale: Amber dot + 'Stale' (temporarily unavailable or unverified)
 * - checking: Amber spinner + 'Checking'
 * - unknown: Gray dot + 'Unknown' (health not checked)
 */
export default function LinkHealthBadge({
  status = 'unknown',
  checkedAt = null,
  httpStatus = null,
  error = null,
  checking = false,
  className = '',
  onClick = null,
}) {
  const effectiveStatus = checking ? 'checking' : (status || 'unknown')

  let label = 'Unknown'
  let tooltip = 'Health status: Unknown (not checked yet)'

  if (effectiveStatus === 'healthy') {
    label = 'Healthy'
    const details = ['Reachable']
    if (httpStatus) details.push(`HTTP ${httpStatus}`)
    if (checkedAt) details.push(`checked ${timeAgo(checkedAt)}`)
    tooltip = details.join(' · ')
  } else if (effectiveStatus === 'broken') {
    label = 'Broken'
    const details = ['Broken link']
    if (httpStatus) details.push(`HTTP ${httpStatus}`)
    if (error) details.push(error)
    if (checkedAt) details.push(`checked ${timeAgo(checkedAt)}`)
    tooltip = details.join(' · ')
  } else if (effectiveStatus === 'stale') {
    label = 'Stale'
    const details = ['Temporarily unavailable or unverified']
    if (httpStatus) details.push(`HTTP ${httpStatus}`)
    if (checkedAt) details.push(`checked ${timeAgo(checkedAt)}`)
    tooltip = details.join(' · ')
  } else if (effectiveStatus === 'checking') {
    label = 'Checking'
    tooltip = 'Health check in progress…'
  } else {
    label = 'Unknown'
    tooltip = checkedAt ? `Unknown · last checked ${timeAgo(checkedAt)}` : 'Health not checked'
  }

  if (onClick && !checking) {
    tooltip += ' · Click to re-check'
  }

  return (
    <Tooltip
      label={tooltip}
      withArrow
      position="top"
      openDelay={200}
      multiline
      maw={260}
      transitionProps={{ duration: 150 }}
    >
      <span
        className={`link-health-badge link-health-badge--${effectiveStatus} ${onClick ? 'is-clickable' : ''} ${className}`.trim()}
        aria-label={tooltip}
        role={onClick ? 'button' : 'status'}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick ? (e) => { e.stopPropagation(); onClick(e); } : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onClick(e); } } : undefined}
      >
        {effectiveStatus === 'checking' ? (
          <Loader size={8} color="yellow" type="dots" />
        ) : (
          <span className="link-health-dot" aria-hidden="true" />
        )}
        <span className="link-health-label">{label}</span>
      </span>
    </Tooltip>
  )
}

