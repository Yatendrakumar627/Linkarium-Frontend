import { useEffect, useState } from 'react'
import {
  Modal,
  TextInput,
  Button,
  Group,
  Stack,
  TagsInput,
  Select,
  Checkbox,
  Loader,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconPlayerPlay, IconDeviceFloppy } from '@tabler/icons-react'
import { useUiStore } from '../../store/uiStore'
import { useSavedViewStore } from '../../store/savedViewStore'
import { useLinkStore } from '../../store/linkStore'
import QueryField from '../savedViews/QueryField'
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
  const runRule = useSavedViewStore((s) => s.run)

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
        notifications.show({ message: 'Rule updated', color: 'green' })
      } else {
        await createRule({ name: name.trim(), query, actions, kind: 'rule' })
        notifications.show({ message: 'Rule created', color: 'green' })
      }
      close()
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  // A dry run tells the user what the rule would do before it does it.
  const handleTest = async () => {
    setRunning(true)
    try {
      let ruleId = existing?._id
      if (!ruleId) {
        const created = await createRule({
          name: name.trim() || 'Test rule',
          query,
          actions: { addTags, removeTags, collectionId, favorite, archive },
          kind: 'rule',
        })
        ruleId = created._id
      }
      const { result } = await runRule(ruleId, true)
      notifications.show({
        message: `${result?.matched ?? 0} link(s) would match`,
        color: 'violet',
      })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setRunning(false)
    }
  }

  const collectionOptions = collections.map((c) => ({ value: c.id, label: c.name }))

  return (
    <Modal opened onClose={close} title={isEdit ? 'Edit rule' : 'New rule'} centered size="lg">
      <Stack gap="md">
        <TextInput
          label="Name"
          placeholder="Tag my AI articles"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          data-autofocus
        />

        <QueryField
          value={query}
          onChange={setQuery}
          label="When a link matches"
          placeholder="domain:github.com tag:ai"
        />

        <div className="re-actions">
          <div className="re-label">Then</div>

          <TagsInput
            label="Add these tags"
            placeholder="readlater"
            value={addTags}
            onChange={setAddTags}
            clearable
          />

          <TagsInput
            label="Remove these tags"
            placeholder="unread"
            value={removeTags}
            onChange={setRemoveTags}
            clearable
          />

          {collectionOptions.length > 0 && (
            <Select
              label="Move to collection"
              placeholder="No collection"
              data={collectionOptions}
              value={collectionId}
              onChange={setCollectionId}
              clearable
            />
          )}

          <Checkbox
            label="Mark as favorite"
            checked={favorite}
            onChange={(e) => setFavorite(e.currentTarget.checked)}
          />

          <Checkbox
            label="Archive the link"
            checked={archive}
            onChange={(e) => setArchive(e.currentTarget.checked)}
          />
        </div>

        <Group gap={8} justify="flex-end">
          {running && <Loader size={16} />}
          <Button
            variant="subtle"
            color="gray"
            onClick={handleTest}
            loading={running}
            leftSection={<IconPlayerPlay size={15} />}
          >
            Test
          </Button>
          <Button
            variant="default"
            onClick={close}
            disabled={saving}
            leftSection={<IconDeviceFloppy size={15} />}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {isEdit ? 'Save changes' : 'Create rule'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
