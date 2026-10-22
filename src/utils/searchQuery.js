// Helpers for the search query language on the client.
//
// The server owns the parser (server/utils/querylang.js) — the client only
// needs to add operators to a query and remove them again when a filter chip
// is dismissed.

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Remove an operator from the query. `raw` is the exact text the server
// parsed (e.g. "tag:ai"); a case-insensitive fallback handles queries the
// user retyped.
export function removeOperator(query, raw) {
  const value = String(query || '')
  const token = String(raw || '')
  if (!value || !token) return value.trim()

  const index = value.indexOf(token)
  if (index !== -1) {
    return (value.slice(0, index) + value.slice(index + token.length)).replace(/\s+/g, ' ').trim()
  }

  const rx = new RegExp(escapeRegex(token), 'i')
  return value.replace(rx, '').replace(/\s+/g, ' ').trim()
}

// Toggle an operator: present -> removed, absent -> appended.
export function toggleOperator(query, operator) {
  const value = String(query || '').trim()
  const op = String(operator || '').trim()
  if (!op) return value
  const rx = new RegExp(`(^|\\s)${escapeRegex(op)}(?=\\s|$)`, 'i')
  if (rx.test(value)) return removeOperator(value, op)
  return value ? `${value} ${op}` : op
}

// True when the query already contains the operator.
export function hasOperator(query, operator) {
  const value = String(query || '')
  const op = String(operator || '')
  if (!op) return false
  return new RegExp(`(^|\\s)${escapeRegex(op)}(?=\\s|$)`, 'i').test(value)
}

// Replace the word currently being typed with a suggestion.
export function replaceLastWord(query, suggestion) {
  const value = String(query || '').trim()
  const parts = value.split(/\s+/).filter(Boolean)
  parts.pop()
  parts.push(String(suggestion || '').trim())
  return parts.join(' ')
}
