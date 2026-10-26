import { Pill } from '@mantine/core'
import { tagToColor } from '../../utils/colorUtils'

/**
 * Mantine ships the tags input's clear button and the per-tag remove button
 * as `aria-hidden` + `tabindex="-1"`. That deliberately hides a mouse-only
 * affordance from assistive tech, but it also means a keyboard or
 * screen-reader user has no way to drop a single tag — Backspace is the only
 * route and it cannot address one specific pill.
 *
 * These helpers keep Mantine's own markup and visuals but give every control
 * an accessible name and put it back in the tab order.
 */

/** Renders one tag pill with a named, focusable remove button. */
export function renderAccessibleTagPill({ value, onRemove, disabled, reorderProps }) {
  const color = tagToColor(value)
  return (
    <Pill
      withRemoveButton={!disabled}
      onRemove={onRemove}
      disabled={disabled}
      {...reorderProps}
      style={{
        borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
        background: `color-mix(in srgb, ${color} 12%, rgba(14, 18, 26, 0.88))`,
        color: '#e2e8f0',
      }}
      removeButtonProps={{
        'aria-label': `Remove tag ${value}`,
        'aria-hidden': false,
        tabIndex: 0,
      }}
    >
      <span style={{ color, fontWeight: 700, marginRight: 2 }}>#</span>
      {value}
    </Pill>
  )
}

/** Props for the "clear every tag" button. */
export const accessibleClearButtonProps = {
  'aria-label': 'Clear all tags',
  'aria-hidden': false,
  tabIndex: 0,
}
