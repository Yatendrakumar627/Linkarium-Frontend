import { useState } from 'react'
import { Button, Modal, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { ACCENT_COLORS } from '../../constants'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import './CollectionEditorModal.css'

function CollectionForm({ collection, isEdit, addCollection, updateCollection, onClose }) {
  const [name, setName] = useState(collection?.name || '')
  const [color, setColor] = useState(collection?.color || ACCENT_COLORS[0])
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!name.trim()) {
      notifications.show({ message: 'Collection name is required.', color: 'red' })
      return
    }
    setBusy(true)
    try {
      if (isEdit) {
        await updateCollection(collection.id, { name: name.trim(), color })
        notifications.show({ message: 'Collection updated', color: 'green' })
      } else {
        await addCollection(name.trim(), color)
        notifications.show({ message: 'Collection created', color: 'green' })
      }
      onClose()
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="collection-form">
      <TextInput
        label="Name"
        placeholder="e.g. Work, Inspiration, Reading…"
        required
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
      />

      <div>
        <div className="collection-color-label">Colour</div>
        <div className="collection-colors">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`collection-swatch ${color === c ? 'selected' : ''}`}
              style={{ background: c }}
              aria-label={`Colour ${c}`}
            />
          ))}
        </div>
      </div>

      <Button
        type="submit"
        loading={busy}
        className="collection-submit gradient-btn"
      >
        {isEdit ? 'Save changes' : 'Create collection'}
      </Button>
    </form>
  )
}

export default function CollectionEditorModal() {
  const state = useUiStore((s) => s.collectionEditor)
  const close = useUiStore((s) => s.closeCollectionEditor)
  const addCollection = useLinkStore((s) => s.addCollection)
  const updateCollection = useLinkStore((s) => s.updateCollection)

  const isEdit = state?.mode === 'edit'
  const editing = state?.collection || null

  return (
    <Modal opened={!!state} onClose={close} title={isEdit ? 'Edit collection' : 'New collection'} size="sm">
      {state && (
        <CollectionForm
          key={editing?.id || 'create'}
          collection={editing}
          isEdit={isEdit}
          addCollection={addCollection}
          updateCollection={updateCollection}
          onClose={close}
        />
      )}
    </Modal>
  )
}