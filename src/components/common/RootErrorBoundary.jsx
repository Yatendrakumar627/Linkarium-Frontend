import React, { Component } from 'react'
import { IconAlertTriangle, IconRefresh, IconArrowRight } from '@tabler/icons-react'
import './RootErrorBoundary.css'

export class RootErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      isChunkError: false,
    }
  }

  static getDerivedStateFromError(error) {
    const msg = error?.message || ''
    const isChunkError =
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('error loading dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      error?.name === 'ChunkLoadError'

    return {
      hasError: true,
      error,
      isChunkError,
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[RootErrorBoundary] Caught unhandled application error:', error, errorInfo)

    // If a chunk load failed (common when a new build is deployed),
    // automatically attempt ONE reload to get the latest assets.
    const isChunk =
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.name === 'ChunkLoadError'

    if (isChunk && typeof window !== 'undefined') {
      const lastRetry = sessionStorage.getItem('linkarium.chunkRetry')
      const now = Date.now()
      // Only auto-reload if we haven't retried in the last 15 seconds
      if (!lastRetry || now - Number(lastRetry) > 15000) {
        sessionStorage.setItem('linkarium.chunkRetry', String(now))
        window.location.reload()
      }
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('linkarium.chunkRetry')
      window.location.reload()
    }
  }

  handleReset = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('linkarium.chunkRetry')
      // Clear token and caches if possible, then go to auth
      try {
        localStorage.removeItem('linkarium.sidebarCollapsed')
      } catch {
        // ignore
      }
      window.location.href = '/auth'
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="root-error-boundary">
          <div className="root-error-card">
            <div className="root-error-icon-wrap">
              <IconAlertTriangle size={36} stroke={1.8} />
            </div>
            <h2 className="root-error-title">
              {this.state.isChunkError ? 'Update Available' : 'Something went wrong'}
            </h2>
            <p className="root-error-desc">
              {this.state.isChunkError
                ? 'A new version of Linkarium was deployed or connection was interrupted. Please refresh to continue.'
                : 'The application encountered an unexpected error while rendering. Reloading should restore your session.'}
            </p>

            <div className="root-error-actions">
              <button
                type="button"
                className="root-error-btn root-error-btn-primary"
                onClick={this.handleReload}
              >
                <IconRefresh size={16} />
                <span>Refresh Page</span>
              </button>

              <button
                type="button"
                className="root-error-btn root-error-btn-secondary"
                onClick={this.handleReset}
              >
                <span>Go to Sign In</span>
                <IconArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default RootErrorBoundary
