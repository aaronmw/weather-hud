'use client'

import { formatNumeric } from '@/lib/format'
import { twMerge } from 'tailwind-merge'
import { cellClass, cellClassLastRow, unitSpanClass } from './metric-cell-classes'

export function ValueCell({
  value,
  ga,
  opacityClass,
  srLabel,
  isLastRow,
  unit,
  spaceBeforeUnit,
  valueClass,
  highlightClass,
}: {
  value: string | number
  ga: string
  opacityClass: string
  srLabel: string
  isLastRow: boolean
  unit?: string
  spaceBeforeUnit?: boolean
  valueClass: string
  highlightClass: string
}) {
  return (
    <div
      className={twMerge(
        isLastRow ? cellClassLastRow : cellClass,
        ga,
        highlightClass,
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
}
