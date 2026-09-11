import { useState } from 'react'
import { notifications } from '@mantine/notifications'
import {
  IconArrowRight,
  IconFileSpreadsheet,
  IconFileTypeCsv,
  IconSparkles,
  IconUpload,
} from '@tabler/icons-react'
import { useAuthStore } from '../../store/authStore'
import { useLinkStore } from '../../store/linkStore'
import { linksApi } from '../../api/endpoints'
import { timeAgo } from '../../utils'
import ImportLinksModal from '../ImportLinksModal'

function greetingOf() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function buildSubtitle(summary) {
  if (!summary) return 'Loading your universe…'
  const { totalLinks, favoriteLinks, totalCollections } = summary
  if (totalLinks === 0) return 'Your universe is empty — save your first link to get started.'

  const linkWord = totalLinks === 1 ? 'link' : 'links'
  let text = `You've saved ${totalLinks.toLocaleString()} ${linkWord}`

  if (totalCollections > 0) {
    const collectionWord = totalCollections === 1 ? 'collection' : 'collections'
    text += ` across ${totalCollections.toLocaleString()} ${collectionWord}`
  } else {
    text += ' with no collections yet'
  }

  if (favoriteLinks > 0) {
    text += favoriteLinks === totalLinks
      ? ', all saved as favorites'
      : `, ${favoriteLinks.toLocaleString()} favorite${favoriteLinks === 1 ? '' : 's'}`
  }

  return `${text}.`
}

export default function WelcomeBanner({ recent = [] }) {
  const user = useAuthStore((s) => s.user)
  const summary = useLinkStore((s) => s.summary)

  const [importOpened, setImportOpened] = useState(false)

  const firstName = user?.name?.split(' ')[0] || user?.name || 'there'

  const dateLine = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const latest = recent[0]

  const handleExport = async (format) => {
    try {
      const { blob, filename } = await linksApi.export(format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      notifications.show({ message: err.message || 'Export failed', color: 'red' })
    }
  }

  return (
    <div className="dash-welcome">
      <div className="dash-welcome-top">
        <span className="dash-welcome-date">{dateLine}</span>

        <div className="dash-welcome-actions">
          <button
            className="dash-action-btn"
            onClick={() => setImportOpened(true)}
            title="Import links from a file"
          >
            <IconUpload size={16} />
            <span className="dash-action-label">Import</span>
          </button>
          <button
            className="dash-action-btn dash-action-xlsx"
            onClick={() => handleExport('xlsx')}
            title="Export as Excel"
          >
            <IconFileSpreadsheet size={16} />
            <span>Excel</span>
          </button>
          <button
            className="dash-action-btn dash-action-csv"
            onClick={() => handleExport('csv')}
            title="Export as CSV"
          >
            <IconFileTypeCsv size={16} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      <div className="dash-welcome-copy">
        <h2 className="dash-welcome-title">
          {greetingOf()}, <span className="dash-welcome-name">{firstName}</span>
          <IconArrowRight className="dash-welcome-arrow" size={20} />
        </h2>
        <p className="dash-welcome-sub">{buildSubtitle(summary)}</p>

        {latest && (
          <div className="dash-welcome-latest" title="Latest save">
            <IconSparkles size={13} />
            <span>Latest save:</span>
            <strong>{latest.title}</strong>
            <span className="dash-welcome-latest-time">{timeAgo(latest.createdAt)}</span>
          </div>
        )}
      </div>

      <ImportLinksModal opened={importOpened} onClose={() => setImportOpened(false)} />
    </div>
  )
}