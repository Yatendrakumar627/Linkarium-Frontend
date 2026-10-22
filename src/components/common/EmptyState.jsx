import './EmptyState.css'

export default function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="empty-wrap fade-up">
      <div>
        <div className="empty-orb">{icon}</div>
        <div className="empty-state-title">{title}</div>
        {subtitle && (
          <div className="empty-state-subtitle">{subtitle}</div>
        )}
      </div>
    </div>
  )
}