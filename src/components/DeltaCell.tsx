'use client'

import { formatNumeric } from '@/lib/format'
import { twMerge } from 'tailwind-merge'
import { cellClass, unitSpanClass } from './metric-cell-classes'

export function DeltaCell({
  value,
  ga,
  srLabel,
  unit,
  spaceBeforeUnit,
  valueClass,
  highlightClass,
}: {
  value: number
  ga: string
  srLabel: string
  unit?: string
  spaceBeforeUnit?: boolean
  valueClass: string
  highlightClass: string
}) {
  if (value === 0) {
    return (
      <div className={twMerge(cellClass, ga, highlightClass)}>
        <span className="sr-only">{srLabel}</span>
        <span className="primary-value opacity-50">steady</span>
      </div>
    )
  }
  return (
    <div className={twMerge(cellClass, ga, highlightClass)}>
      <span className="sr-only">{srLabel}</span>
      <span className={twMerge(valueClass, 'relative inline-block')}>
        &#43;{formatNumeric(value)}
        {unit != null && (
          <span className={unitSpanClass}>
            {spaceBeforeUnit ? ' ' : ''}
            {unit}
          </span>
        )}
      </span>
    </div>
  )
}
