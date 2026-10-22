import { useEffect, useState } from 'react'
import { Loader } from '@mantine/core'
import { IconAlertTriangle, IconPhoto, IconSparkles } from '@tabler/icons-react'
import { enrichApi } from '../../api/endpoints'
import { hostOf } from '../../utils'
import './OgPreview.css'

// A live preview of the destination page.
//
// While the user types a URL the server fetches the page and returns its
// OpenGraph card: the real title, the real description and the preview image.
// The user can then take the title with one click instead of pasting it.
//
// The preview is best-effort. A page that blocks the request, times out or
// simply has no metadata shows a short note instead of an error dialog — the
// link can always be saved by hand.
export default function OgPreview({ url, onUseTitle, onUseDescription, onLoaded }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const value = String(url || '').trim()
    if (!/^https?:\/\//i.test(value)) {
      setData(null)
      setError(null)
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const timer = setTimeout(() => {
      enrichApi
        .preview(value)
        .then((res) => {
          if (cancelled) return
          if (res?.ok) {
            setData(res)
            setError(null)
            if (onLoaded && res.og) {
              onLoaded(res.og)
            }
          } else {
            setData(null)
            setError(res?.error || 'Could not read the page.')
          }
        })
        .catch((err) => {
          if (cancelled) return
          setData(null)
          setError(err.message || 'Could not read the page.')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 700)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [url])

  if (!/^https?:\/\//i.test(String(url || '').trim())) return null

  if (loading) {
    return (
      <div className="og-preview og-preview-loading">
        <Loader size={14} color="violet" />
        <span>Reading the page…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="og-preview og-preview-error">
        <IconAlertTriangle size={14} />
        <span>{error}</span>
      </div>
    )
  }

  if (!data?.og) return null

  const og = data.og
  const hasSomething = og.title || og.description || og.image

  if (!hasSomething) {
    return (
      <div className="og-preview og-preview-empty">
        <IconPhoto size={14} />
        <span>This page has no preview — you can still fill the fields in yourself.</span>
      </div>
    )
  }

  return (
    <div className="og-preview">
      {og.image && (
        <div className="og-preview-image">
          <img src={og.image} alt="" loading="lazy" />
        </div>
      )}

      <div className="og-preview-body">
        {og.siteName && <div className="og-preview-site">{og.siteName}</div>}

        {og.title && (
          <div className="og-preview-title-row">
            <div className="og-preview-title">{og.title}</div>
            {onUseTitle && (
              <button type="button" className="og-preview-use" onClick={() => onUseTitle(og.title)}>
                Use title
              </button>
            )}
          </div>
        )}

        {og.description && (
          <div className="og-preview-desc-row">
            <div className="og-preview-desc">{og.description}</div>
            {onUseDescription && (
              <button
                type="button"
                className="og-preview-use"
                onClick={() => onUseDescription(og.description)}
              >
                Use summary
              </button>
            )}
          </div>
        )}

        <div className="og-preview-foot">
          <IconSparkles size={12} />
          <span>{hostOf(data.finalUrl || url)}</span>
          {data.article?.wordCount > 0 && (
            <span className="og-preview-words">{data.article.wordCount} words readable</span>
          )}
        </div>
      </div>
    </div>
  )
}
