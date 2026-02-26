'use client'

import { Icon } from '@/components/Icon'
import {
  CANMORE_TZ,
  CHART_INSET_BOTTOM,
  CHART_INSET_LEFT,
  CHART_INSET_RIGHT,
  CHART_INSET_TOP,
  NUM_FORECASTED_HOURS,
} from '@/lib/config'
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
                {isTopOfBar &&
                  label &&
                  (() => {
                    const hasConditional =
                      (label.popNum ?? 0) > 0 || label.windNum > 0
                    return (
                      <div className="relative mx-1 w-full -translate-y-1/2">
                        <div
                          className={twJoin(
                            'inverted text-huge flex items-center justify-center px-2 py-3',
                            hasConditional ? 'rounded-t-lg' : 'rounded-lg',
                          )}
                        >
                          {formatNumeric(label.temp)}°
                        </div>
                        {hasConditional && (
                          <div className="absolute inset-x-0 top-full flex flex-col overflow-hidden rounded-b-lg">
                            {(label.popNum ?? 0) > 0 && (
                              <div className="flex items-center justify-center bg-blue-700 px-2 py-1 text-small leading-tight text-blue-100">
                                {label.pop}
                              </div>
                            )}
                            {label.windNum > 0 && (
                              <div
                                className={twJoin(
                                  'flex items-center justify-center px-2 py-1 text-small leading-tight',
                                  label.windNum > 30
                                    ? 'bg-red-700 text-red-100'
                                    : 'inverted',
                                )}
                              >
                                {label.wind}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}
              </div>
            )
          }),
        )}
      </div>
      <div
        className="text-small mt-4 grid shrink-0 place-items-center gap-x-0"
        style={{
          gridTemplateColumns: `4.5rem repeat(${numHours}, minmax(0, 1fr))`,
        }}
        aria-hidden
      >
        <div className="flex w-18 items-center justify-center py-1 text-center">
          <Icon name="clock" />
        </div>
        {labelData.map((d) => (
          <div
            key={d.key}
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
          </div>
        ))}
      </div>
    </div>
  )
}
