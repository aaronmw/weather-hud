'use client'

import { forwardRef } from 'react'
import { Icon } from '@/components/Icon'
import {
  WIND_THRESHOLD_HIGH_KMH,
  WIND_THRESHOLD_LOW_KMH,
  WEATHER_CARD_BORDER_RADIUS_PX,
} from '@/lib/config'
import { degreesToCardinal, formatNumeric } from '@/lib/format'
import { twJoin } from 'tailwind-merge'

function windIntensityPct(kmh: number): number {
  if (kmh < WIND_THRESHOLD_LOW_KMH) return 0
  if (kmh >= WIND_THRESHOLD_HIGH_KMH) return 100
  return (
    5 +
    ((kmh - WIND_THRESHOLD_LOW_KMH) * (100 - 5)) /
      (WIND_THRESHOLD_HIGH_KMH - WIND_THRESHOLD_LOW_KMH)
  )
}

export interface WeatherConditionCardData {
  temp: number
  pop: string | null
  popNum: number | null
  windNum: number
  windDirection: number | null
}

export const WeatherConditionCard = forwardRef<
  HTMLDivElement,
  WeatherConditionCardData & { opacity?: number }
>(function WeatherConditionCard(
  { temp, pop, popNum, windNum, windDirection, opacity = 1 },
  ref,
) {
  const hasConditional = (popNum ?? 0) > 0 || windNum > 0
  const windPct = windIntensityPct(windNum)
  const popVal = popNum ?? 0
  const popActive = popVal > 0
  const popBorderClass = popActive
    ? popVal >= 50
      ? '[--pop-border:rgb(219_234_254)]'
      : '[--pop-border:rgb(30_58_138)] dark:[--pop-border:rgb(219_234_254)]'
    : ''
  const popTextClass =
    popVal >= 50 ? 'text-blue-100' : 'text-blue-900 dark:text-blue-100'
  return (
    <div
      ref={ref}
      className={twJoin(
        'flex',
        'w-full',
        'flex-col',
        'items-center',
        'justify-center',
        'overflow-hidden',
        'bg-background mx-0 p-[6px]',
        popBorderClass,
      )}
      style={{
        opacity,
        borderRadius: `${WEATHER_CARD_BORDER_RADIUS_PX}px`,
        boxShadow: popActive
          ? `inset 0 0 0 6px var(--pop-border), 0 0 0 6px var(--pop-border), 0 0 0 6px var(--background)`
          : `inset 0 0 0 6px var(--foreground), 0 0 0 6px var(--foreground), 0 0 0 6px var(--background)`,
      }}
    >
      <div
        className={twJoin(
          'text-huge flex w-full items-center justify-center px-2 py-3',
          popActive && popTextClass,
        )}
        style={
          popActive
            ? { backgroundColor: `rgb(29 78 216 / ${popVal}%)` }
            : undefined
        }
      >
        {formatNumeric(temp)}°
      </div>
      {hasConditional && (
        <div
          className={twJoin('flex', 'w-full', 'flex-col', 'overflow-hidden')}
        >
          {popActive && (
            <div
              className={twJoin(
                'text-small flex items-center justify-center px-2 py-1 leading-tight',
                popTextClass,
              )}
              style={{
                backgroundColor: `rgb(29 78 216 / ${popVal}%)`,
              }}
            >
              {pop}
            </div>
          )}
          {windNum > 0 && (
            <div
              className={twJoin(
                'text-small flex items-center justify-center gap-1 px-2 py-1 leading-tight',
                windPct > 0
                  ? windPct >= 50
                    ? 'text-red-100'
                    : 'text-red-900 dark:text-red-100'
                  : '',
              )}
              style={
                windPct > 0
                  ? {
                      backgroundColor: `rgb(185 28 28 / ${windPct}%)`,
                    }
                  : undefined
              }
            >
              {formatNumeric(windNum)}
              {windDirection != null && (
                <span
                  className="inline-block"
                  style={{
                    transform: `rotate(${windDirection}deg)`,
                  }}
                  aria-label={`From ${degreesToCardinal(windDirection)}`}
                >
                  <Icon name="arrow-up" />
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
})
