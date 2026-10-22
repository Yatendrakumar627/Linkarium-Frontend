import { motion } from 'framer-motion'
import LinkCard from './LinkCard'
import EmptyState from '../common/EmptyState'
import { IconLink } from '@tabler/icons-react'
import './LinkGrid.css'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 26 } },
}

export default function LinkGrid({ links, trashMode = false, emptyTitle = 'No links found', emptySubtitle }) {
  if (!links.length) {
    return <EmptyState icon={<IconLink size={34} />} title={emptyTitle} subtitle={emptySubtitle} />
  }

  return (
    <motion.div className="link-grid" variants={container} initial="hidden" animate="show">
      {links.map((link) => (
        <motion.div key={link._id} variants={item} layout className="link-grid-item">
          <LinkCard link={link} trashMode={trashMode} />
        </motion.div>
      ))}
    </motion.div>
  )
}