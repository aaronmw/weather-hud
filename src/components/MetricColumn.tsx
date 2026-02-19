'use client'

import { Icon } from '@/components/Icon'
import type { IconString } from '@/components/Icon/types'
import { twMerge } from 'tailwind-merge'
import { DeltaCell } from './DeltaCell'
import { DirectionCell } from './DirectionCell'
import { cellClass } from './metric-cell-classes'
import { ValueCell } from './ValueCell'

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

type LowValue = string | number | { type: 'direction'; bearing: number | null }

type HighValue = string | number | { type: 'delta'; value: number }

function isDirectionLow(low: LowValue): low is { type: 'direction'; bearing: number | null } {
  return typeof low === 'object' && low != null && 'type' in low && low.type === 'direction'
}

function isDeltaHigh(high: HighValue): high is { type: 'delta'; value: number } {
  return typeof high === 'object' && high != null && 'type' in high && high.type === 'delta'
}

export function MetricColumn({
  column,
  icon,
  caption,
  unit,
  current,
  high,
  low,
  spaceBeforeUnit = false,
  highlighted = false,
  directionIcon,
}: {
  column: Column
  icon: IconString
  caption: string
  unit?: string
  current: string | number
  high: HighValue
  low: LowValue
  spaceBeforeUnit?: boolean
  highlighted?: boolean
  directionIcon?: IconString
}) {
  const valueClass = 'primary-value'
  const [gaHeader, gaCurrent, gaHigh, gaLow] = gridAreaMap[column]
  const highlightClass = highlighted ? 'highlighted' : ''
  const srLabels: [string, string, string] =
    column === 'wind' ? ['Current', 'Gust', 'Wind direction'] : ['Current', 'High', 'Low']

  return (
    <>
      <div className={twMerge(cellClass, gaHeader, highlightClass)}>
        <Icon
          name={icon}
          className="text-[5rem]"
        />
        <span className="text-sm">{caption}</span>
      </div>
      <ValueCell
        value={current}
        ga={gaCurrent}
        opacityClass=""
        srLabel={srLabels[0]}
        isLastRow={false}
        unit={unit}
        spaceBeforeUnit={spaceBeforeUnit}
        valueClass={valueClass}
        highlightClass={highlightClass}
      />
      {isDeltaHigh(high) ? (
        <DeltaCell
          value={high.value}
          ga={gaHigh}
          srLabel={srLabels[1]}
          unit={unit}
          spaceBeforeUnit={spaceBeforeUnit}
          valueClass={valueClass}
          highlightClass={highlightClass}
        />
      ) : (
        <ValueCell
          value={high}
          ga={gaHigh}
          opacityClass=""
          srLabel={srLabels[1]}
          isLastRow={false}
          unit={unit}
          spaceBeforeUnit={spaceBeforeUnit}
          valueClass={valueClass}
          highlightClass={highlightClass}
        />
      )}
      {isDirectionLow(low) ? (
        <DirectionCell
          bearing={low.bearing}
          ga={gaLow}
          srLabel={srLabels[2]}
          directionIcon={directionIcon}
          icon={icon}
          highlightClass={highlightClass}
        />
      ) : (
        <ValueCell
          value={low}
          ga={gaLow}
          opacityClass=""
          srLabel={srLabels[2]}
          isLastRow
          unit={unit}
          spaceBeforeUnit={spaceBeforeUnit}
          valueClass={valueClass}
          highlightClass={highlightClass}
        />
      )}
    </>
  )
}
