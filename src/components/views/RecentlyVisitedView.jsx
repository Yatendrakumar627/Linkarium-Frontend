import { useEffect, useState } from 'react'
import { analyticsApi } from '../../api/endpoints'
import LinkGrid from '../links/LinkGrid'
import LoadingSkeletons from '../common/LoadingSkeletons'
import EmptyState from '../common/EmptyState'
import ErrorState from '../common/ErrorState'
import { IconHistory } from '@tabler/icons-react'
import './RecentlyVisitedView.css'

export default function RecentlyVisitedView() {
  const [state, setState] = useState({ status: 'loading', rows: null, error: '' })
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let mounted = true
    analyticsApi
      .recentlyVisited()
      .then((rows) => mounted && setState({ status: 'ready', rows, error: '' }))
      .catch((err) => mounted && setState({ status: 'error', rows: null, error: err.message }))
    return () => {
      mounted = false
    }
  }, [reload])

  const retry = () => {
    setState({ status: 'loading', rows: null, error: '' })
    setReload((r) => r + 1)
  }

  if (state.status === 'error') {
    return <ErrorState message={state.error} onRetry={retry} />
  }

  if (state.status !== 'ready') return <LoadingSkeletons />

  const links = state.rows.map((r) => r.link).filter(Boolean)

  if (!links.length) {
    return (
      <EmptyState
        icon={<IconHistory size={34} />}
        title="No visits yet"
        subtitle="Open a link from the cards and it will show up here."
      />
    )
  }

  return <LinkGrid links={links} />
}