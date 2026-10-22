import { useEffect, useMemo, useState } from 'react'
import { Button, Loader, Text, Tabs } from '@mantine/core'
import { IconArchive, IconExternalLink, IconHeart, IconTrash } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { insightsApi } from '../../api/endpoints'
import { useLinkStore } from '../../store/linkStore'
import { hostOf, timeAgoShort } from '../../utils'
import './ResurfaceView.css'

// The buckets explain *why* a link is worth looking at again.
//
//   forgotten        — a favourite that has not been opened in months
//   unread           — saved a while ago and never opened at all
//   stale            — opened once, long ago, never since
const BUCKETS = [
  {
    id: 'forgotten',
    label: 'Forgotten favourites',
    reason: (link) => `Favourite — last opened ${timeAgoShort(link.lastVisitedAt || link.createdAt)}`,
  },
  {
    id: 'unread',
    label: 'Never opened',
    reason: (link) => `Saved ${timeAgoShort(link.createdAt)}, never opened`,
  },
  {
    id: 'stale',
    label: 'Not visited lately',
    reason: (link) => `Last opened ${timeAgoShort(link.lastVisitedAt)}`,
  },
]

export default function ResurfaceView({ bucket }) {
  const archiveLink = useLinkStore((s) => s.archiveLink)
  const removeLink = useLinkStore((s) => s.removeLink)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState(bucket || 'forgotten')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    insightsApi
      .resurface(24)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const links = useMemo(() => {
    if (!data) return []
    const groups = data.groups || {}
    if (tab === 'all') return data.links || []
    return groups[tab] || []
  }, [data, tab])

  const handleArchive = async (link) => {
    setBusyId(link._id)
    try {
      await archiveLink(link._id)
      setData((d) => ({
        ...d,
        groups: Object.fromEntries(
          Object.entries(d.groups || {}).map(([k, v]) => [k, v.filter((l) => l._id !== link._id)])
        ),
        links: (d.links || []).filter((l) => l._id !== link._id),
      }))
      notifications.show({ message: 'Archived', color: 'green' })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (link) => {
    setBusyId(link._id)
    try {
      await removeLink(link._id)
      setData((d) => ({
        ...d,
        groups: Object.fromEntries(
          Object.entries(d.groups || {}).map(([k, v]) => [k, v.filter((l) => l._id !== link._id)])
        ),
        links: (d.links || []).filter((l) => l._id !== link._id),
      }))
      notifications.show({ message: 'Moved to trash', color: 'green' })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="resurface-view">
        <div className="resurface-loading">
          <Loader size={20} color="violet" />
          <Text size="sm" c="dimmed">
            Looking through your library…
          </Text>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="resurface-view">
        <Text c="red" size="sm">
          {error}
        </Text>
      </div>
    )
  }

  const reasonFor = (link) => {
    const bucketMeta = BUCKETS.find((b) => b.id === tab)
    return bucketMeta && bucketMeta.reason(link)
  }

  return (
    <div className="resurface-view">
      <Tabs value={tab} onChange={(v) => v && setTab(v)} className="resurface-tabs">
        <Tabs.List>
          {BUCKETS.map((b) => (
            <Tabs.Tab key={b.id} value={b.id}>
              {b.label}
              <span className="resurface-tab-count">
                {(data?.groups?.[b.id] || []).length}
              </span>
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      {!links.length ? (
        <div className="resurface-empty">
          <IconHeart size={32} />
          <div className="resurface-empty-title">Nothing here</div>
          <div className="resurface-empty-subtitle">
            You have read everything worth reading.
          </div>
        </div>
      ) : (
        <div className="resurface-list">
          {links.map((link) => (
            <div key={link._id} className="resurface-row">
              <div className="resurface-row-main">
                <div className="resurface-row-title">{link.title || link.url}</div>
                <div className="resurface-row-meta">
                  <span>{hostOf(link.url)}</span>
                  <span>·</span>
                  <span className="resurface-reason">{reasonFor(link)}</span>
                </div>
              </div>
              <div className="resurface-row-actions">
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  component="a"
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  leftSection={<IconExternalLink size={13} />}
                >
                  Open
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  loading={busyId === link._id}
                  leftSection={<IconArchive size={13} />}
                  onClick={() => handleArchive(link)}
                >
                  Archive
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  loading={busyId === link._id}
                  leftSection={<IconTrash size={13} />}
                  onClick={() => handleDelete(link)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
