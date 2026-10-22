import { useEffect, useState } from 'react'
import { Button, Loader, Text, Group } from '@mantine/core'
import { IconCopy, IconGitMerge, IconLink } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { linksApi } from '../../api/endpoints'
import { useLinkStore } from '../../store/linkStore'
import { hostOf, timeAgoShort } from '../../utils'
import './DuplicatesView.css'

// Two links that point at the same thing (or at least at the same article)
// are noise: the user only needs one of them.
//
// The duplicates are grouped so the user can decide which one to keep — the
// group view makes the choice obvious, unlike a flat list where the second
// copy is simply invisible.
export default function DuplicatesView() {
  const mergeLinks = useLinkStore((s) => s.mergeLinks)
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await linksApi.duplicates({ limit: 25 })
      setGroups(data?.groups || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleMerge = async (sourceId, targetId) => {
    setBusyId(sourceId)
    try {
      await mergeLinks(sourceId, targetId)
      notifications.show({ message: 'Links merged', color: 'green' })
      await load()
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="dup-view">
        <div className="dup-loading">
          <Loader size={20} color="violet" />
          <Text size="sm" c="dimmed">
            Looking for duplicates…
          </Text>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dup-view">
        <Text c="red" size="sm">
          {error}
        </Text>
      </div>
    )
  }

  if (!groups.length) {
    return (
      <div className="dup-view">
        <div className="dup-empty">
          <IconLink size={34} />
          <div className="dup-empty-title">No duplicates</div>
          <div className="dup-empty-subtitle">
            Every link in your library is unique.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dup-view">
      <div className="dup-intro">
        <Text size="sm" c="dimmed">
          These groups hold links that look like the same page. Merge one into the other to keep
          the tags, the summary and the visit count in one place.
        </Text>
      </div>

      {groups.map((group) => (
        <div key={`${group.reason}-${group.key}`} className="dup-group">
          <div className="dup-group-head">
            <span className="dup-group-reason">
              {group.reason === 'same-url' ? 'Same URL' : 'Same title & site'}
            </span>
            <span className="dup-group-count">{group.count} links</span>
          </div>

          {group.links.map((link, index) => (
            <div key={link._id} className="dup-row">
              <div className="dup-row-main">
                <div className="dup-row-title">{link.title || link.url}</div>
                <div className="dup-row-meta">
                  <span>{hostOf(link.url)}</span>
                  <span>·</span>
                  <span>{link.visits || 0} visits</span>
                  <span>·</span>
                  <span>{timeAgoShort(link.createdAt)}</span>
                </div>
                {Array.isArray(link.tags) && link.tags.length > 0 && (
                  <div className="dup-row-tags">
                    {link.tags.slice(0, 4).map((t) => (
                      <span key={t} className="dup-tag">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Group gap={6} wrap="nowrap">
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  component="a"
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  leftSection={<IconCopy size={13} />}
                >
                  Open
                </Button>
                {index > 0 && (
                  <Button
                    size="xs"
                    variant="light"
                    color="violet"
                    loading={busyId === link._id}
                    leftSection={<IconGitMerge size={13} />}
                    onClick={() => handleMerge(link._id, group.links[0]._id)}
                    title="Merge into the first link of this group"
                  >
                    Merge
                  </Button>
                )}
              </Group>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
