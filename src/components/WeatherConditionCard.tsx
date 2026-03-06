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
  const popVal = popNum ?? 0
  const windPct = windIntensityPct(windNum)
  const windToColor =
    windNum > 0 && windPct > 0
      ? `rgb(127 29 29 / ${windPct}%)`
      : 'transparent'
  return (
    <div
      ref={ref}
      className={twJoin(
        'relative flex w-full flex-col items-center justify-center overflow-hidden',
      )}
      style={{
        opacity,
        borderRadius: `${WEATHER_CARD_BORDER_RADIUS_PX}px`,
      }}
    >
      <div
        className="absolute inset-0 overflow-hidden bg-foreground"
        style={{ borderRadius: `${WEATHER_CARD_BORDER_RADIUS_PX}px` }}
        aria-hidden
      />
      {popVal > 0 && (
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            borderRadius: `${WEATHER_CARD_BORDER_RADIUS_PX}px`,
            backgroundColor: `rgb(30 58 138 / ${popVal}%)`,
          }}
          aria-hidden
        />
      )}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          borderRadius: `${WEATHER_CARD_BORDER_RADIUS_PX}px`,
          background: `linear-gradient(to bottom, transparent 0%, transparent 50%, ${windToColor} 100%)`,
        }}
        aria-hidden
      />
      <div
        className={twJoin(
          'relative z-10 flex w-full flex-col items-center justify-center overflow-hidden text-background',
          'mx-0 p-[6px]',
        )}
      >
        <div className="text-huge flex w-full items-center justify-center px-2 py-3">
          {formatNumeric(temp)}°
        </div>
      {hasConditional && (
        <div
          className={twJoin('flex', 'w-full', 'flex-col', 'overflow-hidden')}
        >
          {(popNum ?? 0) > 0 && (
            <div
              className={twJoin(
                'text-small flex items-center justify-center px-2 py-1 leading-tight',
                popVal >= 60 ? 'text-foreground' : 'text-background',
              )}
            >
              {pop}
            </div>
          )}
          {windNum > 0 && (
            <div
              className={twJoin(
                'text-small flex items-center justify-center gap-1 px-2 py-1 leading-tight',
                windPct >= 60 ? 'text-foreground' : 'text-background',
              )}
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
    </div>
  )
})
