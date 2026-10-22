import { useRef, useState } from 'react'
import { notifications } from '@mantine/notifications'
import { IconUpload, IconFileSpreadsheet, IconCheck, IconX, IconInfoCircle } from '@tabler/icons-react'
import { linksApi } from '../api/endpoints'
import { useLinkStore } from '../store/linkStore'
import {
  AppButton,
  AppModal,
  AppModalBody,
  AppModalFooter,
  AppModalHeader,
  AppModalNote,
} from './common/ModalShell'
import './ImportLinksModal.css'

export default function ImportLinksModal({ opened, onClose }) {
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fetchMeta = useLinkStore((s) => s.fetchMeta)

  const acceptFile = (f) => {
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['csv', 'xls', 'xlsx'].includes(ext)) {
      notifications.show({ message: 'Only CSV and Excel files are allowed.', color: 'red' })
      return
    }
    setFile(f)
    setResult(null)
  }

  const handleFile = (e) => {
    acceptFile(e.target.files?.[0])
  }

  const handleImport = async () => {
    if (!file || busy) return
    setBusy(true)
    setResult(null)
    try {
      const res = await linksApi.import(file)
      setResult(res)
      if (res.imported > 0) {
        notifications.show({ message: `${res.imported} link(s) imported successfully!`, color: 'cyan' })
        fetchMeta().catch(() => {})
        // Reload through the currently active filter instead of forcing the
        // unfiltered list into whatever view is open.
        const state = useLinkStore.getState()
        if (state.lastParams) await state.fetchLinks(state.lastParams, { reset: true })
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
    <AppModal opened={opened} onClose={handleClose} size="lg" className="import-modal-root">
      <AppModalHeader
        icon={<IconUpload size={20} />}
        title="Import Links"
        subtitle="Bulk-add links from a CSV or Excel file"
        onClose={busy ? undefined : handleClose}
      />

      <AppModalBody className="import-modal-body">
        <AppModalNote tone="info" icon={<IconInfoCircle size={14} />}>
          The file needs columns for <strong>Title</strong>, <strong>URL</strong>,{' '}
          <strong>Tags</strong>, <strong>Collection</strong> and <strong>Hyperlink</strong>.
          Missing columns are simply skipped.
        </AppModalNote>

        <div
          className={`import-dropzone ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            acceptFile(e.dataTransfer.files?.[0])
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileRef.current?.click()
            }
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
          {file ? (
            <div className="import-file">
              <IconFileSpreadsheet size={30} className="import-icon" />
              <div className="import-file-meta">
                <div className="import-file-name">{file.name}</div>
                <div className="import-file-size">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
              <span className="import-file-pill">Ready</span>
            </div>
          ) : (
            <div className="import-dropzone-inner">
              <IconUpload size={30} className="import-icon" />
              <div className="import-dropzone-title">Drop a file here, or click to browse</div>
              <div className="import-dropzone-hint">.csv, .xlsx, .xls — max 5 MB</div>
            </div>
          )}
        </div>

        {result ? (
          <div className="import-result">
            {result.imported > 0 ? (
              <AppModalNote tone="success" icon={<IconCheck size={14} />}>
                <strong>{result.imported}</strong> link{result.imported === 1 ? '' : 's'} imported
                successfully.
              </AppModalNote>
            ) : null}
            {result.skipped > 0 ? (
              <AppModalNote tone="warning" icon={<IconX size={14} />}>
                <strong>{result.skipped}</strong> duplicate link
                {result.skipped === 1 ? '' : 's'} skipped — already saved.
              </AppModalNote>
            ) : null}
            {result.errors?.length > 0 ? (
              <AppModalNote tone="danger" icon={<IconX size={14} />}>
                <div className="import-errors-head">
                  {result.errors.length} error{result.errors.length === 1 ? '' : 's'}:
                </div>
                <div className="import-errors">
                  {result.errors.slice(0, 10).map((e, i) => (
                    <div key={i} className="import-error-line">
                      {e}
                    </div>
                  ))}
                  {result.errors.length > 10 && (
                    <div className="import-error-line">
                      ...and {result.errors.length - 10} more
                    </div>
                  )}
                </div>
              </AppModalNote>
            ) : null}
          </div>
        ) : null}
      </AppModalBody>

      <AppModalFooter>
        <AppButton variant="subtle" onClick={handleClose} disabled={busy}>
          Cancel
        </AppButton>
        <AppButton
          onClick={handleImport}
          loading={busy}
          disabled={!file}
          leftSection={<IconUpload size={16} />}
        >
          Import
        </AppButton>
      </AppModalFooter>
    </AppModal>
  )
}
