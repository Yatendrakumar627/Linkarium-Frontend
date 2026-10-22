import { useEffect, useMemo, useState } from 'react'
import { Modal, TextInput, Button, Group, Stack, Text, Loader, ScrollArea } from '@mantine/core'
import { IconSearch, IconGitMerge } from '@tabler/icons-react'
import { useLinkStore } from '../../store/linkStore'
import { hostOf } from '../../utils'
import './MergeLinkModal.css'

// A tiny picker that asks "which link should this one become?".
//
// Merging folds the source into the target: the tags, the summary, the visits
// and the favourite flag move over, and the source is archived (never
// deleted) so the merge can be undone.
export default function MergeLinkModal({ opened, onClose, sourceId, sourceTitle }) {
  const links = useLinkStore((s) => s.links)
  const mapLinks = useLinkStore((s) => s.mapLinks)
  const mergeLinks = useLinkStore((s) => s.mergeLinks)

  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // The candidate list comes from the loaded links plus the full map, so the
  // user can merge into something that is not on the current page.
  const candidates = useMemo(() => {
    const pool = [...links, ...mapLinks]
    const seen = new Set()
    return pool.filter((l) => {
      if (!l || l._id === sourceId || seen.has(l._id)) return false
      seen.add(l._id)
      return true
    })
  }, [links, mapLinks, sourceId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? candidates.filter(
          (l) =>
            (l.title || '').toLowerCase().includes(q) ||
            (l.url || '').toLowerCase().includes(q)
        )
      : candidates
    return list.slice(0, 50)
  }, [candidates, query])

  useEffect(() => {
    if (opened) {
      setQuery('')
      setError(null)
      setBusy(false)
    }
  }, [opened])

  const handleMerge = async (targetId) => {
    setBusy(true)
    setError(null)
    try {
      await mergeLinks(sourceId, targetId)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not merge the links.')
      setBusy(false)
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Merge into another link"
      centered
      size="lg"
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          <strong>{sourceTitle}</strong> will be archived and its tags, summary and visit
          count will be moved to the link you pick.
        </Text>

        <TextInput
          leftSection={<IconSearch size={15} />}
          placeholder="Search by title or URL…"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          autoFocus
        />

        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}

        <ScrollArea.Autosize mah={320}>
          {filtered.length === 0 ? (
            <Text size="sm" c="dimmed" py="md">
              {candidates.length === 0 ? 'There are no other links to merge into.' : 'Nothing matches that search.'}
            </Text>
          ) : (
            <Stack gap={4}>
              {filtered.map((l) => (
                <button
                  key={l._id}
                  type="button"
                  className="merge-target"
                  disabled={busy}
                  onClick={() => handleMerge(l._id)}
                >
                  <div className="merge-target-main">
                    <div className="merge-target-title">{l.title || l.url}</div>
                    <div className="merge-target-url">{hostOf(l.url)}</div>
                  </div>
                  {busy ? <Loader size={14} /> : <IconGitMerge size={16} />}
                </button>
              ))}
            </Stack>
          )}
        </ScrollArea.Autosize>

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
