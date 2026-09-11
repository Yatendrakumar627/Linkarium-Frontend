import { useRef, useState } from 'react'
import { Button, Modal, Text, Stack, Group, Alert } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconUpload, IconFileSpreadsheet, IconCheck, IconX } from '@tabler/icons-react'
import { linksApi } from '../api/endpoints'
import { useLinkStore } from '../store/linkStore'
import './ImportLinksModal.css'

export default function ImportLinksModal({ opened, onClose }) {
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const fetchMeta = useLinkStore((s) => s.fetchMeta)
  const fetchLinks = useLinkStore((s) => s.fetchLinks)

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['csv', 'xls', 'xlsx'].includes(ext)) {
      notifications.show({ message: 'Only CSV and Excel files are allowed.', color: 'red' })
      return
    }
    setFile(f)
    setResult(null)
  }

  const handleImport = async () => {
    if (!file || busy) return
    setBusy(true)
    setResult(null)
    try {
      const res = await linksApi.import(file)
      setResult(res)
      if (res.imported > 0) {
        notifications.show({ message: `${res.imported} link(s) imported successfully!`, color: 'green' })
        fetchMeta()
        fetchLinks({}, { reset: true })
      }
    } catch (err) {
      notifications.show({ message: err.message || 'Import failed', color: 'red' })
    } finally {
      setBusy(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setResult(null)
    onClose()
  }

  return (
    <Modal opened={opened} onClose={handleClose} title="Import Links" size="lg">
      <Stack className="import-modal-body">
        <Text size="sm" c="dimmed">
          Upload a CSV or Excel file with columns: <strong>Title</strong>, <strong>URL</strong>, <strong>Tags</strong>, <strong>Collection</strong>, <strong>Hyperlink</strong>
        </Text>

        <div
          className="import-dropzone"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
          {file ? (
            <Group gap="sm">
              <IconFileSpreadsheet size={28} className="import-icon" />
              <div>
                <Text size="sm" fw={500}>{file.name}</Text>
                <Text size="xs" c="dimmed">{(file.size / 1024).toFixed(1)} KB</Text>
              </div>
            </Group>
          ) : (
            <Stack align="center" gap="xs">
              <IconUpload size={28} className="import-icon" />
              <Text size="sm" c="dimmed">Click to select a file</Text>
              <Text size="xs" c="dimmed">.csv, .xlsx, .xls — max 5 MB</Text>
            </Stack>
          )}
        </div>

        {result && (
          <div className="import-result">
            {result.imported > 0 && (
              <Alert color="green" icon={<IconCheck size={16} />} radius="md">
                <Text size="sm"><strong>{result.imported}</strong> link(s) imported successfully.</Text>
              </Alert>
            )}
            {result.skipped > 0 && (
              <Alert color="yellow" icon={<IconX size={16} />} radius="md" mt="sm">
                <Text size="sm"><strong>{result.skipped}</strong> duplicate link(s) skipped — already saved.</Text>
              </Alert>
            )}
            {result.errors?.length > 0 && (
              <Alert color="red" icon={<IconX size={16} />} radius="md" mt="sm">
                <Text size="sm" fw={500} mb={4}>{result.errors.length} error(s):</Text>
                <div className="import-errors">
                  {result.errors.slice(0, 10).map((e, i) => (
                    <Text key={i} size="xs" c="dimmed">{e}</Text>
                  ))}
                  {result.errors.length > 10 && (
                    <Text size="xs" c="dimmed">...and {result.errors.length - 10} more</Text>
                  )}
                </div>
              </Alert>
            )}
          </div>
        )}

        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={handleClose}>Cancel</Button>
          <Button
            className="gradient-btn"
            loading={busy}
            disabled={!file}
            onClick={handleImport}
            leftSection={<IconUpload size={16} />}
          >
            Import
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
