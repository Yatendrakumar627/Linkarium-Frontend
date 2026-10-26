import { useEffect, useMemo, useState } from 'react'
import { TagsInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconTag, IconCheck } from '@tabler/icons-react'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import {
  AppButton,
  AppModal,
  AppModalBody,
  AppModalFooter,
  AppModalHeader,
  AppModalNote,
} from '../common/ModalShell'
import { accessibleClearButtonProps, renderAccessibleTagPill } from '../common/tagInput'
import { tagToColor } from '../../utils/colorUtils'
import './BulkTagModal.css'

// Tag several links at once.
//
// The tag list is seeded with the tags the selected links already carry, so
// the user can add to them without retyping.
export default function BulkTagModal({ opened, onClose, onConfirm }) {
  const tags = useLinkStore((s) => s.tags)
  const links = useLinkStore((s) => s.links)
  const selectedIds = useUiStore((s) => s.selectedIds)

  const [value, setValue] = useState([])
  const [initialTags, setInitialTags] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!opened) return
    const existing = new Set()
    for (const link of links) {
      if (!selectedIds.has(link._id)) continue
      for (const tag of link.tags || []) existing.add(tag)
    }
    const tagsOnSelection = [...existing]
    setValue(tagsOnSelection)
    setInitialTags(tagsOnSelection)
    setBusy(false)
  }, [opened, links, selectedIds])

  const selectedCount = selectedIds.size

  const suggestions = useMemo(
    () => (tags || []).map((t) => t.tag).filter((t) => !value.includes(t)),
    [tags, value]
  )

  const handleConfirm = async () => {
    if (!value.length && !initialTags.length) {
      notifications.show({ message: 'Pick at least one tag.', color: 'gray' })
      return
    }
    setBusy(true)
    try {
      await onConfirm(value)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppModal opened={opened} onClose={onClose} size="md" className="bulk-tag-root">
      <AppModalHeader
        icon={<IconTag size={20} />}
        title="Tag selected links"
        subtitle={
          selectedCount > 0
            ? `Apply tags to ${selectedCount} selected link${selectedCount === 1 ? '' : 's'}`
            : 'Apply tags to the selected links'
        }
        onClose={busy ? undefined : onClose}
      />

      <AppModalBody className="bulk-tag-body">
        <AppModalNote tone="info" icon={<IconCheck size={14} />}>
          Tags already on the selected links are pre-filled. Add new ones or remove existing
          ones to update every selected link at once.
        </AppModalNote>

        <TagsInput
          value={value}
          onChange={setValue}
          placeholder="Type a tag and press Enter"
          data={suggestions}
          clearable
          clearButtonProps={accessibleClearButtonProps}
          renderPill={renderAccessibleTagPill}
          openOnFocus={false}
          maxDropdownHeight={180}
          comboboxProps={{
            position: 'bottom-start',
            middlewares: {
              flip: { fallbackStrategy: 'bestFit', padding: 8 },
              shift: { padding: 8 },
            },
            offset: 4,
            withinPortal: true,
          }}
        />

        {suggestions.length > 0 ? (
          <div className="bulk-tag-suggestions">
            <div className="app-modal-section-label">Existing tags</div>
            <div className="bulk-tag-chips">
              {suggestions.slice(0, 16).map((t) => (
                <button
                  key={t}
                  type="button"
                  className="bulk-tag-chip"
                  onClick={() => setValue((prev) => [...prev, t])}
                >
                  <span style={{ color: tagToColor(t), fontWeight: 700, marginRight: 2 }}>#</span>
                  {t}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </AppModalBody>

      <AppModalFooter meta={`${value.length} tag${value.length === 1 ? '' : 's'} selected`}>
        <AppButton variant="subtle" onClick={onClose} disabled={busy}>
          Cancel
        </AppButton>
        <AppButton onClick={handleConfirm} loading={busy} disabled={!value.length && !initialTags.length}>
          Apply tags
        </AppButton>
      </AppModalFooter>
    </AppModal>
  )
}
