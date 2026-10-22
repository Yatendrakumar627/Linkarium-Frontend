import { useEffect, useMemo } from 'react'
import { Button } from '@mantine/core'
import { useDebouncedValue, useIntersection } from '@mantine/hooks'
import { IconLink } from '@tabler/icons-react'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import LinkGrid from '../links/LinkGrid'
import SelectionToolbar from '../selection/SelectionToolbar'
import FilterChips from '../common/FilterChips'
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
  const parsed = useLinkStore((s) => s.parsed)

  const search = useUiStore((s) => s.search)
  const sort = useUiStore((s) => s.sort)
  const view = useUiStore((s) => s.view)
  const setSearch = useUiStore((s) => s.setSearch)

  const [debouncedSearch] = useDebouncedValue(search, 250)

  const queryParams = useMemo(() => {
    const q = {
      ...params,
      sort: params.sort || sort,
      limit: params.limit || (fixedLimit || undefined),
    }
    // The search box wins over the view's own query — but when the box is
    // empty the view's query must survive, otherwise clearing the search
    // silently drops the view's filter.
    if (debouncedSearch.trim()) q.q = debouncedSearch.trim()
    else if (params.q) q.q = params.q
    return q
  }, [params, sort, fixedLimit, debouncedSearch])

  const queryKey = useMemo(() => JSON.stringify(queryParams), [queryParams])
  const activeParamsKey = useLinkStore((s) => s.activeParamsKey)

  useEffect(() => {
    fetchLinks(queryParams, { reset: true })
  }, [queryParams, fetchLinks])

  const { ref: sentinelRef, entry } = useIntersection({ rootMargin: '300px' })
  const loadedCount = links.length

  useEffect(() => {
    if (entry?.isIntersecting) loadMore()
    // loadedCount keeps this effect firing while the sentinel stays visible on
    // a tall viewport (a short page would otherwise never trigger the next load).
  }, [entry?.isIntersecting, loadMore, loadedCount])

  // The store may still hold the previous view's links for one render — show the
  // skeleton instead of briefly painting the wrong list.
  if (loading || (activeParamsKey && activeParamsKey !== queryKey && !error)) {
    return (
      <div className="links-view-wrap">
        <FilterChips />
        <LoadingSkeletons />
      </div>
    )
  }

  if (error && links.length === 0) {
    return <ErrorState message={error} onRetry={() => fetchLinks(queryParams, { reset: true })} />
  }

  if (!links.length) {
    return (
      <div className="links-view-wrap">
        <FilterChips />
        <EmptyState
          icon={<IconLink size={34} />}
          title={emptyTitle || 'No links found'}
          subtitle={
            search
              ? `Nothing matches "${search}". Try a different search.`
              : emptySubtitle || 'Links you save will show up here.'
          }
        />
      </div>
    )
  }

  return (
    <div className="fade-up links-view-wrap">
      <FilterChips />

      {parsed?.fuzzy && (
        <div className="links-fuzzy-banner">
          <span className="links-fuzzy-text">
            No exact match for “{parsed.fuzzyOriginal || search}” — showing results for “
            {parsed.fuzzyQuery || search}”.
          </span>
          {parsed.fuzzyQuery && (
            <Button
              size="xs"
              variant="subtle"
              color="violet"
              onClick={() => setSearch(parsed.fuzzyQuery)}
            >
              Use that search
            </Button>
          )}
        </div>
      )}

      {view.type === 'archived' && (
        <div className="links-archive-banner">
          <span className="links-archive-text">
            Archived links are hidden from every other view. Bring one back from the menu on its
            card.
          </span>
        </div>
      )}

      {error && links.length > 0 && (
        <div className="links-error-banner">
          <span className="links-error-text">{error}</span>
          <Button size="xs" variant="subtle" color="red" onClick={() => fetchLinks(queryParams, { reset: true })}>
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