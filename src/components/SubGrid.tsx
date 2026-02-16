'use client'

import { Icon } from '@/components/Icon'
import type { IconString } from '@/components/Icon/types'
import { formatNumeric } from '@/lib/format'
import { twJoin, twMerge } from 'tailwind-merge'

export function SubGrid({
  label,
  icon,
  caption,
  unit,
  current,
  high,
  low,
  primary = false,
  spaceBeforeUnit = false,
}: {
  label: string
  icon: IconString
  caption: string
  unit?: string
  current: string | number
  high: string | number
  low: string | number
  primary?: boolean
  spaceBeforeUnit?: boolean
}) {
  const valueClass = primary ? 'primary-value' : 'secondary-value'
  const unitSpanClass = twJoin('unit', 'text-[1em]')
  const cellClass = twJoin(
    'flex',
    'flex-col',
    'items-center',
    'justify-center',
    'px-6',
    'border-foreground/10',
    'gap-2',
  )

  return (
    <dl
      aria-label={label}
      className={twJoin(
        'border-foreground/10',
        'grid',
        'grid-cols-[1fr_2fr_2fr_2fr]',
        'border-b',
        'last:border-b-0',
      )}
    >
      <div className={cellClass}>
        <Icon name={icon} className="text-[5rem]" />
        <span className="text-sm">{caption}</span>
      </div>
      <div className={cellClass}>
        <span className="sr-only">Current</span>
        <span className={twMerge(valueClass, 'relative inline-block')}>
          {formatNumeric(current)}
          {unit && (
            <span className={unitSpanClass}>
              {spaceBeforeUnit ? ' ' : ''}
              {unit}
            </span>
          )}
        </span>
      </div>
      <div className={twMerge(cellClass, 'opacity-75')}>
        <span className="sr-only">High</span>
        <span className={twMerge(valueClass, 'relative inline-block')}>
          {formatNumeric(high)}
          {unit && (
            <span className={unitSpanClass}>
              {spaceBeforeUnit ? ' ' : ''}
              {unit}
            </span>
          )}
        </span>
      </div>
      <div className={twMerge(cellClass, 'opacity-50')}>
        <span className="sr-only">Low</span>
        <span className={twMerge(valueClass, 'relative inline-block')}>
          {formatNumeric(low)}
          {unit && (
            <span className={unitSpanClass}>
              {spaceBeforeUnit ? ' ' : ''}
              {unit}
            </span>
          )}
        </span>
      </div>
    </dl>
  )
}
