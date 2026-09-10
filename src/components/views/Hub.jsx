import { lazy, Suspense } from 'react'
import { useUiStore } from '../../store/uiStore'
import LinksView from './LinksView'
import RecentlyVisitedView from './RecentlyVisitedView'
import TrashView from './TrashView'
import Dashboard from './Dashboard'
import LoadingSkeletons from '../common/LoadingSkeletons'
import './Hub.css'

const AnalyticsView = lazy(() => import('./AnalyticsView'))

export default function Hub() {
  const view = useUiStore((s) => s.view)

  switch (view.type) {
    case 'dashboard':
      return <Dashboard />
    case 'favorites':
      return <LinksView params={{ favorite: 'true' }} emptyTitle="No favorites yet" emptySubtitle="Tap the star on any link to pin it here." />
    case 'collection':
      return <LinksView params={{ collection: view.id }} emptyTitle="This collection is empty" emptySubtitle="Add links to it from the New Link button." />
    case 'tag':
      return <LinksView params={{ tag: view.id }} emptyTitle="No links with this tag" emptySubtitle="Tag links when you save or edit them." />
    case 'recentadded':
      return <LinksView params={{ sort: 'newest' }} fixedLimit={12} emptyTitle="Nothing saved yet" emptySubtitle="Your newest links will appear here." />
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
    default:
      return <LinksView params={{}} emptyTitle="Your universe is empty" emptySubtitle="Save your first link and watch it appear instantly." />
  }
}