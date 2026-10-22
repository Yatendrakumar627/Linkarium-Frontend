import { useEffect, useState } from 'react'
import { Loader, Text, Badge, Group } from '@mantine/core'
import { IconLink, IconExternalLink } from '@tabler/icons-react'
import { shareApi } from '../../api/endpoints'
import { hostOf } from '../../utils'
import './SharePage.css'

// The public face of a shared collection.
//
// This page is deliberately plain: it works without an account, it shows
// nothing but the collection's links, and it never reveals the owner's
// identity, their other collections or their notes.
export default function SharePage({ slug }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    shareApi
      .public(slug)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'This share link does not exist.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="share-page">
        <div className="share-loading">
          <Loader size={22} color="violet" />
          <Text size="sm" c="dimmed">
            Loading the collection…
          </Text>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="share-page">
        <div className="share-empty">
          <IconLink size={32} />
          <div className="share-empty-title">This link does not work</div>
          <div className="share-empty-subtitle">{error}</div>
        </div>
      </div>
    )
  }

  const { collection, links } = data || {}

  return (
    <div className="share-page">
      <header className="share-header">
        <div className="share-brand">
          <span className="share-brand-mark">Linkarium</span>
          <span className="share-brand-sub">A shared collection</span>
        </div>
      </header>

      <main className="share-main">
        <h1 className="share-title">
          <span className="share-color-dot" style={{ background: collection?.color }} />
          {collection?.name}
        </h1>

        {collection?.expiresAt && (
          <Badge size="sm" variant="light" color="orange" mb="md">
            Expires {new Date(collection.expiresAt).toLocaleDateString()}
          </Badge>
        )}

        {!links?.length ? (
          <div className="share-empty">
            <IconLink size={32} />
            <div className="share-empty-title">Nothing here yet</div>
            <div className="share-empty-subtitle">This collection has no links.</div>
          </div>
        ) : (
          <div className="share-list">
            {links.map((link) => (
              <a
                key={link._id}
                className="share-card"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.image && (
                  <div className="share-card-cover">
                    <img src={link.image} alt="" loading="lazy" />
                  </div>
                )}
                <div className="share-card-body">
                  <div className="share-card-title">{link.title || link.url}</div>
                  {link.description && (
                    <div className="share-card-desc">{link.description}</div>
                  )}
                  <Group gap={8} mt={6}>
                    <span className="share-card-host">{hostOf(link.url)}</span>
                    {Array.isArray(link.tags) &&
                      link.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="share-tag">
                          #{tag}
                        </span>
                      ))}
                    <IconExternalLink size={13} className="share-card-open" />
                  </Group>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
