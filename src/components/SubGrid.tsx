'use client'

import { twJoin, twMerge } from 'tailwind-merge'

function withUnit(label: string, unit?: string) {
  return unit ? `${label} (${unit})` : label
}

export function SubGrid({
  label,
  unit,
  current,
  high,
  low,
}: {
  label: string
  unit?: string
  current: string | number
  high: string | number
  low: string | number
}) {
  const cellClass = twJoin(
    'border-foreground/10',
    'flex',
    'flex-col',
    'items-center',
    'justify-center',
    'px-6',
    'py-4',
  )

  return (
    <dl
      className={twJoin(
        'border-foreground/10 grid grid-cols-3 border-b last:border-b-0',
      )}
    >
      <div className={twMerge(cellClass, 'opacity-50')}>
        <span className="label">Low</span>
        <span className="secondary-value">{low}</span>
      </div>
      <div className={twMerge(cellClass, 'opacity-75')}>
        <span className="label">High</span>
        <span className="secondary-value">{high}</span>
      </div>
      <div className={cellClass}>
        <span className="label">{withUnit(label, unit)}</span>
        <span className="primary-value">{current}</span>
      </div>
    </dl>
  )
}
