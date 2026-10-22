import { useId } from 'react'
import { AreaChart } from '@mantine/charts'

// Matches the app accent palette (see styles/base.css -> --accent-gradient).
const GRADIENT_FROM = '#8b5cf6'
const GRADIENT_TO = '#22d3ee'

const DEFAULT_SERIES = [{ name: 'visits', color: 'violet.5' }]

/**
 * Area chart filled with the violet -> cyan accent gradient.
 *
 * Mantine v9's AreaChart has no `gradientStopsFrom`/`gradientStopsTo` props
 * (those belong to LineChart) and `type="gradient"` is not a valid AreaChart
 * type. Passing them made React warn about unknown DOM props and, because the
 * type was no longer "default", silently disabled the gradient entirely.
 * The gradient is therefore injected through `areaProps` plus our own <defs>
 * entry, which is the supported way to customise the area fill.
 */
export default function GradientAreaChart({
  data,
  dataKey = 'day',
  series = DEFAULT_SERIES,
  ...rest
}) {
  // useId() keeps the gradient id unique per mounted chart; strip the
  // characters that are not valid in an SVG id/url reference.
  const rawId = useId()
  const gradientId = `visit-gradient-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <AreaChart
      data={data}
      dataKey={dataKey}
      series={series}
      curveType="natural"
      withDots={false}
      withGradient={false}
      tickLine="none"
      {...rest}
      areaProps={{ fill: `url(#${gradientId})` }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GRADIENT_FROM} stopOpacity={0.5} />
          <stop offset="100%" stopColor={GRADIENT_TO} stopOpacity={0.05} />
        </linearGradient>
      </defs>
    </AreaChart>
  )
}
