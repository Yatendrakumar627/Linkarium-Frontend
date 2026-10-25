import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notifications } from '@mantine/notifications'
import { IconChevronRight, IconDownload, IconLogout, IconUpload, IconUser, IconCrown } from '@tabler/icons-react'
import { linksApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { initialsOf, downloadBlob } from '../../utils'
import ImportLinksModal from '../ImportLinksModal'
import './ProfileDropdown.css'

const VIEWPORT_PAD = 12

export default function ProfileDropdown() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const openProfile = useUiStore((s) => s.openProfile)
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const firstItemRef = useRef(null)

  const close = useCallback(() => {
    setOpen(false)
    setImportOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        close()
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    // Reset then re-measure so the clamp is computed against natural position.
    panel.style.right = '0px'
    const rect = panel.getBoundingClientRect()
    const overflow = rect.right - (window.innerWidth - VIEWPORT_PAD)
    if (overflow > 0) panel.style.right = `${-Math.ceil(overflow)}px`
    const id = window.requestAnimationFrame(() => firstItemRef.current?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [open])

  const toggleImport = () => setImportOpen((v) => !v)

  const handleExport = async (format) => {
    try {
      const { blob, filename } = await linksApi.export(format)
      downloadBlob(blob, filename)
    } catch (err) {
      notifications.show({ message: err.message || 'Export failed', color: 'red' })
    }
  }

  const handleItem = (key) => {
    if (key === 'admin') {
      close()
      navigate('/admin')
      return
    }
    if (key === 'profile') {
      close()
      openProfile()
      return
    }
    if (key === 'import') {
      setImportModalOpen(true)
      close()
      return
    }
    if (key === 'export-xlsx' || key === 'export-csv') {
      const format = key === 'export-xlsx' ? 'xlsx' : 'csv'
      close()
      handleExport(format)
      return
    }
    if (key === 'logout') {
      close()
      logout().finally(() => {
        navigate('/auth')
      })
    }
  }

  const color = user?.avatarColor || 'var(--accent-gradient)'

  return (
    <div className="pd-root" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="pd-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        title={user?.name ? `${user.name}'s menu` : 'Account menu'}
      >
        <span className="pd-avatar" style={{ background: color }}>
          {initialsOf(user?.name)}
        </span>
      </button>

      {open && (
        <div className="pd-menu" ref={panelRef} role="menu" aria-label="Account">
          <div className="pd-header">
            <span className="pd-avatar" style={{ background: color }}>
              {initialsOf(user?.name)}
            </span>
            <div className="pd-user">
              <div className="pd-name">
                {user?.name}
                {user?.role === 'admin' && ' 👑'}
              </div>
              <div className="pd-email">{user?.email}</div>
            </div>
          </div>

          {user?.role === 'admin' && (
            <button
              type="button"
              className="pd-item"
              style={{ color: '#fbbf24', fontWeight: 600, background: 'rgba(245, 158, 11, 0.1)' }}
              role="menuitem"
              onClick={() => handleItem('admin')}
            >
              <IconCrown size={16} color="#fbbf24" />
              Master Admin Panel
            </button>
          )}

          <button
            type="button"
            ref={firstItemRef}
            className="pd-item"
            role="menuitem"
            onClick={() => handleItem('profile')}
          >
            <IconUser size={16} />
            Profile
          </button>

          <div className={`pd-submenu ${importOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="pd-item pd-sub-toggle"
              role="menuitem"
              onClick={toggleImport}
              aria-haspopup="menu"
              aria-expanded={importOpen}
            >
              <IconUpload size={16} />
              Import &amp; Export
              <IconChevronRight size={14} className="pd-chevron" />
            </button>
            {importOpen && (
              <div className="pd-sub" role="menu">
                <button
                  type="button"
                  className="pd-item"
                  role="menuitem"
                  onClick={() => handleItem('import')}
                >
                  <IconUpload size={15} />
                  Import
                </button>
                <button
                  type="button"
                  className="pd-item"
                  role="menuitem"
                  onClick={() => handleItem('export-xlsx')}
                >
                  <IconDownload size={15} />
                  Export as Excel
                </button>
                <button
                  type="button"
                  className="pd-item"
                  role="menuitem"
                  onClick={() => handleItem('export-csv')}
                >
                  <IconDownload size={15} />
                  Export as CSV
                </button>
              </div>
            )}
          </div>

          <div className="pd-divider" />

          <button
            type="button"
            className="pd-item danger"
            role="menuitem"
            onClick={() => handleItem('logout')}
          >
            <IconLogout size={16} />
            Log out
          </button>
        </div>
      )}

      <ImportLinksModal opened={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </div>
  )
}