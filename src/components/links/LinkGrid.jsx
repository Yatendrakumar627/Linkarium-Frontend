import LinkCard from './LinkCard'
import EmptyState from '../common/EmptyState'
import { IconLink } from '@tabler/icons-react'
import './LinkGrid.css'

export default function LinkGrid({ links, trashMode = false, emptyTitle = 'No links found', emptySubtitle }) {
  if (!links.length) {
    return <EmptyState icon={<IconLink size={34} />} title={emptyTitle} subtitle={emptySubtitle} />
  }

  return (
    <div className="link-grid">
      {links.map((link, index) => (
        <div
          key={link._id}
          className="link-grid-item"
          // CSS handles the stagger, so framer-motion no longer has to be part
          // of the eager boot bundle (it is still lazy-loaded by the 3D view).
          style={{ '--link-index': index }}
        >
          <LinkCard link={link} trashMode={trashMode} />
        </div>
      ))}
    </div>
  )
}
