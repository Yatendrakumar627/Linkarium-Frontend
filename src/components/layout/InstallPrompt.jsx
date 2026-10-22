import { useEffect, useState } from 'react'
import { Button, Group, Text, Paper } from '@mantine/core'
import { IconDownload, IconX } from '@tabler/icons-react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      const dismissed = localStorage.getItem('linkarium.pwaDismissed')
      if (dismissed && Date.now() - parseInt(dismissed, 10) < 7 * 24 * 60 * 60 * 1000) {
        return
      }
      setDeferredPrompt(e)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setVisible(false)
    localStorage.setItem('linkarium.pwaDismissed', String(Date.now()))
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        maxWidth: 380,
        animation: 'fadeUp 0.3s ease',
      }}
    >
      <Paper
        withBorder
        p="sm"
        radius="md"
        shadow="xl"
        style={{
          background: 'rgba(15, 15, 28, 0.95)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(139, 92, 246, 0.4)',
        }}
      >
        <Group justify="space-between" align="center" mb={6}>
          <Group gap="xs">
            <IconDownload size={18} style={{ color: 'var(--color-primary, #8b5cf6)' }} />
            <Text size="sm" fw={600}>Install Linkarium</Text>
          </Group>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dimmed)',
              cursor: 'pointer',
              padding: 2,
            }}
          >
            <IconX size={14} />
          </button>
        </Group>
        <Text size="xs" c="dimmed" mb="xs">
          Add Linkarium to your home screen or desktop for fast offline access and native window mode.
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button size="xs" variant="subtle" color="gray" onClick={handleDismiss}>
            Not now
          </Button>
          <Button size="xs" color="violet" onClick={handleInstall} leftSection={<IconDownload size={13} />}>
            Install
          </Button>
        </Group>
      </Paper>
    </div>
  )
}
