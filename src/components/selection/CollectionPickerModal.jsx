import { useEffect, useState } from 'react'
import { IconFolder, IconCheck, IconFolderOff } from '@tabler/icons-react'
import { useLinkStore } from '../../store/linkStore'
import {
  AppButton,
  AppModal,
  AppModalBody,
  AppModalFooter,
  AppModalHeader,
} from '../common/ModalShell'
import './CollectionPickerModal.css'

export default function CollectionPickerModal({ opened, onClose, onConfirm }) {
  const collections = useLinkStore((s) => s.collections)
  // undefined = nothing chosen yet (confirm disabled); null = explicit "No collection".
  const [selectedId, setSelectedId] = useState(undefined)

  // Reset the selection every time the dialog opens so it never restores a
  // stale destination from a previous move.
  useEffect(() => {
    if (opened) setSelectedId(undefined)
  }, [opened])

  const handleConfirm = () => {
    if (selectedId === undefined) return
    onConfirm(selectedId)
    setSelectedId(undefined)
  }

  const selectedName =
    selectedId === undefined
      ? null
      : selectedId === null
        ? 'No collection'
        : collections.find((c) => c.id === selectedId)?.name

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      size="sm"
      className="collection-picker-root"
    >
      <AppModalHeader
        icon={<IconFolder size={20} />}
        title="Move to collection"
        subtitle="Pick a destination for the selected links"
        onClose={onClose}
      />

      <AppModalBody>
        <div className="collection-picker-list">
          <button
            type="button"
            className={`app-modal-row ${selectedId === null ? 'is-selected' : ''}`}
            onClick={() => setSelectedId(null)}
            aria-pressed={selectedId === null}
          >
            <span
              className={`collection-picker-radio ${selectedId === null ? 'is-checked' : ''}`}
              aria-hidden="true"
            >
              {selectedId === null ? <IconCheck size={11} stroke={3} /> : null}
            </span>
            <span className="app-modal-row-main">
              <span className="app-modal-row-title">No collection</span>
            </span>
            <IconFolderOff size={15} className="collection-picker-tail-icon" />
          </button>

          {collections.map((c) => {
            const selected = selectedId === c.id
            return (
              <button
                key={c.id}
                type="button"
                className={`app-modal-row ${selected ? 'is-selected' : ''}`}
                onClick={() => setSelectedId(c.id)}
                aria-pressed={selected}
              >
                <span
                  className={`collection-picker-radio ${selected ? 'is-checked' : ''}`}
                  aria-hidden="true"
                >
                  {selected ? <IconCheck size={11} stroke={3} /> : null}
                </span>
                <span
                  className="app-modal-dot"
                  style={{
                    background: c.color || '#6a18b8',
                    boxShadow: `0 0 10px ${c.color || '#6a18b8'}55`,
                  }}
                />
                <span className="app-modal-row-main">
                  <span className="app-modal-row-title">{c.name}</span>
                </span>
                <span className="app-modal-row-tail">{c.count ?? 0}</span>
              </button>
            )
          })}

          {collections.length === 0 ? (
            <div className="app-modal-empty">
              <IconFolder size={26} opacity={0.4} />
              <div>No collections yet. Create one first.</div>
            </div>
          ) : null}
        </div>
      </AppModalBody>

      <AppModalFooter
        meta={selectedName ? <span className="collection-picker-meta">→ {selectedName}</span> : null}
      >
        <AppButton variant="subtle" onClick={onClose}>
          Cancel
        </AppButton>
        <AppButton disabled={selectedId === undefined} onClick={handleConfirm}>
          Move here
        </AppButton>
      </AppModalFooter>
    </AppModal>
  )
}
