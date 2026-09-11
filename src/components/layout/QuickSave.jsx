import { useEffect, useRef, useState } from 'react'
import { Loader } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconAlertTriangle, IconArrowRight, IconCheck, IconLink, IconX } from '@tabler/icons-react'
import { metadataApi } from '../../api/endpoints'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import { faviconUrl, hostOf } from '../../utils'
import './QuickSave.css'

const isLikelyUrl = (value) => {
  const v = value.trim()
  if (!v) return false
  return /^https?:\/\//i.test(v) || /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(v)
}

export default function QuickSave() {
  const addLink = useLinkStore((s) => s.addLink)
  const openEditor = useUiStore((s) => s.openEditor)

  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [pop, setPop] = useState(null)
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k') return
      const el = document.activeElement
      const tag = el?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(timerRef.current)
    }
  }, [])

  const showFeedback = (p) => {
    setPop(p)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setPop(null), 5000)
  }

  const handleSubmit = async () => {
    const raw = value.trim()
    if (!raw || busy) return
    if (!isLikelyUrl(raw)) {
      showFeedback({ type: 'error', text: "That doesn't look like a valid URL." })
      return
    }
    setBusy(true)
    try {
      let title = hostOf(raw)
      try {
        const res = await metadataApi.suggest(raw)
        if (res?.name) title = res.name
      } catch {
        /* fall back to the hostname */
      }
      await addLink({ title, url: raw, favorite: false })
      notifications.show({ message: 'Link saved to your universe', color: 'green' })
      setValue('')
      setPop(null)
      inputRef.current?.focus()
    } catch (err) {
      if (err.status === 409 && err.data?.existing) {
        showFeedback({ type: 'dup', text: `Already saved — ${err.data.existing.title || 'this link'}`, existing: err.data.existing })
      } else {
        notifications.show({ message: err.message || 'Failed to save the link', color: 'red' })
      }
    } finally {
      setBusy(false)
    }
  }

  const trimmed = value.trim()
  const favicon = faviconUrl(trimmed)

  return (
    <div className="quick-save">
      <div className={`quick-save-box${pop?.type === 'error' ? ' qs-invalid' : ''}`}>
        {favicon ? (
          <img src={favicon} alt="" className="qs-favicon" />
        ) : (
          <IconLink size={16} className="qs-link-icon" />
        )}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.currentTarget.value)
            if (pop) setPop(null)
          }}
          placeholder="Paste a link to save it instantly…"
          aria-label="Quick save a link"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSubmit()
            } else if (e.key === 'Escape') {
              setPop(null)
            }
          }}
        />
        <button className="qs-go" onClick={handleSubmit} disabled={busy} aria-label="Save link" title="Save link">
          {busy ? <Loader size={15} color="#fff" /> : <IconArrowRight size={16} />}
        </button>
      </div>

      {pop && (
        <div className={`quick-save-pop qs-${pop.type}`} role="status">
          <span className="qs-pop-icon">
            {pop.type === 'dup' ? <IconCheck size={13} /> : <IconAlertTriangle size={13} />}
          </span>
          <div className="qs-pop-main">
            <span className="qs-pop-text">{pop.text}</span>
            {pop.existing && (
              <button className="qs-pop-view" onClick={() => openEditor(pop.existing)}>
                View
              </button>
            )}
          </div>
          <button className="qs-pop-close" onClick={() => setPop(null)} aria-label="Dismiss">
            <IconX size={13} />
          </button>
        </div>
      )}
    </div>
  )
}