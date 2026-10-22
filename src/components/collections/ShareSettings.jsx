import { useEffect, useState } from 'react'
import { Button, Group, Stack, Text, Badge, CopyButton, Tooltip } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCopy, IconLink, IconRefresh, IconTrash, IconCheck } from '@tabler/icons-react'
import { collectionsApi } from '../../api/endpoints'
import { useLinkStore } from '../../store/linkStore'
import './ShareSettings.css'

// The public share link of a collection.
//
// The link is read-only and can be revoked at any time; rotating it gives a
// fresh URL and kills the old one, which is what a user wants after they
// accidentally shared the wrong collection.
export default function ShareSettings({ collection }) {
  const refreshCollections = useLinkStore((s) => s.fetchMeta)

  const [shared, setShared] = useState(collection?.shared || { enabled: false, slug: null })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setShared(collection?.shared || { enabled: false, slug: null })
  }, [collection?.id, collection?.shared])

  if (!collection) return null

  const shareUrl = shared?.slug ? `${window.location.origin}/s/${shared.slug}` : null

  const handleShare = async () => {
    setBusy(true)
    try {
      const { shared: next } = await collectionsApi.share(collection.id, {})
      setShared(next)
      await refreshCollections()
      notifications.show({ message: 'Share link created', color: 'green' })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setBusy(false)
    }
  }

  const handleRotate = async () => {
    setBusy(true)
    try {
      const { shared: next } = await collectionsApi.share(collection.id, { rotate: true })
      setShared(next)
      await refreshCollections()
      notifications.show({ message: 'Share link rotated — the old link no longer works', color: 'green' })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setBusy(false)
    }
  }

  const handleRevoke = async () => {
    setBusy(true)
    try {
      await collectionsApi.unshare(collection.id)
      setShared({ enabled: false, slug: null })
      await refreshCollections()
      notifications.show({ message: 'Sharing stopped', color: 'green' })
    } catch (err) {
      notifications.show({ message: err.message, color: 'red' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap="sm" className="share-settings">
      <div className="share-settings-head">
        <Group gap={6}>
          <IconLink size={15} />
          <Text size="sm" fw={600}>
            Public link
          </Text>
        </Group>
        {shared?.enabled ? (
          <Badge size="xs" variant="light" color="green">
            Shared
          </Badge>
        ) : (
          <Badge size="xs" variant="light" color="gray">
            Not shared
          </Badge>
        )}
      </div>

      {shared?.enabled && shareUrl ? (
        <>
          <div className="share-url">
            <span className="share-url-text">{shareUrl}</span>
            <CopyButton value={shareUrl}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'Copied' : 'Copy link'}>
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    color={copied ? 'green' : 'violet'}
                    onClick={copy}
                    leftSection={copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </Tooltip>
              )}
            </CopyButton>
          </div>

          <Group gap={8}>
            <Button
              size="xs"
              variant="default"
              onClick={handleRotate}
              loading={busy}
              leftSection={<IconRefresh size={13} />}
            >
              Rotate
            </Button>
            <Button
              size="xs"
              variant="subtle"
              color="red"
              onClick={handleRevoke}
              loading={busy}
              leftSection={<IconTrash size={13} />}
            >
              Stop sharing
            </Button>
          </Group>
        </>
      ) : (
        <>
          <Text size="xs" c="dimmed">
            Anyone with the link can read this collection. Your notes stay private.
          </Text>
          <Button
            size="xs"
            variant="light"
            color="violet"
            onClick={handleShare}
            loading={busy}
            leftSection={<IconLink size={13} />}
          >
            Create a public link
          </Button>
        </>
      )}
    </Stack>
  )
}
