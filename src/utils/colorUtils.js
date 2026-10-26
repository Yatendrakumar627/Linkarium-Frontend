// ─────────────────────────────────────────────────────────────────────
// colorUtils.js — Central color derivation system for Linkarium.
// All functions are pure: identical inputs always yield identical outputs.
// Supports 5 User-Configurable Color Classification Modes:
//   1. 'tag'        - Tag-wise: cards unified by topic tag (and active tag view)
//   2. 'collection' - Collection-wise: cards unified by collection color
//   3. 'blend'      - Harmonic blend: shortest-arc HSL blend (collection + tag + independent link color)
//   4. 'brand'      - Brand-wise: authentic domain & brand color intelligence
//   5. 'own'        - Independent: card keeps its individually assigned link color
// ─────────────────────────────────────────────────────────────────────

export const COLOR_MODES = [
  {
    id: 'tag',
    label: 'Tag-Wise',
    shortDesc: 'Unified by topic tag',
    description: 'All cards sharing a tag receive the exact same color. In tag view, every card on screen matches that tag.',
  },
  {
    id: 'collection',
    label: 'Collection-Wise',
    shortDesc: 'Unified by collection',
    description: 'All cards in a collection share the collection’s accent color (e.g. all cards in "My websites" glow red).',
  },
  {
    id: 'blend',
    label: 'Harmonic Blend',
    shortDesc: 'Tag + Collection + Link blend',
    description: 'Synthesizes collection, primary tag, and independent link colors into a unified harmonic HSL tone.',
  },
  {
    id: 'brand',
    label: 'Brand-Wise',
    shortDesc: 'Domain & brand identity',
    description: 'Cards take the authentic brand color of their website (YouTube, GitHub, Netlify, Vercel, etc.).',
  },
  {
    id: 'own',
    label: 'Independent',
    shortDesc: 'Card’s own custom color',
    description: 'Each card displays its individually assigned link color.',
  },
]

export const LUXURY_PALETTE = [
  '#00d68f', // 01 Balanced Electric Mint (Kie Ai)
  '#00c4e8', // 02 Laser Cyan (GitLab)
  '#f43f7d', // 03 Electric Rose Pink (YouTube)
  '#f59e0b', // 04 Luxury Golden Amber (Skill Course)
  '#a855f7', // 05 Cyber Violet
  '#38bdf8', // 06 Vivid Sky Blue
]

// Recognized authentic brand and hosting platform colors
export const BRAND_COLORS = {
  'github.com': '#58a6ff',
  'gitlab.com': '#fc6d26',
  'youtube.com': '#f43f7d',
  'youtu.be': '#f43f7d',
  'netlify.app': '#00c7b7',
  'netlify.com': '#00c7b7',
  'vercel.app': '#38bdf8',
  'vercel.com': '#38bdf8',
  'twitter.com': '#1da1f2',
  'x.com': '#1da1f2',
  'linkedin.com': '#0a66c2',
  'figma.com': '#f24e1e',
  'reddit.com': '#ff4500',
  'spotify.com': '#1db954',
  'discord.com': '#5865f2',
  'discord.gg': '#5865f2',
  'google.com': '#4285f4',
  'docs.google.com': '#4285f4',
  'medium.com': '#00ab6c',
  'stackoverflow.com': '#f48024',
  'dribbble.com': '#ea4c89',
  'behance.net': '#0057ff',
}

// ─── Primitive HSL Conversion ────────────────────────────────────────

/**
 * Converts a 3-digit or 6-digit hex string into an { h, s, l } object.
 * Returns null if the hex string is invalid.
 * @param {string} hex
 * @returns {{ h: number, s: number, l: number } | null}
 */
export function hexToHsl(hex) {
  if (!hex || typeof hex !== 'string') return null
  let c = hex.trim().replace(/^#/, '')
  if (c.length === 3) c = c.split('').map((x) => x + x).join('')
  if (!/^[0-9a-f]{6}$/i.test(c)) return null

  const num = parseInt(c, 16)
  const r = (num >> 16) / 255
  const g = ((num >> 8) & 255) / 255
  const b = (num & 255) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h = Math.round(h * 60)
  }

  return {
    h: ((h % 360) + 360) % 360,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

// ─── Perceptual Normalization ────────────────────────────────────────

/**
 * Calibrates lightness (L) and saturation (S) per hue bracket.
 * Accounts for Helmholtz-Kohlrausch effect and human vision sensitivity
 * (e.g., yellow/lime is perceived ~3.5x brighter than blue/violet).
 * @param {number} h - Hue in degrees (0 - 360)
 * @returns {{ s: number, l: number }}
 */
export function calibrateHueBracket(h) {
  const normH = ((Math.round(h) % 360) + 360) % 360
  if (normH >= 35 && normH <= 85) {
    // Yellow / Lime: lower lightness to warm amber so it doesn't blow out
    return { s: 82, l: 46 }
  }
  if (normH > 85 && normH <= 150) {
    // Green / Mint: slightly below neutral
    return { s: 84, l: 48 }
  }
  if (normH >= 210 && normH <= 280) {
    // Blue / Violet: raise lightness to balance visual weight against warm hues
    return { s: 88, l: 54 }
  }
  // Cyan, Red, Pink, Magenta: baseline balance
  return { s: 86, l: 50 }
}

/**
 * Normalizes any hex or color string to a perceptually calibrated HSL string.
 * Leaves non-hex strings untouched so CSS keywords or existing hsl strings pass through.
 * @param {string} color
 * @returns {string} CSS hsl() string
 */
export function normalizeHsl(color) {
  if (!color || typeof color !== 'string') return null
  const trimmed = color.trim()
  if (!trimmed.startsWith('#')) return trimmed
  const hsl = hexToHsl(trimmed)
  if (!hsl) return trimmed
  const { s, l } = calibrateHueBracket(hsl.h)
  return `hsl(${hsl.h}, ${s}%, ${l}%)`
}

// In-memory registry for user-customized tag colors
let customTagColorMap = {}

/**
 * Registers user-configured tag colors { [tagName]: '#hex' }
 * so tagToColor and tagToHue automatically reflect custom colors everywhere.
 * @param {Record<string, string>} colors
 */
export function setCustomTagColors(colors) {
  customTagColorMap = colors && typeof colors === 'object' ? { ...colors } : {}
}

/**
 * Sets or removes a custom color for a single tag in memory.
 * @param {string} tagName
 * @param {string | null} color
 */
export function setCustomTagColor(tagName, color) {
  if (!tagName) return
  const key = String(tagName).toLowerCase().trim().replace(/^#/, '')
  if (color && typeof color === 'string' && color.trim()) {
    customTagColorMap[key] = color.trim()
  } else {
    delete customTagColorMap[key]
  }
}

/**
 * Looks up custom user color for a tag if configured.
 * @param {string} tagName
 * @returns {string | null}
 */
export function getCustomTagColor(tagName) {
  if (!tagName) return null
  const key = String(tagName).toLowerCase().trim().replace(/^#/, '')
  return customTagColorMap[key] || null
}

/**
 * Deterministic FNV-1a 32-bit hash of tag name string into a hue (0 - 359).
 * If a custom color is configured for this tag, its own custom hue is returned.
 * @param {string} tagName
 * @param {string | null} explicitColor
 * @returns {number} Hue angle (0 - 359)
 */
export function tagToHue(tagName, explicitColor = null) {
  const custom = explicitColor || getCustomTagColor(tagName)
  if (custom && typeof custom === 'string' && custom.trim()) {
    const hsl = hexToHsl(custom)
    if (hsl) return hsl.h
  }
  if (!tagName || typeof tagName !== 'string') return 210 // Stable fallback hue
  let hash = 2166136261 // FNV-1a 32-bit offset basis
  const s = String(tagName).toLowerCase().trim()
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i)
    hash = Math.imul(hash, 16777619) // FNV 32-bit prime
    hash >>>= 0 // Unsigned 32-bit integer
  }
  return hash % 360
}

/**
 * Generates an HSL color string for a tag. Respects custom user color if configured,
 * otherwise deterministically derives a perceptually balanced color via FNV-1a.
 * @param {string} tagName
 * @param {string | null} explicitColor
 * @returns {string} CSS hsl() string
 */
export function tagToColor(tagName, explicitColor = null) {
  const custom = explicitColor || getCustomTagColor(tagName)
  if (custom && typeof custom === 'string' && custom.trim()) {
    return normalizeHsl(custom) || custom
  }
  const h = tagToHue(tagName)
  const { s, l } = calibrateHueBracket(h)
  return `hsl(${h}, ${s}%, ${l}%)`
}

// ─── Shortest-Arc Hue Blending ───────────────────────────────────────

/**
 * Blends two hues along the circular shortest arc on the 360° color wheel.
 * Avoids the wrap-around bug where blending 10° and 350° would naively yield 180° (cyan)
 * instead of 0° (pure red).
 * @param {number} h1 - First hue in degrees
 * @param {number} h2 - Second hue in degrees
 * @param {number} weight - Weight towards h2 (0.0 to 1.0, default 0.5)
 * @returns {number} Blended hue in degrees (0 - 359)
 */
export function blendHues(h1, h2, weight = 0.5) {
  let diff = (h2 - h1) % 360
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  const blended = (h1 + diff * weight + 360) % 360
  return Math.round(blended)
}

/**
 * Computes a blended card color combining collection color, primary tag, and link independent color.
 * Uses shortest-arc circular HSL interpolation with perceptual normalization.
 * @param {object} link
 * @param {object} collection
 * @returns {string | null}
 */
export function blendCardColor(link, collection) {
  const tags = Array.isArray(link?.tags) ? link.tags : []
  const firstTag = tags[0]
  const hasTag = Boolean(firstTag)
  const colColor = collection?.color
  const hasCollection = Boolean(colColor && typeof colColor === 'string' && colColor.trim())
  const linkColor = link?.color && typeof link.color === 'string' && link.color.trim() ? link.color : null

  let baseH = null

  if (hasTag && hasCollection) {
    const tagH = tagToHue(firstTag)
    const colHsl = hexToHsl(colColor)
    if (colHsl) {
      baseH = blendHues(colHsl.h, tagH, 0.5)
    }
  } else if (hasCollection) {
    const colHsl = hexToHsl(colColor)
    if (colHsl) baseH = colHsl.h
  } else if (hasTag) {
    baseH = tagToHue(firstTag)
  }

  // If link has an independent color, synthesize it into the blend with a gentle weight
  if (linkColor && baseH !== null) {
    const linkHsl = hexToHsl(linkColor)
    if (linkHsl) {
      baseH = blendHues(baseH, linkHsl.h, 0.25)
    }
  } else if (linkColor && baseH === null) {
    return normalizeHsl(linkColor) || linkColor
  }

  if (baseH !== null) {
    const { s, l } = calibrateHueBracket(baseH)
    return `hsl(${baseH}, ${s}%, ${l}%)`
  }

  return null
}

// ─── Brand & Domain Derivation ───────────────────────────────────────

/**
 * Derives authentic brand or domain color.
 * Matches well-known brands, Netlify, Vercel, YouTube, GitHub, etc.
 * Falls back to deterministic FNV-1a hash of the hostname.
 * @param {string} url
 * @param {string} title
 * @returns {string} CSS color string
 */
export function domainToColor(url, title = '') {
  const searchStr = `${title || ''} ${url || ''}`.toLowerCase()

  // 1. Check title/URL brand keywords
  if (searchStr.includes('kie.ai') || searchStr.includes('kie ')) return '#00d68f'
  if (searchStr.includes('gitlab')) return '#fc6d26'
  if (searchStr.includes('youtube') || searchStr.includes('youtu.be')) return '#f43f7d'
  if (searchStr.includes('skill') || searchStr.includes('course')) return '#f59e0b'

  if (!url) return '#00c4e8'

  let host = ''
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    host = u.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    host = String(url).toLowerCase().trim()
  }

  // 2. Check direct domain / root domain in BRAND_COLORS map
  for (const [domain, color] of Object.entries(BRAND_COLORS)) {
    if (host === domain || host.endsWith(`.${domain}`)) {
      return color
    }
  }

  // 3. Deterministic FNV-1a hash of hostname -> stable domain hue
  const h = tagToHue(host)
  const { s, l } = calibrateHueBracket(h)
  return `hsl(${h}, ${s}%, ${l}%)`
}

// ─── Mode-Aware Resolvers ────────────────────────────────────────────

/**
 * Resolves the color of an individual tag chip based on the current color mode.
 * - 'collection': hierarchically biased (±30°) towards collection hue
 * - 'blend': subtly harmonized (weight 0.3) with collection hue
 * - 'tag' | 'brand' | 'own': pure independent tag color
 * @param {string} tagName
 * @param {object | null} collection
 * @param {string} mode - 'tag' | 'collection' | 'blend' | 'brand' | 'own'
 * @returns {string} CSS hsl() string
 */
export function resolveTagColor(tagName, collection = null, mode = 'collection') {
  if (!tagName) return 'hsl(210, 88%, 54%)'

  const normalizedMode = mode === 'collection-first' ? 'collection' : mode === 'tag-first' ? 'tag' : mode
  const colColor = collection?.color
  const hasCol = Boolean(colColor && typeof colColor === 'string' && colColor.trim())

  if (normalizedMode === 'collection' && hasCol) {
    const colHsl = hexToHsl(colColor)
    if (colHsl) {
      const tagH = tagToHue(tagName)
      const offset = (tagH % 60) - 30 // -30° to +29°
      const finalH = ((colHsl.h + offset) + 360) % 360
      const { s, l } = calibrateHueBracket(finalH)
      return `hsl(${finalH}, ${s}%, ${l}%)`
    }
  }

  if (normalizedMode === 'blend' && hasCol) {
    const colHsl = hexToHsl(colColor)
    if (colHsl) {
      const tagH = tagToHue(tagName)
      const blendedH = blendHues(tagH, colHsl.h, 0.3)
      const { s, l } = calibrateHueBracket(blendedH)
      return `hsl(${blendedH}, ${s}%, ${l}%)`
    }
  }

  return tagToColor(tagName)
}

/**
 * Resolves the primary accent color for a link card based on the current color mode.
 * Supports active view context so that viewing a tag or collection unifies all cards on screen.
 *
 * @param {object} link
 * @param {object} collection
 * @param {string} mode - 'tag' | 'collection' | 'blend' | 'brand' | 'own'
 * @param {object | null} activeView - e.g. { type: 'tag', id: 'website' } or { type: 'collection', id: '...' }
 * @returns {string} CSS color string (hex or hsl)
 */
export function resolveCardColor(link, collection, mode = 'collection', activeView = null) {
  // Normalize backwards-compatible aliases
  const normalizedMode = mode === 'collection-first' ? 'collection' : mode === 'tag-first' ? 'tag' : (mode || 'collection')

  const tags = Array.isArray(link?.tags) ? link.tags : []
  const firstTag = tags[0]
  const linkColor = link?.color && typeof link.color === 'string' && link.color.trim() ? link.color : null
  const colColor = collection?.color && typeof collection.color === 'string' && collection.color.trim() ? collection.color : null

  switch (normalizedMode) {
    case 'tag': {
      // 1. If currently in a tag view (e.g. user clicked #website in sidebar), ALL cards in view get that tag's color!
      if (activeView?.type === 'tag' && activeView.id) {
        return tagToColor(activeView.id)
      }
      // 2. Otherwise card takes its primary tag color so all cards sharing that tag have the same color
      if (firstTag) {
        return tagToColor(firstTag)
      }
      if (colColor) {
        return normalizeHsl(colColor) || colColor
      }
      if (linkColor) {
        return normalizeHsl(linkColor) || linkColor
      }
      break
    }

    case 'collection': {
      // 1. If currently in a collection view, unify card colors to that collection
      if (activeView?.type === 'collection' && collection?.color) {
        return normalizeHsl(collection.color) || collection.color
      }
      // 2. Otherwise card takes its assigned collection color (all cards in "My websites" get red)
      if (colColor) {
        return normalizeHsl(colColor) || colColor
      }
      if (firstTag) {
        return tagToColor(firstTag)
      }
      if (linkColor) {
        return normalizeHsl(linkColor) || linkColor
      }
      break
    }

    case 'blend': {
      const blended = blendCardColor(link, collection)
      if (blended) return blended
      if (colColor) {
        return normalizeHsl(colColor) || colColor
      }
      if (linkColor) {
        return normalizeHsl(linkColor) || linkColor
      }
      break
    }

    case 'brand': {
      return domainToColor(link?.url, link?.title)
    }

    case 'own':
    default: {
      if (linkColor) {
        return normalizeHsl(linkColor) || linkColor
      }
      if (colColor) {
        return normalizeHsl(colColor) || colColor
      }
      if (firstTag) {
        return tagToColor(firstTag)
      }
      break
    }
  }

  // Fallback: deterministic FNV-1a hash of link ID/url into LUXURY_PALETTE
  const key = String(link?._id || link?.url || link?.title || 'link')
  const h = tagToHue(key)
  return LUXURY_PALETTE[h % LUXURY_PALETTE.length]
}
