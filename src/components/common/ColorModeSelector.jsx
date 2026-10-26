import { Menu, Tooltip } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconPalette,
  IconCheck,
  IconTag,
  IconFolder,
  IconSparkles,
  IconWorld,
  IconDiamond,
} from '@tabler/icons-react'
import { useColorMode } from '../../hooks/useColorMode'
import { useUiStore } from '../../store/uiStore'
import { useAuthStore } from '../../store/authStore'
import { userApi } from '../../api/endpoints'
import { COLOR_MODES } from '../../utils/colorUtils'
import './ColorModeSelector.css'

const MODE_ICONS = {
  tag: IconTag,
  collection: IconFolder,
  blend: IconSparkles,
  brand: IconWorld,
  own: IconDiamond,
}

export default function ColorModeSelector() {
  const activeMode = useColorMode()
  const setColorModeOverride = useUiStore((s) => s.setColorModeOverride)
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const handleSelectMode = async (modeId) => {
    // 1. Instant optimistic update so whole library transitions immediately
    setColorModeOverride(modeId)

    // 2. Persist to backend preferences
    try {
      const data = await userApi.preferences({ colorMode: modeId })
      if (data?.user) {
        setUser(data.user)
      }
      const modeObj = COLOR_MODES.find((m) => m.id === modeId)
      notifications.show({
        id: 'color-mode-switch',
        message: `Color Mode: ${modeObj?.label || modeId}`,
        color: 'cyan',
        autoClose: 1800,
      })
    } catch (err) {
      // Revert on error
      setColorModeOverride(null)
      notifications.show({
        message: err.message || 'Failed to update color mode',
        color: 'red',
      })
    }
  }

  const currentModeObj = COLOR_MODES.find((m) => m.id === activeMode) || COLOR_MODES[0]
  const ActiveIcon = MODE_ICONS[currentModeObj.id] || IconPalette

  return (
    <Menu
      position="bottom-end"
      offset={6}
      shadow="xl"
      withinPortal
      closeOnItemClick
      transitionProps={{ duration: 120, transition: 'fade' }}
    >
      <Menu.Target>
        <Tooltip
          label={`Color mode: ${currentModeObj.label}`}
          withArrow
          position="bottom"
          openDelay={300}
        >
          <button
            type="button"
            className="action-btn color-mode-btn"
            aria-label="Color classification mode"
          >
            <IconPalette size={16} className="color-mode-btn-icon" />
            <span className="color-mode-btn-label">{currentModeObj.label}</span>
          </button>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown className="color-mode-menu-dropdown">
        <Menu.Label className="color-mode-menu-label">
          Color Classification Mode
        </Menu.Label>

        {COLOR_MODES.map((mode) => {
          const isSelected = activeMode === mode.id
          const ItemIcon = MODE_ICONS[mode.id] || IconPalette
          return (
            <Menu.Item
              key={mode.id}
              className={`color-mode-menu-item ${isSelected ? 'active' : ''}`}
              leftSection={<ItemIcon size={15} className={`mode-item-icon mode-${mode.id}`} />}
              rightSection={isSelected ? <IconCheck size={14} stroke={2.5} color="#00e5ff" /> : null}
              onClick={() => handleSelectMode(mode.id)}
            >
              <div className="color-mode-item-content">
                <span className="color-mode-item-title">{mode.label}</span>
                <span className="color-mode-item-desc">{mode.shortDesc}</span>
              </div>
            </Menu.Item>
          )
        })}
      </Menu.Dropdown>
    </Menu>
  )
}
