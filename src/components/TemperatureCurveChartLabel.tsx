'use client'

import { Icon } from '@/components/Icon'
import type { IconString } from '@/components/Icon/types'
import { formatNumeric } from '@/lib/format'
import { twJoin } from 'tailwind-merge'

interface TemperatureCurveChartLabelProps {
  isToday: boolean
  temp: number
  pop: string | null
  popNum: number | null
  wind: string
  windNum: number
  conditionIcon: IconString
  popIcon: IconString
  below: boolean
  leftPct: number
  topPct: number
}

export function TemperatureCurveChartLabel({
  isToday,
  temp,
  pop,
  popNum,
  wind,
  windNum,
  conditionIcon,
  popIcon,
  below,
  leftPct,
  topPct,
}: TemperatureCurveChartLabelProps) {
  return (
    <div
      className={twJoin(
        'absolute',
        'flex flex-col',
        'font-bold',
        'rounded',
        'overflow-hidden',
        'text-xs',
        isToday
          ? 'bg-foreground text-background'
          : 'border-foreground bg-background text-foreground border-2',
        isToday && (below ? 'origin-top-right' : 'origin-bottom-right'),
      )}
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        transform: isToday
          ? below
            ? 'translate(-50%, 10px) scale(2)'
            : 'translate(-50%, calc(-100% - 10px)) scale(2)'
          : below
            ? 'translate(-50%, 10px)'
            : 'translate(-50%, calc(-100% - 10px))',
      }}
    >
      <div className="flex w-full items-center justify-stretch gap-x-3 px-2 py-1.5 text-[2em]">
        <div className="w-8 shrink-0 text-center">
          <Icon name={conditionIcon} />
        </div>
        <span className="min-w-0 flex-1 text-center leading-none">
          {formatNumeric(temp)}
          <span>°</span>
        </span>
      </div>
      {pop != null && (
        <div
          className={twJoin(
            'flex',
            'w-full',
            'items-center',
            'justify-stretch',
            'gap-x-3',
            'px-2',
            'py-1.5',
            (popNum ?? 0) > 0 && 'bg-blue-700 text-blue-100',
          )}
        >
          <div className="w-8 shrink-0 text-center">
            <Icon name={popIcon} />
          </div>
          <span className="min-w-0 flex-1 text-center">{pop}</span>
        </div>
      )}
      <div
        className={twJoin(
          'flex',
          'w-full',
          'items-center',
          'justify-stretch',
          'gap-x-3',
          'px-2',
          'py-1.5',
          windNum > 30 && 'bg-red-700 text-red-100',
        )}
      >
        <div className="w-8 shrink-0 text-center">
          <Icon name="wind" />
        </div>
        <span className="min-w-0 flex-1 text-center">{wind}</span>
      </div>
    </div>
  )
}
