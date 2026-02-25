'use client'

import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import {
  CANMORE_TZ,
  CHART_INSET_BOTTOM,
  CHART_INSET_LEFT,
  CHART_INSET_RIGHT,
  CHART_INSET_TOP,
  NUM_FORECASTED_HOURS,
} from '@/lib/config'
import { getConditionIcon } from '@/lib/condition-icons'
import type { HourlyForecast } from '@/lib/ec-weather'
import { degreesToCardinal, formatNumeric } from '@/lib/format'
import { twJoin } from 'tailwind-merge'

interface TemperatureCurveChartProps {
  currentTemp: number
  hourlyForecast: HourlyForecast[]
  windSpeed?: number
  windGust?: number
  windDirection?: number | null
  todayPop?: number | null
  iconCode?: string
}

function formatTime(utc: Date | string): string {
  const d = typeof utc === 'string' ? new Date(utc) : utc
  return d
    .toLocaleTimeString('en-CA', {
      timeZone: CANMORE_TZ,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .replace(/\s*[ap]\.?m\.?\s*$/i, '')
}

function formatWind(
  speed: number,
  direction: number | null,
): { wind: string; windNum: number } {
  const windNum = speed
  const dir = direction != null ? degreesToCardinal(direction) : ''
  const wind = dir
    ? `${formatNumeric(windNum)} ${dir}`
    : `${formatNumeric(windNum)}`
  return { wind, windNum }
}

export function TemperatureCurveChart({
  currentTemp,
  hourlyForecast,
  windSpeed = 0,
  windGust = 0,
  windDirection = null,
  todayPop = null,
  iconCode: currentIconCode,
}: TemperatureCurveChartProps) {
  const temps = [currentTemp, ...hourlyForecast.map((h) => h.temp)].slice(
    0,
    NUM_FORECASTED_HOURS + 1,
  )
  const numHours = temps.length
  if (numHours < 1) return null

  const minTemp = Math.min(...temps)
  const maxTemp = Math.max(...temps)
  const range = maxTemp - minTemp
  const scaleMin = range === 0 ? minTemp - 1 : minTemp
  const scaleMax = range === 0 ? maxTemp + 1 : maxTemp
  const rowTemps = Array.from(
    { length: scaleMax - scaleMin + 1 },
    (_, i) => scaleMax - i,
  )
  const numRows = rowTemps.length
  const numCols = numHours + 1

  const nowPop = todayPop ?? hourlyForecast[0]?.pop ?? null
  const nowWind = Math.max(windSpeed, windGust)
  const nowWindFmt = formatWind(nowWind, windDirection ?? null)
  const labelData = [
    {
      key: 0,
      time: 'Now',
      temp: currentTemp,
      iconCode: currentIconCode ?? hourlyForecast[0]?.iconCode ?? '00',
      pop: nowPop != null ? `${formatNumeric(nowPop)}%` : null,
      popNum: nowPop,
      wind: nowWindFmt.wind,
      windNum: nowWindFmt.windNum,
      isToday: true,
    },
    ...hourlyForecast.slice(0, NUM_FORECASTED_HOURS).map((h, i) => {
      const windFmt = formatWind(
        Math.max(h.windSpeed, h.windGust),
        h.windDirection ?? null,
      )
      return {
        key: i + 1,
        time: formatTime(h.utc),
        temp: h.temp,
        iconCode: h.iconCode,
        pop: h.pop != null ? `${formatNumeric(h.pop)}%` : null,
        popNum: h.pop,
        wind: windFmt.wind,
        windNum: windFmt.windNum,
        isToday: false,
      }
    }),
  ].slice(0, numHours)

  const hasPop = labelData.some((d) => (d.popNum ?? 0) > 0)
  const hasWind = labelData.some((d) => d.windNum > 0)
  const numBottomRows = 1 + (hasPop ? 1 : 0) + (hasWind ? 1 : 0)

  return (
    <div
      className="relative mx-auto flex h-full w-screen flex-col overflow-visible"
      style={{
        paddingTop: CHART_INSET_TOP,
        paddingRight: CHART_INSET_RIGHT,
        paddingBottom: CHART_INSET_BOTTOM,
        paddingLeft: CHART_INSET_LEFT,
      }}
    >
      <div
        className="grid min-h-0 flex-1 gap-x-0 overflow-visible"
        style={{
          gridTemplateColumns: `4.5rem repeat(${numHours}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${numRows - 1}, minmax(0, 1fr)) auto`,
        }}
        aria-label={`Temperature outlook: current and next ${NUM_FORECASTED_HOURS} hours`}
      >
        {rowTemps.map((rowTemp, r) =>
          Array.from({ length: numCols }, (_, c) => {
            if (c === 0) {
              return (
                <div
                  key={`${r}-${c}`}
                  className="text-small flex w-18 items-start justify-center text-center"
                >
                  <span className="-translate-y-1/2">
                    {formatNumeric(rowTemp)}°
                  </span>
                </div>
              )
            }
            const hourIdx = c - 1
            const hourTemp = temps[hourIdx]
            const roundedTemp = Math.min(
              scaleMax,
              Math.max(scaleMin, Math.round(hourTemp)),
            )
            const isTopOfBar = rowTemp === roundedTemp
            const label = labelData[hourIdx]
            return (
              <div
                key={`${r}-${c}`}
                className={twJoin(
                  'border-foreground',
                  'relative',
                  'flex',
                  'min-h-0',
                  'min-w-0',
                  'items-start',
                  'justify-center',
                  'overflow-visible',
                  'border-t',
                )}
              >
                {isTopOfBar && label && (
                  <span
                    className={twJoin(
                      'inverted',
                      'flex',
                      'w-full',
                      'flex-col',
                      'items-center',
                      'gap-0.5',
                      'rounded-lg',
                      'p-2',
                      'mx-1',
                      'text-big -translate-y-1/2',
                    )}
                  >
                    <Icon name={getConditionIcon(label.iconCode)} />
                    {formatNumeric(label.temp)}°
                  </span>
                )}
              </div>
            )
          }),
        )}
      </div>
      <div
        className="text-small mt-4 grid shrink-0 place-items-center gap-x-0 gap-y-3"
        style={{
          gridTemplateColumns: `4.5rem repeat(${numHours}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${numBottomRows}, auto)`,
          gridAutoFlow: 'column',
        }}
        aria-hidden
      >
        <div className="flex w-18 items-center justify-center py-1 text-center">
          <Icon name="clock" />
        </div>
        {hasPop && (
          <div className="flex w-18 items-center justify-center py-1 text-center">
            <Icon name="droplet" />
          </div>
        )}
        {hasWind && (
          <div className="flex w-18 items-center justify-center py-1 text-center">
            <Icon name="wind" />
          </div>
        )}
        {labelData.flatMap((d) => {
          const items: ReactNode[] = [
            <div
              key={`${d.key}-time`}
              className="flex w-full items-center justify-center"
            >
              <span
                className={twJoin(
                  'mx-1 min-w-0 flex-1 py-1 text-center',
                  d.isToday && 'font-bold',
                )}
              >
                {d.time}
              </span>
            </div>,
          ]
          if (hasPop) {
            items.push(
              <div
                key={`${d.key}-pop`}
                className="flex w-full items-center justify-center"
              >
                <span
                  className={twJoin(
                    'mx-1 min-w-0 flex-1 py-1 text-center',
                    (d.popNum ?? 0) > 0 && 'rounded bg-blue-700 text-blue-100',
                    d.popNum === 0 && 'opacity-0',
                  )}
                >
                  {d.pop ?? '—'}
                </span>
              </div>,
            )
          }
          if (hasWind) {
            items.push(
              <div
                key={`${d.key}-wind`}
                className="flex w-full items-center justify-center"
              >
                <span
                  className={twJoin(
                    'mx-1 min-w-0 flex-1 py-1 text-center',
                    d.windNum > 30 && 'rounded bg-red-700 text-red-100',
                  )}
                >
                  {d.wind}
                </span>
              </div>,
            )
          }
          return items
        })}
      </div>
    </div>
  )
}
