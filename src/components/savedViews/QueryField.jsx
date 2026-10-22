import { useEffect, useState } from 'react'
import { Textarea, Group, Badge, Loader, Text, Stack } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { savedViewsApi } from '../../api/endpoints'

// A query editor with a live preview.
//
// The preview is fetched from the server, so the parsed operators and the
// match count always agree with what the search box would do — there is only
// one parser in this system.
export default function QueryField({ value, onChange, label = 'Query', placeholder, minRows = 2 }) {
  const [debounced] = useDebouncedValue(value, 350)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const query = String(debounced || '').trim()
    if (!query) {
      setPreview(null)
      setError(null)
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    savedViewsApi
      .preview(query)
      .then((data) => {
        if (cancelled) return
        setPreview(data)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
        setPreview(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debounced])

  const parsed = preview?.parsed

  // The operators the parser understood — shown as chips so the user can see
  // at a glance how their query was read.
  const chips = []
  if (parsed) {
    for (const tag of parsed.tags || []) chips.push({ label: `tag:${tag}`, color: 'violet' })
    for (const domain of parsed.domains || []) chips.push({ label: `domain:${domain}`, color: 'blue' })
    for (const collection of parsed.collections || []) {
      chips.push({ label: `collection:${collection}`, color: 'cyan' })
    }
    for (const flag of parsed.flags || []) chips.push({ label: `is:${flag}`, color: 'pink' })
    for (const term of parsed.terms || []) chips.push({ label: term, color: 'gray' })
    for (const phrase of parsed.phrases || []) chips.push({ label: `"${phrase}"`, color: 'gray' })
    for (const ex of parsed.exclude || []) chips.push({ label: `-${ex}`, color: 'red' })
  }

  return (
    <Stack gap={6}>
      <Textarea
        label={label || undefined}
        placeholder={placeholder || 'tag:ai is:favorite visits:>10'}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        autosize
        minRows={minRows}
        maxRows={6}
      />

      {(chips.length > 0 || loading || error) && (
        <Group gap={6} wrap="wrap" align="center">
          {loading && <Loader size={13} />}
          {error && (
            <Text size="xs" c="red">
              {error}
            </Text>
          )}
          {chips.map((chip, index) => (
            <Badge key={`${chip.label}-${index}`} size="sm" variant="light" color={chip.color}>
              {chip.label}
            </Badge>
          ))}
          {preview && typeof preview.count === 'number' && (
            <Badge size="sm" variant="outline" color={preview.count > 0 ? 'green' : 'gray'}>
              {preview.count} match{preview.count === 1 ? '' : 'es'}
            </Badge>
          )}
        </Group>
      )}
    </Stack>
  )
}
