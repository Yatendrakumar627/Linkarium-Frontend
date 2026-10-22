import { useState } from 'react'
import { notifications } from '@mantine/notifications'
import {
  IconArrowRight,
  IconFileSpreadsheet,
  IconFileTypeCsv,
  IconSparkles,
  IconUpload,
  IconShieldCheck,
} from '@tabler/icons-react'
import { useAuthStore } from '../../store/authStore'
import { useLinkStore } from '../../store/linkStore'
import { useUiStore } from '../../store/uiStore'
import { linksApi } from '../../api/endpoints'
import { timeAgo, downloadBlob } from '../../utils'
import ImportLinksModal from '../ImportLinksModal'

function greetingOf() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function buildSubtitle(summary) {
  if (!summary) return 'Synthesizing your knowledge universe…'
  const { totalLinks, favoriteLinks, totalCollections } = summary
  if (totalLinks === 0) return 'Your universe is waiting — save your first link to get started.'

  const linkWord = totalLinks === 1 ? 'link' : 'links'
  let text = `You have ${totalLinks.toLocaleString()} ${linkWord} curated`

  if (totalCollections > 0) {
    const colWord = totalCollections === 1 ? 'collection' : 'collections'
    text += ` across ${totalCollections.toLocaleString()} ${colWord}`
  } else {
    text += ' ready to be organized'
  }

  if (favoriteLinks > 0) {
    text += favoriteLinks === totalLinks
      ? ', all marked as priority favorites'
      : `, with ${favoriteLinks.toLocaleString()} bookmarked as favorites`
  }

  return `${text}.`
}

export default function WelcomeBanner({ recent = [] }) {
  const user = useAuthStore((s) => s.user)
  const summary = useLinkStore((s) => s.summary)
  const openEditor = useUiStore((s) => s.openEditor)
  const openTriage = useUiStore((s) => s.openTriage)

  const [importOpened, setImportOpened] = useState(false)

  const firstName = user?.name?.split(' ')[0] || user?.name || 'there'

  const dateLine = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  const latest = recent[0]

  const handleExport = async (format) => {
    try {
      const { blob, filename } = await linksApi.export(format)
      downloadBlob(blob, filename)
    } catch (err) {
      notifications.show({ message: err.message || 'Export failed', color: 'red' })
    }
  }

  return (
    <div className="dash-welcome-bento">
      <div className="dash-welcome-main">
        <div className="dash-beacon-badge">
          <span className="dash-beacon-dot" />
          <span className="dash-beacon-text">{dateLine}</span>
          <span className="dash-beacon-sep">·</span>
          <span className="dash-beacon-status">Linkarium Space</span>
        </div>

        <h2 className="dash-welcome-title">
          {greetingOf()}, <span className="dash-welcome-name">{firstName}</span>
        </h2>
        <p className="dash-welcome-sub">{buildSubtitle(summary)}</p>

        <div className="dash-pills-row">
          {summary?.uncategorizedLinks > 0 && (
            <div
              className="dash-triage-card"
              onClick={openTriage}
              role="button"
              tabIndex={0}
              title="Launch Smart Triage to organize bookmarks by domain"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openTriage()
                }
              }}
            >
              <div className="dash-triage-pill">
                <IconSparkles size={12} />
                <span>Smart Triage</span>
              </div>
              <span className="dash-triage-text">
                <strong>{summary.uncategorizedLinks}</strong> uncategorized · Auto-group
              </span>
              <IconArrowRight size={13} className="dash-triage-arrow" />
            </div>
          )}

          {latest && (
            <div 
              className="dash-latest-card" 
              onClick={() => openEditor(latest)}
              role="button"
              tabIndex={0}
              title="Click to inspect latest save"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openEditor(latest)
                }
              }}
            >
              <div className="dash-latest-pill">
                <IconSparkles size={12} />
                <span>Latest save</span>
              </div>
              <span className="dash-latest-title">{latest.title || latest.url}</span>
              <span className="dash-latest-time">{timeAgo(latest.createdAt)}</span>
              <IconArrowRight size={13} className="dash-latest-arrow" />
            </div>
          )}
        </div>
      </div>

      <div className="dash-welcome-side">
        <div className="dash-side-card">
          <div className="dash-side-header">
            <span className="dash-side-title">Quick Actions</span>
            <span className="dash-side-telemetry">
              <IconShieldCheck size={13} /> Cloud Active
            </span>
          </div>

          <div className="dash-side-actions">
            <button
              className="dash-action-btn dash-action-triage"
              onClick={openTriage}
              title="Smart Triage: auto-organize uncategorized links by domain"
            >
              <IconSparkles size={14} />
              <span>Triage</span>
            </button>
            <button
              className="dash-action-btn dash-action-import"
              onClick={() => setImportOpened(true)}
              title="Import links from HTML / bookmarks"
            >
              <IconUpload size={14} />
              <span>Import</span>
            </button>
            <button
              className="dash-action-btn dash-action-export"
              onClick={() => handleExport('xlsx')}
              title="Export links to Excel (.xlsx)"
            >
              <IconFileSpreadsheet size={14} />
              <span>Excel</span>
            </button>
            <button
              className="dash-action-btn dash-action-export"
              onClick={() => handleExport('csv')}
              title="Export links to CSV"
            >
              <IconFileTypeCsv size={14} />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      <ImportLinksModal opened={importOpened} onClose={() => setImportOpened(false)} />
    </div>
  )
}