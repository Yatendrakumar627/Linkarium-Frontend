import { useRef } from 'react'
import './StatCard.css'

const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

export default function StatCard({ icon: Icon, label, value, tint = 'violet', loading = false, onClick }) {
  const ref = useRef(null)

  const handleMove = (e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    el.style.setProperty('--rx', `${clamp((0.5 - y) * -12, -6, 6).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${clamp((x - 0.5) * 16, -8, 8).toFixed(2)}deg`)
    el.style.setProperty('--glow-x', `${(x * 100).toFixed(2)}%`)
    el.style.setProperty('--glow-y', `${(y * 100).toFixed(2)}%`)
  }

  const handleLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.removeProperty('--rx')
    el.style.removeProperty('--ry')
    el.style.removeProperty('--glow-x')
    el.style.removeProperty('--glow-y')
  }

  return (
    <div
      className={`stat-tile${onClick ? ' clickable' : ''}`}
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      <div className="stat-tile-inner">
        <div className={`stat-icon tint-${tint}`}>
          <Icon size={18} stroke={1.9} />
        </div>
        <div className="stat-tile-body">
          {loading ? (
            <div className="stat-value skeleton" />
          ) : (
            <div className="stat-value">{value.toLocaleString()}</div>
          )}
          <div className="stat-label">{label}</div>
        </div>
      </div>
    </div>
  )
}