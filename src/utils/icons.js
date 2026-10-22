import {
  IconBookmark,
  IconStar,
  IconHeart,
  IconFolder,
  IconFolderOpen,
  IconTag,
  IconTags,
  IconClock,
  IconHistory,
  IconSparkles,
  IconWand,
  IconFlame,
  IconRocket,
  IconBulb,
  IconBook,
  IconBook2,
  IconBookmarkFilled,
  IconArchive,
  IconArchiveOff,
  IconAlertTriangle,
  IconShieldCheck,
  IconCode,
  IconCoffee,
  IconNews,
  IconMusic,
  IconVideo,
  IconPhoto,
  IconDeviceLaptop,
  IconWorld,
  IconMap,
  IconCalendar,
  IconList,
  IconGridDots,
  IconFilter,
  IconRepeat,
  IconSun,
  IconMoon,
} from '@tabler/icons-react'

// A small, explicit map from the icon names stored on a saved view to the
// actual components.
//
// The names are stored as strings in the database, so they cannot be turned
// into components dynamically without a lookup like this — and a lookup is
// also safer: an unknown name must fall back to a default instead of
// crashing the sidebar.
const ICON_MAP = {
  IconBookmark,
  IconStar,
  IconHeart,
  IconFolder,
  IconFolderOpen,
  IconTag,
  IconTags,
  IconClock,
  IconHistory,
  IconSparkles,
  IconWand,
  IconFlame,
  IconRocket,
  IconBulb,
  IconBook,
  IconBook2,
  IconBookmarkFilled,
  IconArchive,
  IconArchiveOff,
  IconAlertTriangle,
  IconShieldCheck,
  IconCode,
  IconCoffee,
  IconNews,
  IconMusic,
  IconVideo,
  IconPhoto,
  IconDeviceLaptop,
  IconWorld,
  IconMap,
  IconCalendar,
  IconList,
  IconGridDots,
  IconFilter,
  IconRepeat,
  IconSun,
  IconMoon,
}

/** The component for a stored icon name, or a sensible default. */
export function iconFor(name) {
  return ICON_MAP[name] || IconBookmark
}

/** The names that can be picked in the icon picker. */
export const ICON_NAMES = Object.keys(ICON_MAP)
