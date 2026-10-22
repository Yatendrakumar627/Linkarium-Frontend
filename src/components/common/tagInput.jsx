import { Pill } from '@mantine/core'

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
  return (
    <Pill
      withRemoveButton={!disabled}
      onRemove={onRemove}
      disabled={disabled}
      {...reorderProps}
      removeButtonProps={{
        'aria-label': `Remove tag ${value}`,
        'aria-hidden': false,
        tabIndex: 0,
      }}
    >
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
