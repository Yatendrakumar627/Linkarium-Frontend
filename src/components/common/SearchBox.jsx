import { useEffect, useRef, useState } from 'react'
import { TextInput } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { IconSearch, IconX } from '@tabler/icons-react'
import { useUiStore } from '../../store/uiStore'
import { searchApi } from '../../api/endpoints'
import { replaceLastWord } from '../../utils/searchQuery'
import './SearchBox.css'

const MIN_SUGGEST_LENGTH = 2

export default function SearchBox({ placeholder = 'Search links, tags…' }) {
  const search = useUiStore((s) => s.search)
  const setSearch = useUiStore((s) => s.setSearch)

  const [debounced] = useDebouncedValue(search, 180)
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef(null)

  // Suggestions are fetched from the server (one parser, one source of truth)
  // and only for the word currently being typed.
  const term = debounced.trim()

  useEffect(() => {
    if (term.length < MIN_SUGGEST_LENGTH) return undefined

    let cancelled = false
    searchApi
      .suggest(term)
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data?.suggestions) ? data.suggestions : []
        setSuggestions(list)
        setActive(0)
        setOpen(list.length > 0)
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions([])
          setOpen(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [term])

  // Short queries have no suggestions — the effect above intentionally does not
  // update state for them, so the derived values are used instead.
  const visibleSuggestions = term.length < MIN_SUGGEST_LENGTH ? [] : suggestions
  const dropdownOpen = open && visibleSuggestions.length > 0

  // Close the dropdown when the user clicks outside of it.
  useEffect(() => {
    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const applySuggestion = (value) => {
    setSearch(replaceLastWord(search, value))
    setOpen(false)
  }

  const handleKeyDown = (event) => {
    if (!dropdownOpen || !visibleSuggestions.length) {
      if (event.key === 'Escape') setOpen(false)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => (i + 1) % visibleSuggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (i - 1 + visibleSuggestions.length) % visibleSuggestions.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      applySuggestion(visibleSuggestions[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="search-box" ref={wrapRef}>
      <TextInput
        className="search-input"
        placeholder={placeholder}
        leftSection={<IconSearch size={15} />}
        rightSection={
          search ? (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearch('')}
              title="Clear search"
              aria-label="Clear search"
            >
              <IconX size={14} />
            </button>
          ) : (
            <button
              type="button"
              className="search-kbd-btn"
              onClick={() => useUiStore.getState().openCommandPalette()}
              title="Open Command Palette (⌘K / Ctrl+K)"
              aria-label="Open Command Palette"
            >
              ⌘K
            </button>
          )
        }
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        onFocus={() => setOpen(visibleSuggestions.length > 0)}
        onKeyDown={handleKeyDown}
        aria-label="Search links"
        aria-autocomplete="list"
        aria-expanded={dropdownOpen}
      />

      {dropdownOpen && (
        <ul className="search-suggestions" role="listbox">
          {visibleSuggestions.map((item, index) => (
            <li key={item} role="option" aria-selected={index === active}>
              <button
                type="button"
                className={`search-suggestion${index === active ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => applySuggestion(item)}
              >
                <IconSearch size={13} className="search-suggestion-icon" />
                <span>{item}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
