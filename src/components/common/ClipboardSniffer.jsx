import { useState, useEffect, useRef } from 'react'
import { IconClipboard, IconPlus, IconX, IconCheck } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import { metadataApi } from '../../api/endpoints'
import { hostOf } from '../../utils'
import './ClipboardSniffer.css'

function isLikelyUrl(text) {
  if (!text || typeof text !== 'string') return false
  const t = text.trim()
  if (t.length < 8 || t.length > 1000) return false
  return /^https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(t)
}

export default function ClipboardSniffer() {
  const [detectedUrl, setDetectedUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const links = useLinkStore((s) => s.links)
  const mapLinks = useLinkStore((s) => s.mapLinks)
  const addLink = useLinkStore((s) => s.addLink)
  const openEditor = useUiStore((s) => s.openEditor)

  // Track URLs already prompted or dismissed so we never annoy the user repeatedly
  const seenUrlsRef = useRef(new Set())

  useEffect(() => {
    const checkClipboard = async () => {
      if (typeof window === 'undefined' || !navigator.clipboard?.readText) return
      try {
        // Some browsers prompt or require explicit focus
        const text = await navigator.clipboard.readText()
        const trimmed = text?.trim()

        if (!isLikelyUrl(trimmed)) return
        if (seenUrlsRef.current.has(trimmed)) return

        // Check if already in user's saved links
        const allBookmarks = mapLinks.length > 0 ? mapLinks : links
        const alreadySaved = allBookmarks.some((l) => l.url?.trim() === trimmed)
        if (alreadySaved) return

        seenUrlsRef.current.add(trimmed)
        setDetectedUrl(trimmed)
        setSaved(false)
      } catch {
        // Permission denied or clipboard empty; fail silently
      }
    }

    // Check when user returns to tab
    const handleFocus = () => {
      checkClipboard()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [links, mapLinks])

  const handleQuickSave = async () => {
    if (!detectedUrl || saving) return
    setSaving(true)
    try {
      let title = hostOf(detectedUrl)
      try {
        const res = await metadataApi.suggest(detectedUrl)
        if (res?.name) title = res.name
      } catch {
        /* fallback to host */
      }

      await addLink({
        title,
        url: detectedUrl,
        favorite: false,
      })

      setSaved(true)
      notifications.show({
        message: `Saved ${title} to your universe`,
        color: 'teal',
      })

      setTimeout(() => {
        setDetectedUrl(null)
        setSaved(false)
      }, 2000)
    } catch (err) {
      // A duplicate is not an error — the link is already there. Say so
      // instead of showing a red "failed" notification.
      if (err.status === 409 && err.data?.existing) {
        setSaved(true)
        notifications.show({
          message: 'Already in your library',
          color: 'gray',
        })
        setTimeout(() => {
          setDetectedUrl(null)
          setSaved(false)
        }, 2000)
        return
      }

      notifications.show({
        message: err.message || 'Failed to save clipboard link',
        color: 'red',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEditAndSave = () => {
    if (!detectedUrl) return
    const url = detectedUrl
    setDetectedUrl(null)
    openEditor({
      url,
      title: hostOf(url),
    })
  }

  const dismiss = () => {
    setDetectedUrl(null)
  }

  if (!detectedUrl) return null

  const domain = hostOf(detectedUrl)

  return (
    <div className="clip-sniffer-toast" role="status" aria-live="polite">
      <div className="clip-sniffer-icon">
        <IconClipboard size={16} />
      </div>

      <div className="clip-sniffer-body">
        <div className="clip-sniffer-title">Clipboard URL detected</div>
        <div className="clip-sniffer-url" title={detectedUrl}>
          {domain}
        </div>
      </div>

      <div className="clip-sniffer-actions">
        {saved ? (
          <span className="clip-sniffer-saved">
            <IconCheck size={14} /> Saved
          </span>
        ) : (
          <>
            <button
              className="clip-btn-save"
              onClick={handleQuickSave}
              disabled={saving}
              title="Save directly"
            >
              <IconPlus size={13} />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
            <button
              className="clip-btn-edit"
              onClick={handleEditAndSave}
              title="Add details, tags or collection"
            >
              Details
            </button>
          </>
        )}

        <button className="clip-btn-close" onClick={dismiss} aria-label="Dismiss">
          <IconX size={14} />
        </button>
      </div>
    </div>
  )
}
