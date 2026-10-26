import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'

/**
 * Custom hook to read the currently active color classification mode.
 * Priority:
 * 1. UI temporary override (e.g. quick selector or live preview in settings modal)
 * 2. User persisted preference stored in user.preferences.colorMode
 * 3. Default fallback: 'collection'
 *
 * @returns {'tag' | 'collection' | 'blend' | 'brand' | 'own'}
 */
export function useColorMode() {
  const persisted = useAuthStore((s) => s.user?.preferences?.colorMode ?? 'collection')
  const override = useUiStore((s) => s.colorModeOverride)
  const mode = override ?? persisted
  if (mode === 'collection-first') return 'collection'
  if (mode === 'tag-first') return 'tag'
  return mode
}
