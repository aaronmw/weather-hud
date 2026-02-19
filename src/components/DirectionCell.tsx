'use client'

import { Icon } from '@/components/Icon'
import type { IconString } from '@/components/Icon/types'
import { twMerge } from 'tailwind-merge'
import { cellClassLastRow } from './metric-cell-classes'

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

function bearingToDirection(bearing: number): string {
  return COMPASS[Math.round(bearing / 45) % 8]
}

export function DirectionCell({
  bearing,
  ga,
  srLabel,
  directionIcon,
  icon,
  highlightClass,
}: {
  bearing: number | null
  ga: string
  srLabel: string
  directionIcon?: IconString
  icon: IconString
  highlightClass: string
}) {
  return (
    <div className={twMerge(cellClassLastRow, ga, highlightClass)}>
      <span className="sr-only">{srLabel}</span>
      <div className="flex items-center gap-3">
        <span
          className="inline-block"
          style={bearing != null ? { transform: `rotate(${bearing}deg)` } : undefined}
        >
          <Icon
            name={directionIcon ?? icon}
            className="text-[4rem]"
          />
        </span>
        {bearing != null && (
          <span className="primary-value">{bearingToDirection(bearing)}</span>
        )}
      </div>
    </div>
  )
}
