import { useEffect, useState } from 'react'
import { TagsInput, Select, Checkbox } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconPlayerPlay, IconDeviceFloppy, IconWand, IconTags, IconFolder, IconStar, IconArchive } from '@tabler/icons-react'
import { useUiStore } from '../../store/uiStore'
import { useSavedViewStore } from '../../store/savedViewStore'
import { useLinkStore } from '../../store/linkStore'
import QueryField from '../savedViews/QueryField'
import {
  AppButton,
  AppModal,
  AppModalBody,
  AppModalFooter,
  AppModalHeader,
  AppModalSection,
} from '../common/ModalShell'
import { accessibleClearButtonProps, renderAccessibleTagPill } from '../common/tagInput'
import './RuleEditor.css'

// Create or edit an automation rule.
//
// A rule is a saved view that does something: every link that matches its
// query gets the rule's actions applied. The actions are deliberately simple —
// tags, a collection, a favourite flag, an archive — because a rule that
// rearranges the library is a rule nobody trusts.
export default function RuleEditor() {
  const editor = useUiStore((s) => s.ruleEditor)
  const close = useUiStore((s) => s.closeRuleEditor)

  const createRule = useSavedViewStore((s) => s.create)
  const updateRule = useSavedViewStore((s) => s.update)
  const previewQuery = useSavedViewStore((s) => s.preview)

  const collections = useLinkStore((s) => s.collections)

  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [addTags, setAddTags] = useState([])
  const [removeTags, setRemoveTags] = useState([])
  const [collectionId, setCollectionId] = useState(null)
  const [favorite, setFavorite] = useState(false)
  const [archive, setArchive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)

  const isEdit = editor?.mode === 'edit'
  const existing = editor?.rule

  useEffect(() => {
    if (!editor) return
    setName(existing?.name || '')
    setQuery(existing?.query || '')
    setAddTags(existing?.actions?.addTags || [])
    setRemoveTags(existing?.actions?.removeTags || [])
    setCollectionId(existing?.actions?.collectionId || null)
    setFavorite(Boolean(existing?.actions?.favorite))
    setArchive(Boolean(existing?.actions?.archive))
    setSaving(false)
    setRunning(false)
  }, [editor, existing])

  if (!editor) return null

  const handleSave = async () => {
    if (!name.trim()) {
      notifications.show({ message: 'Give the rule a name.', color: 'gray' })
      return
    }
    setSaving(true)
    try {
      const actions = {
        addTags,
        removeTags,
        collectionId: collectionId || null,
        favorite,
        archive,
      }
      if (isEdit) {
        await updateRule(existing._id, { name: name.trim(), query, actions })
        notifications.show({ message: 'Rule updated', color: 'cyan' })
      } else {
        await createRule({ name: name.trim(), query, actions, kind: 'rule' })
        notifications.show({ message: 'Rule created', color: 'cyan' })
      }
      close()
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  // A dry run tells the user what the rule would do before it does it.
  // Previewing must never persist the draft: an unsaved rule is a draft, and
  // clicking "Test rule" should not create it behind the user's back.
  const handleTest = async () => {
    setRunning(true)
    try {
      const { count } = await previewQuery(query)
      notifications.show({
        message: `${count ?? 0} link(s) would match`,
        color: 'violet',
      })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setRunning(false)
    }
  }

  const collectionOptions = collections.map((c) => ({ value: c.id, label: c.name }))
  const actionCount =
    addTags.length +
    removeTags.length +
    (collectionId ? 1 : 0) +
    (favorite ? 1 : 0) +
    (archive ? 1 : 0)

  return (
    <AppModal opened onClose={close} size="lg" className="rule-editor-root">
      <AppModalHeader
        icon={<IconWand size={20} />}
        title={isEdit ? 'Edit rule' : 'New rule'}
        subtitle="Automatically tidy the links that match a query"
        onClose={saving ? undefined : close}
      />

      <AppModalBody className="rule-editor-body">
        <AppModalSection label="When a link matches">
          <div className="app-modal-field">
            <label className="app-modal-label" htmlFor="rule-name">
              Rule name
            </label>
            <input
              id="rule-name"
              className="app-modal-input"
              placeholder="Tag my AI articles"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              data-autofocus
              maxLength={60}
            />
          </div>

          <div style={{ marginTop: 13 }}>
            <QueryField
              value={query}
              onChange={setQuery}
              label=""
              placeholder="domain:github.com tag:ai"
            />
          </div>
        </AppModalSection>

        <AppModalSection
          label="Then"
          action={
            <span className="re-action-count">
              {actionCount} action{actionCount === 1 ? '' : 's'}
            </span>
          }
        >
          <div className="re-actions">
            <div className="re-action">
              <span className="re-action-icon">
                <IconTags size={14} />
              </span>
              <div className="re-action-body">
                <TagsInput
                  label="Add these tags"
                  placeholder="readlater"
                  value={addTags}
                  onChange={setAddTags}
                  clearable
                  clearButtonProps={accessibleClearButtonProps}
                  renderPill={renderAccessibleTagPill}
                />
              </div>
            </div>

            <div className="re-action">
              <span className="re-action-icon">
                <IconTags size={14} />
              </span>
              <div className="re-action-body">
                <TagsInput
                  label="Remove these tags"
                  placeholder="unread"
                  value={removeTags}
                  onChange={setRemoveTags}
                  clearable
                  clearButtonProps={accessibleClearButtonProps}
                  renderPill={renderAccessibleTagPill}
                />
              </div>
            </div>

            {collectionOptions.length > 0 ? (
              <div className="re-action">
                <span className="re-action-icon">
                  <IconFolder size={14} />
                </span>
                <div className="re-action-body">
                  <Select
                    label="Move to collection"
                    placeholder="No collection"
                    data={collectionOptions}
                    value={collectionId}
                    onChange={setCollectionId}
                    clearable
                  />
                </div>
              </div>
            ) : null}

            <div className="re-action">
              <span className="re-action-icon">
                <IconStar size={14} />
              </span>
              <div className="re-action-body re-action-body-tight">
                <Checkbox
                  label="Mark as favorite"
                  checked={favorite}
                  onChange={(e) => setFavorite(e.currentTarget.checked)}
                />
              </div>
            </div>

            <div className="re-action">
              <span className="re-action-icon">
                <IconArchive size={14} />
              </span>
              <div className="re-action-body re-action-body-tight">
                <Checkbox
                  label="Archive the link"
                  checked={archive}
                  onChange={(e) => setArchive(e.currentTarget.checked)}
                />
              </div>
            </div>
          </div>
        </AppModalSection>
      </AppModalBody>

      <AppModalFooter
        lead={
          <AppButton
            variant="subtle"
            onClick={handleTest}
            loading={running}
            leftSection={<IconPlayerPlay size={15} />}
          >
            Test rule
          </AppButton>
        }
      >
        <AppButton variant="outline" onClick={close} disabled={saving}>
          Cancel
        </AppButton>
        <AppButton onClick={handleSave} loading={saving} leftSection={<IconDeviceFloppy size={15} />}>
          {isEdit ? 'Save changes' : 'Create rule'}
        </AppButton>
      </AppModalFooter>
    </AppModal>
  )
}
