'use client'

import { Icon } from '@/components/Icon'
import type { IconString } from '@/components/Icon/types'
import { formatNumeric } from '@/lib/format'
import { twJoin, twMerge } from 'tailwind-merge'

const baseCellClass = twJoin(
  'flex',
  'flex-col',
  'items-center',
  'justify-center',
  'px-6',
  'border-foreground/35',
  'gap-2',
)

const cellClass = twJoin(baseCellClass, 'border-b', 'border-r')
const cellClassLastRow = twJoin(baseCellClass, 'border-r')

const unitSpanClass = twJoin('unit', 'text-[1em]')

type Column = 'condition' | 'wind' | 'uv'

const gridAreaMap: Record<Column, [string, string, string, string]> = {
  condition: [
    'ga-condition',
    'ga-condition-current',
    'ga-condition-high',
    'ga-condition-low',
  ],
  wind: ['ga-wind', 'ga-wind-current', 'ga-wind-high', 'ga-wind-low'],
  uv: ['ga-uv', 'ga-uv-current', 'ga-uv-high', 'ga-uv-low'],
}

export function MetricColumn({
  column,
  icon,
  caption,
  unit,
  current,
  high,
  low,
  primary = false,
  spaceBeforeUnit = false,
  inverted = false,
}: {
  column: Column
  icon: IconString
  caption: string
  unit?: string
  current: string | number
  high: string | number
  low: string | number
  primary?: boolean
  spaceBeforeUnit?: boolean
  inverted?: boolean
}) {
  const valueClass = primary ? 'primary-value' : 'primary-value'
  const [gaHeader, gaCurrent, gaHigh, gaLow] = gridAreaMap[column]

  const invertedClass = inverted ? 'inverted' : ''
  const valueCell = (
    value: string | number,
    ga: string,
    opacityClass: string,
    srLabel: string,
    isLastRow: boolean,
  ) => (
    <div
      className={twMerge(
        isLastRow ? cellClassLastRow : cellClass,
        ga,
        invertedClass,
      )}
    >
      <div className={opacityClass}>
        <span className="sr-only">{srLabel}</span>
        <span className={twMerge(valueClass, 'relative inline-block')}>
          {formatNumeric(value)}
          {unit != null && (
            <span className={unitSpanClass}>
              {spaceBeforeUnit ? ' ' : ''}
              {unit}
            </span>
          )}
        </span>
      </div>
    </div>
  )

  return (
    <>
      <div className={twMerge(cellClass, gaHeader, invertedClass)}>
        <Icon
          name={icon}
          className="text-[5rem]"
        />
        <span className="text-sm">{caption}</span>
      </div>
      {valueCell(current, gaCurrent, 'opacity-85', 'Current', false)}
      {valueCell(high, gaHigh, 'opacity-75', 'High', false)}
      {valueCell(low, gaLow, 'opacity-50', 'Low', true)}
    </>
  )
}
