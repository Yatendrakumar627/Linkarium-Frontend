import { useEffect, useState, useCallback } from 'react'
import { Button, Loader, Text, Group, Tooltip } from '@mantine/core'
import { IconCopy, IconGitMerge, IconLink, IconCheck } from '@tabler/icons-react'
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

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const data = await linksApi.duplicates({ limit: 50 })
      setGroups(data?.groups || [])
    } catch (err) {
      setError(err.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(false)
  }, [load])

  // Merge all other links in the group into this chosen target link
  const handleMergeInto = async (targetLink, group) => {
    const sources = (group.links || []).filter((l) => l._id !== targetLink._id)
    if (!sources.length) return

    setBusyId(targetLink._id)
    try {
      for (const src of sources) {
        await mergeLinks(src._id, targetLink._id)
      }
      notifications.show({
        message: 'Duplicate links merged successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      })

      // Optimistically remove merged items from this group
      setGroups((prev) =>
        prev
          .map((g) => {
            const isTargetGroup =
              g === group ||
              (g.links && g.links.some((l) => l._id === targetLink._id))
            if (isTargetGroup) {
              const remaining = (g.links || []).filter(
                (l) => l._id === targetLink._id
              )
              return remaining.length > 1
                ? { ...g, links: remaining, count: remaining.length }
                : null
            }
            return g
          })
          .filter(Boolean)
      )

      // Silent background sync
      await load(true)
    } catch (err) {
      notifications.show({
        message: err.message || 'Failed to merge links',
        color: 'red',
      })
      await load(true)
    } finally {
      setBusyId(null)
    }
  }

  // Safe unique key builder that handles objects or strings without collision
  const getGroupKey = (group, idx) => {
    const rawKey = group.key
    let keyStr = ''
    if (typeof rawKey === 'string') {
      keyStr = rawKey
    } else if (rawKey && typeof rawKey === 'object') {
      keyStr = `${rawKey.host || ''}::${rawKey.title || ''}`
    } else {
      keyStr = String(idx)
    }
    return `${group.reason || 'dup'}-${keyStr}-${idx}`
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
          These groups hold links that look like the same page. Choose which link to keep —
          tags, notes, and visit counts from the duplicate will be folded into it.
        </Text>
      </div>

      {groups.map((group, groupIdx) => (
        <div key={getGroupKey(group, groupIdx)} className="dup-group">
          <div className="dup-group-head">
            <span className="dup-group-reason">
              {group.reason === 'same-url' ? 'Same URL' : 'Same title & site'}
            </span>
            <span className="dup-group-count">{group.count} links</span>
          </div>

          {group.links.map((link) => (
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
                <Tooltip
                  label="Keep this link and merge duplicates into it"
                  withArrow
                  position="top"
                >
                  <Button
                    size="xs"
                    variant="light"
                    color="violet"
                    loading={busyId === link._id}
                    disabled={busyId !== null && busyId !== link._id}
                    leftSection={<IconGitMerge size={13} />}
                    onClick={() => handleMergeInto(link, group)}
                  >
                    Keep this
                  </Button>
                </Tooltip>
              </Group>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
