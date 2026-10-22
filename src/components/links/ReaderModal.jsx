import { useCallback, useEffect, useState } from 'react'
import { Modal, Button, Loader, Text, Group, Badge } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconExternalLink,
  IconRefresh,
  IconSparkles,
  IconWorld,
} from '@tabler/icons-react'
import { linksApi, enrichApi } from '../../api/endpoints'
import { useUiStore } from '../../store/uiStore'
import { hostOf } from '../../utils'
import './ReaderModal.css'

// Reader mode.
//
// A link is a promise that the page behind it is worth reading. When the
// server has a clean copy of the article, this shows it here — no ads, no
// cookie banner, no pop-ups, just the text.
//
// If the page has never been read, the reader offers to fetch it now.
export default function ReaderModal() {
  const link = useUiReaderLink()
  const close = useUiCloseReader()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [enriching, setEnriching] = useState(false)

  const id = link?._id

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await linksApi.article(id)
      setData(res)
    } catch (err) {
      setError(err.message || 'Could not open the reader.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!id) {
      setData(null)
      setError(null)
      return undefined
    }
    load()
  }, [id, load])

  const handleEnrich = async () => {
    setEnriching(true)
    try {
      await enrichApi.link(id)
      await load()
    } catch (err) {
      notifications.show({ message: err.message || 'Could not fetch the page.', color: 'red' })
    } finally {
      setEnriching(false)
    }
  }

  if (!link) return null

  const article = data?.article
  const text = article?.text || ''
  const paragraphs = text ? text.split(/\n{2,}/).filter(Boolean) : []
  const og = data?.og || link.og || null

  return (
    <Modal
      opened
      onClose={close}
      withCloseButton={false}
      size="xl"
      padding={0}
      centered
      classNames={{ root: 'rd-root', content: 'rd-content', body: 'rd-body' }}
    >
      <div className="rd-shell">
        <header className="rd-head">
          {og?.image && (
            <div className="rd-cover">
              <img src={og.image} alt="" />
            </div>
          )}

          <div className="rd-head-body">
            <div className="rd-eyebrow">
              <IconWorld size={12} />
              <span>{hostOf(link.url)}</span>
              {article?.wordCount > 0 && (
                <Badge size="xs" variant="light" color="violet">
                  {article.wordCount} words
                </Badge>
              )}
            </div>

            <h1 className="rd-title">{data?.title || link.title}</h1>

            {og?.description && <p className="rd-lede">{og.description}</p>}

            <Group gap={8} mt="sm">
              <Button
                size="xs"
                variant="light"
                color="violet"
                component="a"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                leftSection={<IconExternalLink size={14} />}
              >
                Open original
              </Button>
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                onClick={load}
                loading={loading}
                leftSection={<IconRefresh size={14} />}
              >
                Refresh
              </Button>
            </Group>
          </div>
        </header>

        <div className="rd-scroll">
          {loading && !data && (
            <div className="rd-state">
              <Loader size={20} color="violet" />
              <Text size="sm" c="dimmed">
                Opening the reader…
              </Text>
            </div>
          )}

          {error && (
            <div className="rd-state">
              <Text size="sm" c="red">
                {error}
              </Text>
            </div>
          )}

          {!loading && data && !paragraphs.length && (
            <div className="rd-state">
              <IconSparkles size={22} className="rd-state-icon" />
              <Text size="sm" c="dimmed">
                This page has not been read yet. Fetch it once and it stays available
                offline afterwards.
              </Text>
              <Button
                size="xs"
                variant="light"
                color="violet"
                onClick={handleEnrich}
                loading={enriching}
                leftSection={<IconSparkles size={14} />}
              >
                Read the page now
              </Button>
            </div>
          )}

          {paragraphs.map((paragraph, index) => (
            // The text is a flat list of paragraphs; the index is the only
            // stable key there is.
            // eslint-disable-next-line react/no-array-index-key
            <p key={index} className="rd-paragraph">
              {paragraph}
            </p>
          ))}
        </div>

        <footer className="rd-foot">
          <Button size="xs" variant="subtle" color="gray" onClick={close}>
            Close
          </Button>
        </footer>
      </div>
    </Modal>
  )
}

// Small helpers so the component above stays readable.
function useUiReaderLink() {
  return useUiStore((s) => s.readerLink)
}

function useUiCloseReader() {
  return useUiStore((s) => s.closeReader)
}
