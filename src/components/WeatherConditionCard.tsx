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

function getAqiCategory(usAqi: number): string {
  if (usAqi <= 100) return 'moderate'
  if (usAqi <= 150) return 'unhealthy for sensitive groups'
  if (usAqi <= 200) return 'unhealthy'
  if (usAqi <= 300) return 'very unhealthy'
  return 'hazardous'
}

function getAqiBackgroundClass(usAqi: number): string {
  if (usAqi <= 100) return 'bg-[#795500]'
  if (usAqi <= 150) return 'bg-[#8a3f00]'
  if (usAqi <= 200) return 'bg-[#760000]'
  if (usAqi <= 300) return 'bg-[#4d225c]'
  return 'bg-[#4b1928]'
}

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
  isCondensed?: boolean
  originClassName?: string
  tone: 'pop' | 'wind' | 'aqi'
  usAqi?: number
  ariaLabel?: string
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

function MetricBadge({
  icon,
  iconStyle,
  isCondensed = false,
  originClassName = 'origin-center',
  tone,
  usAqi = 0,
  ariaLabel,
  children,
}: MetricBadgeProps) {
  const backgroundClassName =
    tone === 'pop'
      ? 'bg-[#073a67]'
      : tone === 'wind'
        ? 'bg-[#760000]'
        : getAqiBackgroundClass(usAqi)

  return (
    <div
      className={twJoin(
        'inline-grid w-max max-w-none shrink-0 grid-cols-[auto_max-content] items-stretch overflow-hidden rounded-full',
        originClassName,
        'p-0 leading-none text-white',
        isCondensed && 'scale-50',
        backgroundClassName,
      )}
      style={SECONDARY_VALUE_STYLE}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
    >
      <span
        className="text-shadow-big inline-flex aspect-square shrink-0 items-center justify-center p-[0.28em] leading-none"
        style={SECONDARY_ICON_STYLE}
        aria-hidden
      >
        {iconStyle ? (
          <ShadowedRotatingIcon
            name={icon}
            iconClassName="inline-flex items-center justify-center leading-none [&_[data-icon]]:leading-none"
            motionStyle={iconStyle}
          />
        ) : (
          <Icon
            name={icon}
            className="inline-flex items-center justify-center leading-none [&_[data-icon]]:leading-none"
          />
        )}
      </span>
      <span
        className="text-big inline-flex min-w-max items-center justify-self-start pr-[0.42em] leading-none whitespace-nowrap"
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
  condition: string
  iconCode: string
  pop: string | null
  popNum: number | null
  windNum: number
  windDirection: number | null
  usAqi: number | null
  isDaylight?: boolean
  isPrimaryColumn?: boolean
  showTemp?: boolean
  showPopBadge?: boolean
  showWindBadge?: boolean
  isPopBadgeCondensed?: boolean
  isWindBadgeCondensed?: boolean
}

export const WeatherConditionCard = forwardRef<
  HTMLDivElement,
  WeatherConditionCardData
>(function WeatherConditionCard(
  {
    animated = true,
    temp,
    condition,
    iconCode,
    pop,
    popNum,
    windNum,
    usAqi,
    isDaylight = true,
    isPrimaryColumn = false,
    showTemp = true,
    showPopBadge = false,
    showWindBadge = false,
    isPopBadgeCondensed = false,
    isWindBadgeCondensed = false,
  },
  ref,
) {
  const popVal = popNum ?? 0
  const popText = pop ?? `${formatNumeric(popVal)}%`
  const fanRotationDuration = getFanRotationDurationSeconds(windNum)
  const fanStyle =
    animated && fanRotationDuration != null
      ? {
          animation: `wind-fan-spin ${fanRotationDuration}s linear infinite`,
        }
      : undefined
  const showMainTemp = isPrimaryColumn || showTemp
  const showPopMetricBadge = showPopBadge
  const showWindMetricBadge = isPrimaryColumn ? true : showWindBadge
  const showBadgePair = showPopMetricBadge && showWindMetricBadge

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
            name={getConditionIcon(iconCode, 'solid', isDaylight, condition)}
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

        <div className="flex max-w-none flex-col items-center gap-2 overflow-visible">
          {showPopMetricBadge && (
            <MetricBadge
              icon="solid:cloud-showers"
              isCondensed={isPopBadgeCondensed}
              originClassName={showBadgePair ? 'origin-bottom' : undefined}
              tone="pop"
            >
              {popText}
            </MetricBadge>
          )}
          {showWindMetricBadge && (
            <MetricBadge
              icon="solid:pump-impeller"
              iconStyle={fanStyle}
              isCondensed={isWindBadgeCondensed}
              originClassName={showBadgePair ? 'origin-top' : undefined}
              tone="wind"
            >
              {formatNumeric(windNum)}
            </MetricBadge>
          )}
          {usAqi != null && usAqi > 50 && (
            <MetricBadge
              icon="solid:smog"
              tone="aqi"
              usAqi={usAqi}
              ariaLabel={`US AQI ${formatNumeric(usAqi)}, ${getAqiCategory(usAqi)}`}
            >
              {formatNumeric(usAqi)}
            </MetricBadge>
          )}
        </div>
      </div>
    </div>
  )
})
