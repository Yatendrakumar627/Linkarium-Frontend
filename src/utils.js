import { tagToColor } from './utils/colorUtils.js'

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

export function faviconUrl(url, ogFavicon = null) {
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

/** Normalise any hex to the 6-digit lower-case form. */
export function normalizeHex(value) {
  if (typeof value !== 'string') return null
  const hex = value.trim().replace(/^#/, '')
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex
  return `#${full.toLowerCase()}`
}

/** Relative luminance of a hex colour, per WCAG 2.1. */
export function relativeLuminance(hex) {
  const h = normalizeHex(hex)
  if (!h) return 0
  const toLinear = (v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const r = toLinear(parseInt(h.slice(1, 3), 16))
  const g = toLinear(parseInt(h.slice(3, 5), 16))
  const b = toLinear(parseInt(h.slice(5, 7), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Contrast ratio between two hex colours. */
export function contrastRatio(a, b) {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const hi = Math.max(l1, l2)
  const lo = Math.min(l1, l2)
  return (hi + 0.05) / (lo + 0.05)
}

// Vivid cyans, violets and emerald all fall below AA against white, so a
// glyph sitting on a user-chosen swatch has to pick the ink that actually
// contrasts rather than guessing from brightness.
const INK_DARK = '#0b0b14'
const INK_LIGHT = '#ffffff'

/** The more legible of near-black or white for text drawn on `hex`. */
export function readableTextOn(hex) {
  return contrastRatio(hex, INK_DARK) >= contrastRatio(hex, INK_LIGHT) ? INK_DARK : INK_LIGHT
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

export function getTagColor(tag) {
  if (!tag || String(tag).toLowerCase() === 'untagged') return '#64748b'
  return tagToColor(tag)
}