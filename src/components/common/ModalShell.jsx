import { Button, Modal } from '@mantine/core'
import { IconSearch, IconX } from '@tabler/icons-react'

/**
 * The house style for every dialog in Linkarium.
 *
 * Before this existed each dialog hand-rolled its own shell, which meant the
 * same obsidian panel, header and footer were re-implemented a dozen times and
 * slowly drifted apart. These primitives are the single source of truth:
 * a dialog supplies its content and its tone, and inherits the rest.
 *
 * Tone drives the accent colour of the badge and anything that references it:
 *   'default'  neutral, cyan
 *   'accent'   amethyst
 *   'danger'   destructive, red
 *   'success'  positive, green
 *   'warning'  caution, amber
 */

export function AppModal({
  opened,
  onClose,
  size = 'md',
  tone = 'default',
  children,
  className = '',
  containerProps = {},
  ...rest
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={null}
      centered
      size={size}
      withCloseButton={false}
      className={`app-modal-root ${className}`.trim()}
      classNames={{ content: 'app-modal-content', body: 'app-modal-body' }}
      {...rest}
    >
      <div className={`app-modal-container tone-${tone}`} {...containerProps}>
        {children}
      </div>
    </Modal>
  )
}

export function AppModalHeader({ icon, title, subtitle, onClose, children }) {
  return (
    <div className="app-modal-header">
      <div className="app-modal-title-group">
        {icon ? <div className="app-modal-badge">{icon}</div> : null}
        <div className="app-modal-heading">
          <div className="app-modal-title">{title}</div>
          {subtitle ? <div className="app-modal-subtitle">{subtitle}</div> : null}
        </div>
      </div>
      {children}
      {onClose ? (
        <button
          type="button"
          className="action-btn app-modal-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <IconX size={18} />
        </button>
      ) : null}
    </div>
  )
}

export function AppModalBody({ children, className = '' }) {
  return <div className={`app-modal-body-area ${className}`.trim()}>{children}</div>
}

export function AppModalSection({ children, label, action, className = '' }) {
  return (
    <div className={`app-modal-section ${className}`.trim()}>
      {label || action ? (
        <div className="app-modal-section-label">
          {label}
          {action ? <span style={{ marginLeft: 'auto' }}>{action}</span> : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}

export function AppModalFooter({ children, meta, lead }) {
  return (
    <div className="app-modal-footer">
      {lead ? <div className="app-modal-footer-lead">{lead}</div> : null}
      {meta ? <div className="app-modal-footer-meta">{meta}</div> : null}
      <div className="app-modal-footer-actions">{children}</div>
    </div>
  )
}

export function AppModalField({ label, hint, error, htmlFor, children }) {
  return (
    <div className="app-modal-field">
      {label ? (
        <label className="app-modal-label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <div className="app-modal-hint" style={{ color: '#ff8787' }}>
          {error}
        </div>
      ) : hint ? (
        <div className="app-modal-hint">{hint}</div>
      ) : null}
    </div>
  )
}

export function AppModalSearch({ value, onChange, placeholder = 'Search…', autoFocus }) {
  return (
    <div className="app-modal-search">
      <IconSearch size={15} className="app-modal-search-icon" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      {value ? (
        <button
          type="button"
          className="app-modal-search-clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <IconX size={13} />
        </button>
      ) : null}
    </div>
  )
}

export function AppModalNote({ icon, tone = 'info', children }) {
  return (
    <div className={`app-modal-note is-${tone}`}>
      {icon}
      <div>{children}</div>
    </div>
  )
}

/**
 * A themed button. Mantine's `Button` is kept for the `loading` state and
 * focus handling, but the surface comes from the design system.
 */
export function AppButton({
  variant = 'primary',
  size,
  loading,
  children,
  className = '',
  ...rest
}) {
  const cls = [
    'app-btn',
    variant === 'primary'
      ? 'app-btn-primary'
      : variant === 'danger'
        ? 'app-btn-danger'
        : variant === 'outline'
          ? 'app-btn-outline'
          : 'app-btn-subtle',
    size === 'sm' ? 'app-btn-sm' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  // Mantine's own `variant`/`size` props are deliberately not forwarded: the
  // design system owns the surface, and Mantine resolves those through inline
  // custom properties that would fight the theme.
  return (
    <Button className={cls} loading={loading} {...rest}>
      {children}
    </Button>
  )
}
