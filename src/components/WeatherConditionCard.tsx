'use client'

import { type CSSProperties, forwardRef, type ReactNode } from 'react'
import { Icon, type IconString } from '@/components/Icon'
import { getConditionIcon } from '@/lib/condition-icons'
import { formatNumeric } from '@/lib/format'
import { twJoin } from 'tailwind-merge'

const AIR_METERS_PER_FAN_REVOLUTION = 10
const MIN_FAN_ROTATION_DURATION_SECONDS = 0.45
const MAX_FAN_ROTATION_DURATION_SECONDS = 8
const CONDITION_ICON_STYLE: CSSProperties = {
  fontSize: 'min(12.4416vh, 52.8768cqw)',
}
const TEMPERATURE_STYLE: CSSProperties = {
  fontSize: 'min(12.4416vh, 65.3184cqw)',
}
const CONDITION_ONLY_ICON_STYLE: CSSProperties = {
  fontSize: 'min(12.4416vh, 93.312cqw)',
}
const SECONDARY_ICON_STYLE: CSSProperties = {
  fontSize: 'min(5.76vh, 24.48cqw)',
}
const SECONDARY_VALUE_STYLE: CSSProperties = {
  fontSize: 'min(5.76vh, 30.24cqw)',
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

interface MetricBadgeProps {
  icon: IconString
  iconStyle?: CSSProperties
  tone: 'pop' | 'wind'
  children: ReactNode
}

interface ShadowedRotatingIconProps {
  name: IconString
  wrapperClassName?: string
  iconClassName?: string
  style?: CSSProperties
  motionStyle?: CSSProperties
}

function ShadowedRotatingIcon({
  name,
  wrapperClassName,
  iconClassName,
  style,
  motionStyle,
}: ShadowedRotatingIconProps) {
  const iconStyle: CSSProperties = {
    ...style,
    ...motionStyle,
    textShadow: 'none',
  }
  const shadowStyle: CSSProperties = {
    ...iconStyle,
    color: 'var(--hud-fan-shadow-color)',
    filter: 'blur(var(--hud-fan-shadow-blur))',
    translate: 'var(--hud-fan-shadow-x) var(--hud-fan-shadow-y)',
  }

  return (
    <span
      className={twJoin(
        'relative inline-grid place-items-center leading-none',
        wrapperClassName,
      )}
      aria-hidden
    >
      <Icon
        name={name}
        className={twJoin('col-start-1 row-start-1', iconClassName)}
        style={shadowStyle}
        aria-hidden
      />
      <Icon
        name={name}
        className={twJoin('col-start-1 row-start-1', iconClassName)}
        style={iconStyle}
        aria-hidden
      />
    </span>
  )
}

function MetricBadge({ icon, iconStyle, tone, children }: MetricBadgeProps) {
  return (
    <div
      className={twJoin(
        'inline-grid grid-cols-[auto_auto] items-stretch overflow-hidden rounded-full',
        'p-0 leading-none text-white',
        tone === 'pop' ? 'bg-[#073a67]' : 'bg-[#760000]',
      )}
      style={SECONDARY_VALUE_STYLE}
    >
      <span
        className="text-shadow-big inline-flex h-[1.5em] w-[1.5em] shrink-0 items-center justify-center leading-none"
        aria-hidden
      >
        {iconStyle ? (
          <ShadowedRotatingIcon
            name={icon}
            iconClassName="inline-flex h-full w-full items-center justify-center leading-none [&_[data-icon]]:leading-none"
            style={SECONDARY_ICON_STYLE}
            motionStyle={iconStyle}
          />
        ) : (
          <Icon
            name={icon}
            className="inline-flex h-full w-full items-center justify-center leading-none [&_[data-icon]]:leading-none"
            style={SECONDARY_ICON_STYLE}
          />
        )}
      </span>
      <span
        className="text-big inline-flex min-w-0 items-center justify-self-start pr-[0.42em] leading-none"
        style={SECONDARY_VALUE_STYLE}
      >
        {children}
      </span>
    </div>
  )
}

export interface WeatherConditionCardData {
  animated?: boolean
  temp: number
  iconCode: string
  pop: string | null
  popNum: number | null
  windNum: number
  windDirection: number | null
  isDaylight?: boolean
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
    animated = true,
    temp,
    iconCode,
    pop,
    popNum,
    windNum,
    isDaylight = true,
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
    animated && fanRotationDuration != null
      ? {
          animation: `wind-fan-spin ${fanRotationDuration}s linear infinite`,
        }
      : undefined
  const showMainTemp = isPrimaryColumn || showTemp
  const showPopMetricBadge = isPrimaryColumn ? showPop : showPopBadge
  const showWindMetricBadge = isPrimaryColumn ? true : showWindBadge

  return (
    <div
      ref={ref}
      className="relative flex w-full flex-col items-center justify-center overflow-visible text-white"
      style={{ containerType: 'inline-size' }}
    >
      <div
        className={twJoin(
          'flex w-full flex-col justify-center gap-8 overflow-visible py-3',
          'items-center px-3',
        )}
      >
        <div
          className={twJoin(
            showMainTemp
              ? 'flex flex-col gap-[3cqw]'
              : 'flex items-center justify-center',
            'items-center',
          )}
        >
          <Icon
            name={getConditionIcon(iconCode, 'solid', isDaylight)}
            className="text-huge"
            style={
              showMainTemp ? CONDITION_ICON_STYLE : CONDITION_ONLY_ICON_STYLE
            }
            aria-hidden
          />
          {showMainTemp && (
            <div
              className="text-huge flex min-w-0 items-center justify-center leading-none font-normal"
              style={TEMPERATURE_STYLE}
            >
              {formatNumeric(temp)}°
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          {showPopMetricBadge && (
            <MetricBadge
              icon="solid:cloud-showers"
              tone="pop"
            >
              {popText}
            </MetricBadge>
          )}
          {showWindMetricBadge && (
            <MetricBadge
              icon="solid:fan"
              iconStyle={fanStyle}
              tone="wind"
            >
              {formatNumeric(windNum)}
            </MetricBadge>
          )}
        </div>
      </div>
    </div>
  )
})
