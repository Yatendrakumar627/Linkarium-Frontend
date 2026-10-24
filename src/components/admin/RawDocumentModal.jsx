import { useState } from 'react'
import { Modal, Button, Text, Tooltip } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCopy, IconCheck, IconDatabase, IconCode } from '@tabler/icons-react'

export default function RawDocumentModal({ opened, onClose, document, collectionName }) {
  const [copied, setCopied] = useState(false)

  if (!document) return null

  const jsonString = JSON.stringify(document, null, 2)
  const byteSize = new Blob([jsonString]).size
  const keysCount = Object.keys(document).length

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    notifications.show({ message: 'Document JSON copied to clipboard', color: 'teal' })
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      centered
      overlayProps={{ blur: 12, opacity: 0.75, backgroundOpacity: 0.75 }}
      styles={{
        content: {
          background: 'radial-gradient(120% 120% at 50% 0%, rgba(20, 12, 38, 0.98) 0%, rgba(5, 5, 8, 0.99) 100%)',
          backdropFilter: 'blur(36px) saturate(180%)',
          border: '1px solid rgba(0, 229, 255, 0.22)',
          borderRadius: 20,
          color: '#fff',
          boxShadow: '0 0 0 1px rgba(0, 229, 255, 0.1), 0 24px 64px -12px rgba(0, 0, 0, 0.9), 0 0 70px -20px rgba(59, 10, 107, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        },
        header: {
          background: 'rgba(14, 8, 28, 0.98)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#fff',
          padding: '1.25rem 1.6rem',
        },
        body: {
          padding: '1.6rem',
        },
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconDatabase size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
              Collection: <span style={{ color: '#60a5fa' }}>{collectionName}</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'monospace' }}>
              _id: {String(document._id)}
            </div>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Metadata Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: 10,
            padding: '8px 14px',
            fontSize: '0.78rem',
            color: 'rgba(255, 255, 255, 0.65)',
          }}
        >
          <div style={{ display: 'flex', gap: 16 }}>
            <span>Fields: <strong style={{ color: '#fff' }}>{keysCount}</strong></span>
            <span>Payload Size: <strong style={{ color: '#fff' }}>{byteSize} bytes</strong></span>
          </div>
          <Tooltip label={copied ? 'Copied!' : 'Copy formatted JSON'}>
            <Button
              size="xs"
              variant="light"
              color={copied ? 'teal' : 'blue'}
              leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy JSON'}
            </Button>
          </Tooltip>
        </div>

        {/* JSON Code Viewer */}
        <div
          style={{
            background: 'rgba(8, 10, 16, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            padding: '1rem',
            maxHeight: '480px',
            overflowY: 'auto',
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            fontSize: '0.82rem',
            lineHeight: 1.5,
            color: '#e2e8f0',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {jsonString}
        </div>
      </div>
    </Modal>
  )
}
