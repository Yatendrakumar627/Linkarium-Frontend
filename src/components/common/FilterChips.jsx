import { IconX } from '@tabler/icons-react'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import { removeOperator } from '../../utils/searchQuery'
import './FilterChips.css'

// Renders the operators the server parsed out of the search query as
// removable chips. The server is the single source of truth for the grammar —
// the chip only carries the raw text that was parsed, so removing it is an
// exact string removal.
export default function FilterChips() {
  const parsed = useLinkStore((s) => s.parsed)
  const search = useUiStore((s) => s.search)
  const setSearch = useUiStore((s) => s.setSearch)

  const operators = parsed?.operators || []

  // The same raw text can produce several entries (one per parsed word) —
  // show every distinct filter only once.
  const chips = []
  const seen = new Set()
  for (const op of operators) {
    const key = op.raw || op.label
    if (!key || seen.has(key)) continue
    seen.add(key)
    chips.push(op)
  }

  if (!chips.length) return null

  return (
    <div className="filter-chips">
      {chips.map((op, index) => (
        <button
          key={`${op.key}-${index}`}
          type="button"
          className="filter-chip"
          title={`Remove ${op.label}`}
          onClick={() => setSearch(removeOperator(search, op.raw))}
        >
          <span className="filter-chip-label">{op.label}</span>
          <IconX size={12} className="filter-chip-x" />
        </button>
      ))}
      <button type="button" className="filter-chip-clear" onClick={() => setSearch('')}>
        Clear all
      </button>
    </div>
  )
}
