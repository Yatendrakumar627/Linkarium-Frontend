export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function faviconUrl(url) {
  try {
    const host = new URL(url).hostname
    return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`
  } catch {
    return null
  }
}

export function timeAgo(date) {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const units = [
    ['year', 31536000000],
    ['month', 2592000000],
    ['week', 604800000],
    ['day', 86400000],
    ['hr', 3600000],
    ['min', 60000],
  ]
  for (const [label, ms] of units) {
    const value = Math.floor(diff / ms)
    if (value >= 1) return value === 1 ? `1 ${label} ago` : `${value} ${label}s ago`
  }
  return 'just now'
}

export function timeAgoShort(date) {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  if (diff < 60000) return 'now'
  const units = [
    ['y', 31536000000],
    ['mo', 2592000000],
    ['w', 604800000],
    ['d', 86400000],
    ['h', 3600000],
    ['m', 60000],
  ]
  for (const [label, ms] of units) {
    const value = Math.floor(diff / ms)
    if (value >= 1) return `${value}${label}`
  }
  return 'now'
}

export function initialsOf(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function withQuery(base, params) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const s = qs.toString()
  return s ? `${base}?${s}` : base
}