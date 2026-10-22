import { Fragment } from 'react'
import { Menu } from '@mantine/core'
import { IconCheck, IconFilter } from '@tabler/icons-react'
import { useUiStore } from '../../store/uiStore'
import { useLinkStore } from '../../store/linkStore'
import { hasOperator, toggleOperator } from '../../utils/searchQuery'

// Quick filters that append (or remove) a query operator without typing.
// They are grouped so the menu stays readable as the list grows.
const FLAG_GROUPS = [
  {
    label: 'Filters',
    flags: [
      { label: 'Favorites only', operator: 'is:favorite' },
      { label: 'Untagged', operator: 'is:untagged' },
      { label: 'No collection', operator: 'is:uncategorized' },
      { label: 'Never visited', operator: 'is:never-visited' },
      { label: 'Added this week', operator: 'after:7d' },
      { label: 'Added this month', operator: 'after:30d' },
    ],
  },
  {
    label: 'Link health',
    flags: [
      { label: 'Broken links', operator: 'is:broken' },
      { label: 'Healthy links', operator: 'is:healthy' },
      { label: 'Stale links', operator: 'is:stale' },
      { label: 'Archived links', operator: 'is:archived' },
      { label: 'Merged away', operator: 'is:duplicate' },
    ],
  },
  {
    label: 'Content',
    flags: [
      { label: 'Has a note', operator: 'is:noted' },
      { label: 'Has a preview image', operator: 'is:with-og' },
      { label: 'Readable pages', operator: 'is:readable' },
    ],
  },
]

export default function SearchFilters() {
  const search = useUiStore((s) => s.search)
  const setSearch = useUiStore((s) => s.setSearch)
  const tags = useLinkStore((s) => s.tags)
  const collections = useLinkStore((s) => s.collections)

  const toggle = (operator) => setSearch(toggleOperator(search, operator))

  return (
    <Menu shadow="md" width={230} position="bottom-start" offset={6}>
      <Menu.Target>
        <button
          type="button"
          className="action-btn search-filter-btn"
          aria-label="Search filters"
          title="Search filters"
        >
          <IconFilter size={16} />
        </button>
      </Menu.Target>

      <Menu.Dropdown>
        {FLAG_GROUPS.map((group, index) => (
          <Fragment key={group.label}>
            {index > 0 && <Menu.Divider />}
            <Menu.Label>{group.label}</Menu.Label>
            {group.flags.map((flag) => {
              const active = hasOperator(search, flag.operator)
              return (
                <Menu.Item
                  key={flag.operator}
                  onClick={() => toggle(flag.operator)}
                  leftSection={
                    <span className={`filter-check${active ? ' is-active' : ''}`}>
                      {active ? <IconCheck size={14} /> : null}
                    </span>
                  }
                >
                  {flag.label}
                </Menu.Item>
              )
            })}
          </Fragment>
        ))}

        {collections.length > 0 && (
          <>
            <Menu.Divider />
            <Menu.Label>Collections</Menu.Label>
            {collections.slice(0, 8).map((collection) => {
              const operator = `collection:${collection.name}`
              const active = hasOperator(search, operator)
              return (
                <Menu.Item
                  key={collection.id || collection._id}
                  onClick={() => toggle(operator)}
                  leftSection={
                    <span className={`filter-check${active ? ' is-active' : ''}`}>
                      {active ? <IconCheck size={14} /> : null}
                    </span>
                  }
                >
                  {collection.name}
                </Menu.Item>
              )
            })}
          </>
        )}

        {tags.length > 0 && (
          <>
            <Menu.Divider />
            <Menu.Label>Tags</Menu.Label>
            {tags.slice(0, 10).map((tag) => {
              const operator = `tag:${tag.tag}`
              const active = hasOperator(search, operator)
              return (
                <Menu.Item
                  key={tag.tag}
                  onClick={() => toggle(operator)}
                  leftSection={
                    <span className={`filter-check${active ? ' is-active' : ''}`}>
                      {active ? <IconCheck size={14} /> : null}
                    </span>
                  }
                >
                  #{tag.tag}
                </Menu.Item>
              )
            })}
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  )
}
