'use client'

import { type CSSProperties, forwardRef } from 'react'
import { Icon } from '@/components/Icon'
import { getConditionIcon } from '@/lib/condition-icons'
import { degreesToCardinal, formatNumeric } from '@/lib/format'
import { twJoin } from 'tailwind-merge'

const AIR_METERS_PER_FAN_REVOLUTION = 10
const MIN_FAN_ROTATION_DURATION_SECONDS = 0.45
const MAX_FAN_ROTATION_DURATION_SECONDS = 8
const CONDITION_ICON_STYLE: CSSProperties = {
  fontSize: 'min(11.52vh, 48.96cqw)',
}
const TEMPERATURE_STYLE: CSSProperties = {
  fontSize: 'min(11.52vh, 60.48cqw)',
}
const CONDITION_ONLY_ICON_STYLE: CSSProperties = {
  fontSize: 'min(11.52vh, 86.4cqw)',
}
const SECONDARY_ICON_STYLE: CSSProperties = { fontSize: 'min(6.4vh, 27.2cqw)' }
const SECONDARY_VALUE_STYLE: CSSProperties = {
  fontSize: 'min(6.4vh, 33.6cqw)',
}
const POP_DISPLAY_THRESHOLD_PCT = 20

function getFanRotationDurationSeconds(windKmh: number): number | null {
  if (windKmh <= 0) return null
  const windMetersPerSecond = windKmh / 3.6
  const duration = AIR_METERS_PER_FAN_REVOLUTION / windMetersPerSecond
  return Math.min(
    MAX_FAN_ROTATION_DURATION_SECONDS,
    Math.max(MIN_FAN_ROTATION_DURATION_SECONDS, duration),
  )
}

export interface WeatherConditionCardData {
  temp: number
  iconCode: string
  pop: string | null
  popNum: number | null
  windNum: number
  windDirection: number | null
  isPrimaryColumn?: boolean
  showTemp?: boolean
  showPopBadge?: boolean
  showWindBadge?: boolean
}

export const WeatherConditionCard = forwardRef<
  HTMLDivElement,
  WeatherConditionCardData
>(function WeatherConditionCard(
  {
    temp,
    iconCode,
    pop,
    popNum,
    windNum,
    windDirection,
    isPrimaryColumn = false,
    showTemp = true,
    showPopBadge = false,
    showWindBadge = false,
  },
  ref,
) {
  const popVal = popNum ?? 0
  const popText = pop ?? `${formatNumeric(popVal)}%`
  const showPop = popVal >= POP_DISPLAY_THRESHOLD_PCT
  const fanRotationDuration = getFanRotationDurationSeconds(windNum)
  const fanStyle =
    fanRotationDuration != null
      ? {
          animation: `wind-fan-spin ${fanRotationDuration}s linear infinite`,
        }
      : undefined
  const showMainTemp = isPrimaryColumn || showTemp

  return (
    <div
      ref={ref}
      className="relative flex w-full flex-col items-center justify-center overflow-visible text-white"
      style={{ containerType: 'inline-size' }}
    >
      <div
        className={twJoin(
          'flex w-full flex-col justify-center gap-4 overflow-visible py-3',
          'items-center px-3',
        )}
      >
        <div
          className={twJoin(
            showMainTemp
              ? 'flex flex-col gap-[1.5cqw]'
              : 'flex items-center justify-center',
            'items-center',
          )}
        >
          <Icon
            name={getConditionIcon(iconCode, 'solid')}
            className="text-huge"
            style={
              showMainTemp ? CONDITION_ICON_STYLE : CONDITION_ONLY_ICON_STYLE
            }
            aria-hidden
          />
          {showMainTemp && (
            <div
              className="text-huge flex min-w-0 items-center justify-center leading-none"
              style={TEMPERATURE_STYLE}
            >
              {formatNumeric(temp)}°
            </div>
          )}
        </div>

        {isPrimaryColumn ? (
          <>
            {showPop && (
              <div className="flex items-center gap-[3cqw]">
                <Icon
                  name="solid:raindrops"
                  className="text-big"
                  style={SECONDARY_ICON_STYLE}
                  aria-hidden
                />
                <div
                  className="text-big leading-none"
                  style={SECONDARY_VALUE_STYLE}
                >
                  {popText}
                </div>
              </div>
            )}
            <div className="flex items-center gap-[3cqw]">
              <Icon
                name="solid:fan"
                className="text-big inline-block"
                style={{ ...SECONDARY_ICON_STYLE, ...fanStyle }}
                aria-hidden
              />
              <div
                className="text-big flex items-center gap-1 leading-none"
                style={SECONDARY_VALUE_STYLE}
              >
                {formatNumeric(windNum)}
                {windDirection != null && windNum > 0 && (
                  <span
                    className="inline-block text-[0.42em]"
                    style={{
                      transform: `rotate(${windDirection}deg)`,
                    }}
                    aria-label={`From ${degreesToCardinal(windDirection)}`}
                  >
                    <Icon name="arrow-up" />
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {showPopBadge && (
              <div
                className="inline-flex items-center gap-2 rounded-full bg-[#073a67] px-4 py-2 leading-none text-white"
                style={SECONDARY_VALUE_STYLE}
              >
                <Icon
                  name="solid:raindrops"
                  className="text-shadow-big text-[0.8em]"
                  aria-hidden
                />
                <span className="text-big">{popText}</span>
              </div>
            )}
            {showWindBadge && (
              <div
                className="inline-flex items-center gap-2 rounded-full bg-[#760000] px-4 py-2 leading-none text-white"
                style={SECONDARY_VALUE_STYLE}
              >
                <Icon
                  name="solid:fan"
                  className="text-shadow-big inline-block text-[0.8em]"
                  style={fanStyle}
                  aria-hidden
                />
                <span className="text-big">{formatNumeric(windNum)}</span>
                {windDirection != null && (
                  <span
                    className="inline-block text-[0.58em]"
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
