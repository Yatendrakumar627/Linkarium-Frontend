import './LoadingSkeletons.css'

export default function LoadingSkeletons({ count = 6 }) {
  return (
    <div className="link-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card loading-skeleton-card">
          <div className="skeleton-avatar" />
          <div className="skeleton-lines">
            <div className="skeleton-line skeleton-line-title" />
            <div className="skeleton-line skeleton-line-meta" />
          </div>
        </div>
      ))}
    </div>
  )
}