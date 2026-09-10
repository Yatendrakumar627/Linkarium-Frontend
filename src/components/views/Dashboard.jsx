import LinksView from './LinksView'
import './Dashboard.css'

export default function Dashboard() {
  return (
    <div className="fade-up dashboard-wrap">
      <LinksView
        params={{}}
        emptyTitle="Your universe is empty"
        emptySubtitle="Save your first link and watch it appear instantly."
      />
    </div>
  )
}