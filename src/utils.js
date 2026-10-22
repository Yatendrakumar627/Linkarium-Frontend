export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function getYouTubeThumbnail(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    let videoId = null

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') {
        videoId = u.searchParams.get('v')
      } else if (u.pathname.startsWith('/shorts/') || u.pathname.startsWith('/embed/') || u.pathname.startsWith('/v/')) {
        videoId = u.pathname.split('/')[2]
      }
    } else if (host === 'youtu.be') {
      videoId = u.pathname.slice(1).split('/')[0]
    }

    if (videoId && /^[a-zA-Z0-9_-]{10,12}$/.test(videoId)) {
      // Returns the official high-resolution video thumbnail poster
      return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    }
    return null
  } catch {
    return null
  }
}

export function faviconUrl(url, ogFavicon = null, ogImage = null) {
  try {
    // 1. If it's a YouTube video link, use its actual video/song thumbnail poster as the icon
    const ytThumb = getYouTubeThumbnail(url)
    if (ytThumb) return ytThumb

    // 2. If the page declared its own real favicon (<link rel="icon"> or <link rel="apple-touch-icon">)
    if (ogFavicon && typeof ogFavicon === 'string' && ogFavicon.trim()) {
      return ogFavicon.trim()
    }

    const host = new URL(url).hostname

    // 3. Google's favicon service reliably converts and serves favicons from domains (including .svg & .ico)
    // with 128px resolution and minimal latency.
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`
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

export function safeUrl(url) {
  if (typeof url !== 'string') return null
  return /^https?:\/\//i.test(url.trim()) ? url.trim() : null
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'export.xlsx'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function withQuery(base, params) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const s = qs.toString()
  return s ? `${base}?${s}` : base
}

export function cleanUrl(url) {
  if (!url || typeof url !== 'string') return { cleaned: url || '', wasCleaned: false }
  try {
    const u = new URL(url.trim())
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
      'fbclid', 'gclid', 'gclsrc', 'dclid', 'zanpid', 'msclkid',
      'mc_cid', 'mc_eid', '_hsenc', '_hsmi', 'mkt_tok',
      'igshid', 'si', 'ref', 'ref_src', 'ref_url',
    ]
    let removed = false
    trackingParams.forEach((param) => {
      if (u.searchParams.has(param)) {
        u.searchParams.delete(param)
        removed = true
      }
    })
    const cleaned = u.toString().replace(/\/$/, '')
    return { cleaned, wasCleaned: removed }
  } catch {
    return { cleaned: url, wasCleaned: false }
  }
}

export function suggestTagsForUrl(url, title = '', existingTags = []) {
  const suggestions = new Set()
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes('github') || host.includes('gitlab')) suggestions.add('dev')
    if (host.includes('youtube') || host.includes('vimeo') || host.includes('netflix')) suggestions.add('video')
    if (host.includes('medium') || host.includes('substack') || host.includes('dev.to') || host.includes('hashnode')) suggestions.add('article')
    if (host.includes('figma') || host.includes('dribbble') || host.includes('behance')) suggestions.add('design')
    if (host.includes('stackoverflow') || host.includes('stackexchange')) suggestions.add('programming')
    if (host.includes('twitter') || host.includes('x.com') || host.includes('reddit')) suggestions.add('social')
    if (host.includes('docs.') || url.includes('/docs')) suggestions.add('docs')
    if (host.includes('news') || host.includes('nytimes') || host.includes('bloomberg')) suggestions.add('news')

    const t = (title || '').toLowerCase()
    if (t.includes('react')) suggestions.add('react')
    if (t.includes('vue')) suggestions.add('vue')
    if (t.includes('css') || t.includes('style') || t.includes('tailwind')) suggestions.add('css')
    if (t.includes('node') || t.includes('backend') || t.includes('api')) suggestions.add('backend')
    if (t.includes('ai') || t.includes('gpt') || t.includes('llm') || t.includes('machine learning')) suggestions.add('ai')
    if (t.includes('tool') || t.includes('utility')) suggestions.add('tools')

    const lowerExisting = (existingTags || []).map((t) => t.toLowerCase())
    return Array.from(suggestions).filter((s) => !lowerExisting.includes(s)).slice(0, 4)
  } catch {
    return []
  }
}

export const CELESTIAL_TAG_COLORS = [
  '#00e5ff', // Electric Cyan
  '#a855f7', // Velvet Amethyst / Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Hot Pink
  '#3b82f6', // Azure Blue
  '#06b6d4', // Teal Cyan
  '#f43f5e', // Rose Coral
  '#8b5cf6', // Violet
  '#eab308', // Radiant Gold
  '#6366f1', // Indigo
  '#14b8a6', // Persian Green
]

export function getTagColor(tag) {
  if (!tag || String(tag).toLowerCase() === 'untagged') return '#64748b'
  let hash = 0
  const str = String(tag).toLowerCase().replace(/^#/, '')
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return CELESTIAL_TAG_COLORS[Math.abs(hash) % CELESTIAL_TAG_COLORS.length]
}