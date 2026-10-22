import { useEffect, useMemo, useState } from 'react'
import { IconSearch, IconGitMerge, IconCheck, IconArchive } from '@tabler/icons-react'
import { useLinkStore } from '../../store/linkStore'
import { hostOf } from '../../utils'
import {
  AppButton,
  AppModal,
  AppModalBody,
  AppModalFooter,
  AppModalHeader,
  AppModalNote,
  AppModalSearch,
} from '../common/ModalShell'
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
  const [targetId, setTargetId] = useState(null)

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
      setTargetId(null)
    }
  }, [opened])

  const handleMerge = async () => {
    if (!targetId || busy) return
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

  const selectedTarget = filtered.find((l) => l._id === targetId) || null

  return (
    <AppModal opened={opened} onClose={onClose} size="lg" className="merge-modal-root">
      <AppModalHeader
        icon={<IconGitMerge size={20} />}
        title="Merge into another link"
        subtitle="Fold one link into another"
        onClose={busy ? undefined : onClose}
      />

      <AppModalBody>
        <div className="merge-modal-intro">
          <AppModalNote
            tone="info"
            icon={<IconArchive size={14} />}
          >
            <strong>{sourceTitle}</strong> will be archived and its tags, summary and visit
            count will move to the link you pick. Archiving is reversible.
          </AppModalNote>
        </div>

        <AppModalSearch
          value={query}
          onChange={setQuery}
          placeholder="Search by title or URL…"
          autoFocus
        />

        {error ? (
          <div className="merge-modal-error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="merge-modal-list">
          {filtered.length === 0 ? (
            <div className="app-modal-empty">
              <IconSearch size={26} opacity={0.4} />
              <div>
                {candidates.length === 0
                  ? 'There are no other links to merge into.'
                  : 'Nothing matches that search.'}
              </div>
            </div>
          ) : (
            filtered.map((l) => {
              const selected = targetId === l._id
              return (
                <button
                  key={l._id}
                  type="button"
                  className={`app-modal-row ${selected ? 'is-selected' : ''}`}
                  disabled={busy}
                  onClick={() => setTargetId(l._id)}
                  aria-pressed={selected}
                >
                  <span
                    className={`merge-target-radio ${selected ? 'is-checked' : ''}`}
                    aria-hidden="true"
                  >
                    {selected ? <IconCheck size={11} stroke={3} /> : null}
                  </span>
                  <span className="app-modal-row-main">
                    <span className="app-modal-row-title">{l.title || l.url}</span>
                    <span className="app-modal-row-meta">{hostOf(l.url)}</span>
                  </span>
                  {selected ? <IconGitMerge size={16} className="merge-target-icon" /> : null}
                </button>
              )
            })
          )}
        </div>
      </AppModalBody>

      <AppModalFooter
        meta={
          selectedTarget ? (
            <>
              Merging into <strong>{selectedTarget.title || selectedTarget.url}</strong>
            </>
          ) : (
            `${filtered.length} candidate${filtered.length === 1 ? '' : 's'}`
          )
        }
      >
        <AppButton variant="subtle" onClick={onClose} disabled={busy}>
          Cancel
        </AppButton>
        <AppButton
          onClick={handleMerge}
          loading={busy}
          disabled={!targetId}
          leftSection={<IconGitMerge size={15} />}
        >
          Merge links
        </AppButton>
      </AppModalFooter>
    </AppModal>
  )
}
