import { IconKeyboard } from '@tabler/icons-react'
import { useUiStore } from '../../store/uiStore'
import {
  AppModal,
  AppModalBody,
  AppModalHeader,
} from './ModalShell'
import './ShortcutsModal.css'

const SHORTCUT_GROUPS = [
  {
    title: 'Global & Navigation',
    shortcuts: [
      { keys: ['⌘', 'K'], altKeys: ['Ctrl', 'K'], label: 'Open Command Palette & fast search' },
      { keys: ['/'], label: 'Focus search bar in top navigation' },
      { keys: ['V'], label: 'Toggle 3D Galaxy Universe / 2D List view' },
      { keys: ['?'], label: 'Open this keyboard shortcuts cheat sheet' },
      { keys: ['Esc'], label: 'Close open modal, palette, or exit 3D view' },
    ],
  },
  {
    title: 'Productivity & Triage',
    shortcuts: [
      { keys: ['N'], label: 'Create and save a new bookmark' },
      { keys: ['T'], label: 'Launch Smart Triage & Domain Auto-Organizer' },
      { keys: ['↵'], label: 'Select or launch highlighted command in palette' },
      { keys: ['↑', '↓'], label: 'Navigate up and down in list or command palette' },
    ],
  },
  {
    title: '3D Galaxy Universe Controls',
    shortcuts: [
      { keys: ['Left Click + Drag'], label: 'Rotate celestial camera orbit' },
      { keys: ['Right Click + Drag'], label: 'Pan camera through space' },
      { keys: ['Scroll Wheel'], label: 'Zoom into orbital tiers or cluster cores' },
    ],
  },
]

export default function ShortcutsModal() {
  const isOpen = useUiStore((s) => s.shortcutsOpen)
  const closeShortcuts = useUiStore((s) => s.closeShortcuts)

  return (
    <AppModal
      opened={isOpen}
      onClose={closeShortcuts}
      size="md"
      className="shortcuts-modal-root"
    >
      <AppModalHeader
        icon={<IconKeyboard size={20} />}
        title="Keyboard Shortcuts"
        subtitle="Power-user navigation for Linkarium"
        onClose={closeShortcuts}
      />

      <AppModalBody>
        <div className="shortcuts-container">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="shortcuts-group">
              <h4 className="shortcuts-group-title">{group.title}</h4>
              <div className="shortcuts-list">
                {group.shortcuts.map((sc, i) => (
                  <div key={i} className="shortcuts-row">
                    <span className="shortcuts-label">{sc.label}</span>
                    <div className="shortcuts-keys">
                      {sc.keys.map((k, j) => (
                        <kbd key={j} className="shortcuts-kbd">
                          {k}
                        </kbd>
                      ))}
                      {sc.altKeys && (
                        <>
                          <span className="shortcuts-or">/</span>
                          {sc.altKeys.map((k, j) => (
                            <kbd key={j} className="shortcuts-kbd">
                              {k}
                            </kbd>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AppModalBody>
    </AppModal>
  )
}
