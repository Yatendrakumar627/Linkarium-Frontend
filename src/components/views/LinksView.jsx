import { useEffect, useMemo } from 'react'
import { Button } from '@mantine/core'
import { useDebouncedValue, useIntersection } from '@mantine/hooks'
import { IconLink } from '@tabler/icons-react'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import LinkGrid from '../links/LinkGrid'
import SelectionToolbar from '../selection/SelectionToolbar'
import LoadingSkeletons from '../common/LoadingSkeletons'
import EmptyState from '../common/EmptyState'
import ErrorState from '../common/ErrorState'
import './LinksView.css'

export default function LinksView({ params = {}, fixedLimit, emptyTitle, emptySubtitle }) {
  const links = useLinkStore((s) => s.links)
  const loading = useLinkStore((s) => s.loading)
  const error = useLinkStore((s) => s.error)
  const hasMore = useLinkStore((s) => s.hasMore)
  const fetchLinks = useLinkStore((s) => s.fetchLinks)
  const loadMore = useLinkStore((s) => s.loadMore)

  const search = useUiStore((s) => s.search)
  const sort = useUiStore((s) => s.sort)

  const [debouncedSearch] = useDebouncedValue(search, 250)

  const queryParams = useMemo(() => {
    const q = {
      ...params,
      sort: params.sort || sort,
      limit: params.limit || (fixedLimit || undefined),
    }
    if (debouncedSearch.trim()) q.q = debouncedSearch.trim()
    return q
  }, [params, sort, fixedLimit, debouncedSearch])

  useEffect(() => {
    fetchLinks(queryParams, { reset: true })
  }, [queryParams, fetchLinks])

  const { ref: sentinelRef, entry } = useIntersection({ rootMargin: '300px' })

  useEffect(() => {
    if (entry?.isIntersecting) loadMore()
  }, [entry?.isIntersecting, loadMore])

  if (loading) return <LoadingSkeletons />

  if (error && links.length === 0) {
    return <ErrorState message={error} onRetry={() => fetchLinks(queryParams, { reset: true })} />
  }

  if (!links.length) {
    return (
      <EmptyState
        icon={<IconLink size={34} />}
        title={emptyTitle || 'No links found'}
        subtitle={
          search
            ? `Nothing matches "${search}". Try a different search.`
            : emptySubtitle || 'Links you save will show up here.'
        }
      />
    )
  }

  return (
    <div className="fade-up links-view-wrap">
      {error && links.length > 0 && (
        <div className="links-error-banner">
          <span className="links-error-text">{error}</span>
          <Button size="xs" variant="subtle" color="red" onClick={loadMore}>
            Retry
          </Button>
        </div>
      )}

      <SelectionToolbar />

      <LinkGrid links={links} />

      {hasMore && !fixedLimit && <div ref={sentinelRef} className="links-view-sentinel" />}
    </div>
  )
}