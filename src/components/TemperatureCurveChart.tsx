'use client'

import type { WeatherIconName } from '@/components/Icon/types'
import { TemperatureCurveChartLabel } from '@/components/TemperatureCurveChartLabel'
import {
  CANMORE_TZ,
  CHART_INSET_BOTTOM,
  CHART_INSET_LEFT,
  CHART_INSET_RIGHT,
  CHART_INSET_TOP,
} from '@/lib/config'
import { getConditionIcon } from '@/lib/condition-icons'
import type { HourlyForecast } from '@/lib/ec-weather'
import { degreesToCardinal, formatNumeric } from '@/lib/format'

interface TemperatureCurveChartProps {
  currentTemp: number
  hourlyForecast: HourlyForecast[]
  windSpeed?: number
  windGust?: number
  windDirection?: number | null
  todayPop?: number | null
  iconCode?: string
}

function yScale(
  delta: number,
  minY: number,
  range: number,
  height: number,
): number {
  if (range <= 0) return height / 2
  return height - ((delta - minY) / range) * height
}

function formatTime(utc: Date | string): string {
  const d = typeof utc === 'string' ? new Date(utc) : utc
  return d.toLocaleTimeString('en-CA', {
    timeZone: CANMORE_TZ,
    hour: 'numeric',
    minute: '2-digit',
  })
}

function popIcon(temp: number): WeatherIconName {
  return temp < 0 ? 'snowflake' : 'droplet'
}

function formatWind(
  speed: number,
  direction: number | null,
): { wind: string; windNum: number } {
  const windNum = speed
  const dir = direction != null ? degreesToCardinal(direction) : ''
  const wind = dir ? `${formatNumeric(windNum)} ${dir}` : `${formatNumeric(windNum)}`
  return { wind, windNum }
}

export function TemperatureCurveChart({
  currentTemp,
  hourlyForecast,
  windSpeed = 0,
  windGust = 0,
  windDirection = null,
  todayPop = null,
  iconCode: currentIconCode = '00',
}: TemperatureCurveChartProps) {
  const temps = [currentTemp, ...hourlyForecast.map((h) => h.temp)]
  const deltas = temps.map((t) => t - currentTemp)
  const nPoints = deltas.length
  if (nPoints < 2) return null

  const minDelta = Math.min(...deltas)
  const maxDelta = Math.max(...deltas)
  const minY = Math.min(minDelta, 0)
  const maxY = Math.max(maxDelta, 0)
  const range = maxY - minY || 1
  const padding = range * 0.1
  const scaleMin = minY - padding
  const scaleMax = maxY + padding
  const scaleRange = scaleMax - scaleMin

  const width = nPoints - 1
  const height = 100
  const toY = (d: number) => yScale(d, scaleMin, scaleRange, height)
  const points = deltas.map((d, i) => `${i},${toY(d)}`)
  const pathD = `M ${points.join(' L ')}`
  const baselineY = toY(0)

  const baselinePct = (baselineY / height) * 100
  const timeLabels = [
    { key: 0, text: 'Now', leftPct: 0 },
    ...hourlyForecast.slice(0, 12).map((h, i) => ({
      key: i + 1,
      text: formatTime(h.utc),
      leftPct: ((i + 1) / width) * 100,
    })),
  ]

  const nextDelta = deltas[1]
  const nowLabelBelow = nextDelta != null && nextDelta > 0
  const nowPop = todayPop ?? hourlyForecast[0]?.pop ?? null
  const nowWind = Math.max(windSpeed, windGust)
  const nowWindFmt = formatWind(
    nowWind,
    windDirection ?? null,
  )
  const nowLabel = {
    key: 0,
    temp: currentTemp,
    pop: nowPop != null ? `${formatNumeric(nowPop)}%` : null,
    popNum: nowPop,
    wind: nowWindFmt.wind,
    windNum: nowWindFmt.windNum,
    conditionIcon: getConditionIcon(currentIconCode),
    popIcon: popIcon(currentTemp),
    leftPct: 0,
    topPct: (baselineY / height) * 100,
    below: nowLabelBelow,
  }

  const tempLabels = deltas.slice(1).map((delta, i) => {
    const x = i + 1
    const y1 = toY(delta)
    const temp = currentTemp + delta
    const h = hourlyForecast[i]
    const windSpeedH = h ? Math.max(h.windSpeed, h.windGust) : 0
    const windFmt = formatWind(windSpeedH, h?.windDirection ?? null)
    const pop = h?.pop ?? null
    const leftPct = (x / width) * 100
    const topPct = (y1 / height) * 100
    return {
      key: x,
      temp,
      pop: pop != null ? `${formatNumeric(pop)}%` : null,
      popNum: pop,
      wind: windFmt.wind,
      windNum: windFmt.windNum,
      conditionIcon: getConditionIcon(h?.iconCode ?? '00'),
      popIcon: popIcon(temp),
      leftPct,
      topPct,
      below: delta < 0,
    }
  })

  return (
    <div
      className="relative mx-auto h-full w-screen"
      style={{
        paddingTop: CHART_INSET_TOP,
        paddingRight: CHART_INSET_RIGHT,
        paddingBottom: CHART_INSET_BOTTOM,
        paddingLeft: CHART_INSET_LEFT,
      }}
    >
      <div className="relative h-full w-full"
      >
        <div
          className="absolute right-0 left-0 h-px bg-current opacity-50"
          style={{ top: `${baselinePct}%` }}
          aria-hidden
        />
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          aria-label="Temperature outlook: current and next 12 hours"
        >
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {deltas.slice(1).map((delta, i) => {
            const x = i + 1
            const y0 = toY(0)
            const y1 = toY(delta)
            return (
              <line
                key={x}
                x1={x}
                y1={y0}
                x2={x}
                y2={y1}
                stroke="currentColor"
                strokeWidth={0.15}
                opacity={0.7}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
        >
          {deltas.map((d, i) => (
            <div
              key={`pt-${i}`}
              className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current"
              style={{
                left: `${(i / width) * 100}%`,
                top: `${(toY(d) / height) * 100}%`,
              }}
            />
          ))}
          {timeLabels.map(({ key, text, leftPct }) => (
            <div
              key={key}
              className="label absolute -translate-x-1/2 translate-y-1/2 px-1"
              style={{ left: `${leftPct}%`, top: `${baselinePct}%` }}
            >
              {text}
            </div>
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
        >
          {[nowLabel, ...tempLabels].map(
            ({
              key,
              temp,
              pop,
              popNum,
              wind,
              windNum,
              conditionIcon,
              popIcon,
              leftPct,
              topPct,
              below,
            }) => (
              <TemperatureCurveChartLabel
                key={key}
                isToday={key === 0}
                temp={temp}
                pop={pop}
                popNum={popNum}
                wind={wind}
                windNum={windNum}
                conditionIcon={conditionIcon}
                popIcon={popIcon}
                below={below}
                leftPct={leftPct}
                topPct={topPct}
              />
            ),
          )}
        </div>
      </div>
    </div>
  )
}
