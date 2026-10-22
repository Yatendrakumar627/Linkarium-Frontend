import { lazy, Suspense, useMemo } from 'react'
import { useUiStore } from '../../store/uiStore'
import LinksView from './LinksView'
import RecentlyVisitedView from './RecentlyVisitedView'
import TrashView from './TrashView'
import Dashboard from './Dashboard'
import DuplicatesView from './DuplicatesView'
import LoadingSkeletons from '../common/LoadingSkeletons'
import './Hub.css'

const AnalyticsView = lazy(() => import('./AnalyticsView'))
const ResurfaceView = lazy(() => import('./ResurfaceView'))

// Stable param objects — a fresh literal each render would change identity and
// retrigger LinksView's fetch effect on every parent re-render.
const FAVORITES_PARAMS = { favorite: 'true' }
const RECENT_ADDED_PARAMS = { sort: 'newest' }
const ALL_PARAMS = {}
const ARCHIVED_PARAMS = { q: 'is:archived' }
const BROKEN_PARAMS = { q: 'is:broken' }
const STALE_PARAMS = { q: 'is:stale' }
const READABLE_PARAMS = { q: 'is:readable' }

export default function Hub() {
  const view = useUiStore((s) => s.view)

  // Memoized on view.id so the param identity is stable across unrelated
  // re-renders (e.g. sidebar hover) — otherwise LinksView refetches each time.
  const collectionParams = useMemo(() => ({ collection: view.id }), [view.id])
  const tagParams = useMemo(() => ({ tag: view.id }), [view.id])
  // A saved view carries its own query.
  const savedViewParams = useMemo(() => ({ q: view.query || '' }), [view.query])

  switch (view.type) {
    case 'dashboard':
      return <Dashboard />
    case 'favorites':
      return <LinksView params={FAVORITES_PARAMS} emptyTitle="No favorites yet" emptySubtitle="Tap the star on any link to pin it here." />
    case 'collection':
      return <LinksView params={collectionParams} emptyTitle="This collection is empty" emptySubtitle="Add links to it from the New Link button." />
    case 'tag':
      return <LinksView params={tagParams} emptyTitle="No links with this tag" emptySubtitle="Tag links when you save or edit them." />
    case 'recentadded':
      return <LinksView params={RECENT_ADDED_PARAMS} fixedLimit={12} emptyTitle="Nothing saved yet" emptySubtitle="Your newest links will appear here." />
    case 'recentvisited':
      return <RecentlyVisitedView />
    case 'analytics':
      return (
        <Suspense fallback={<div className="hub-loading"><LoadingSkeletons count={3} /></div>}>
          <AnalyticsView />
        </Suspense>
      )
    case 'trash':
      return <TrashView />
    case 'archived':
      return <LinksView params={ARCHIVED_PARAMS} emptyTitle="Nothing archived" emptySubtitle="Archived links are hidden from every other view — they live here." />
    case 'broken':
      return <LinksView params={BROKEN_PARAMS} emptyTitle="No broken links — nice!" emptySubtitle="Every link in your library still answers." />
    case 'stale':
      return <LinksView params={STALE_PARAMS} emptyTitle="Nothing is stale" emptySubtitle="Every link has been checked in the last 30 days." />
    case 'readable':
      return <LinksView params={READABLE_PARAMS} emptyTitle="No readable pages yet" emptySubtitle="Fetch a page's details to make it readable." />
    case 'savedview':
      return <LinksView params={savedViewParams} emptyTitle="This view is empty" emptySubtitle="No link matches this view's query." />
    case 'duplicates':
      return <DuplicatesView />
    case 'resurface':
      return (
        <Suspense fallback={<div className="hub-loading"><LoadingSkeletons count={3} /></div>}>
          <ResurfaceView bucket={view.bucket} />
        </Suspense>
      )
    default:
      return <LinksView params={ALL_PARAMS} emptyTitle="Your universe is empty" emptySubtitle="Save your first link and watch it appear instantly." />
  }
}
