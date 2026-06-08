'use client'

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { WeatherConditionCard } from '@/components/WeatherConditionCard'
import {
  CANMORE_TZ,
  CANMORE_LAT,
  CANMORE_LNG,
  CHART_GAP_X,
  CHART_INSET_BOTTOM,
  CHART_INSET_LEFT,
  CHART_INSET_RIGHT,
  CHART_INSET_TOP,
  CHART_TIME_ROW_HEIGHT_PX,
  CHART_TIME_ROW_PADDING_V_PX,
  CHART_TOP_RESERVE_PX,
  NUM_FORECASTED_HOURS,
} from '@/lib/config'
import type { HourlyForecast } from '@/lib/ec-weather'
import { formatNumeric } from '@/lib/format'
import { getSunTimes } from '@/lib/sun'

const K_MAX_ITERATIONS = 20
const K_EPS = 1e-3
const HIGH_WIND_THRESHOLD_KMH = 20
const POP_DISPLAY_THRESHOLD_PCT = 20
const TIME_LABEL_STYLE = { fontSize: 'min(6.4vh, 33.6cqw)' }

type ConditionKind = 'sun' | 'rain' | 'snow' | 'cloud' | 'storm'
type MixedConditionDirection = 'sun-forward' | 'cloud-forward'

interface LabelDatum {
  key: number
  time: string
  temp: number
  iconCode: string
  pop: string | null
  popNum: number | null
  windNum: number
  windDirection: number | null
  isToday: boolean
  isPrimaryColumn: boolean
  isDaylight: boolean
  showTemp: boolean
  showPopBadge: boolean
  showWindBadge: boolean
}

interface TemperatureCurveChartProps {
  currentTemp: number
  hourlyForecast: HourlyForecast[]
  windSpeed?: number
  windGust?: number
  windDirection?: number | null
  todayPop?: number | null
  iconCode?: string
  currentDateMs: number
}

function formatTime(utc: Date | string): string {
  const d = typeof utc === 'string' ? new Date(utc) : utc
  const hourPart = new Intl.DateTimeFormat('en-CA', {
    timeZone: CANMORE_TZ,
    hour: 'numeric',
    hourCycle: 'h23',
  })
    .formatToParts(d)
    .find((part) => part.type === 'hour')
  const hour = Number(hourPart?.value ?? 0)
  return String(hour % 12 || 12)
}

function formatWind(
  speed: number,
  direction: number | null,
): { windNum: number; windDirection: number | null } {
  return { windNum: speed, windDirection: direction }
}

function isDaylightAt(date: Date): boolean {
  const { sunrise, sunset } = getSunTimes(
    CANMORE_LAT,
    CANMORE_LNG,
    date,
    CANMORE_TZ,
  )
  const time = date.getTime()
  return time >= sunrise.getTime() && time < sunset.getTime()
}

function conditionKindsForIcon(code: string): ConditionKind[] {
  if (['39', '40', '41', '42', '43', '44', '45', '46', '47'].includes(code)) {
    return ['storm']
  }
  if (['07', '08', '15', '16', '17', '18', '19'].includes(code)) {
    return ['snow']
  }
  if (['09', '10', '11', '12', '13', '14'].includes(code)) {
    return ['rain']
  }
  if (['00', '30', '31'].includes(code)) return ['sun']
  if (['01', '02', '03', '32'].includes(code)) return ['sun', 'cloud']
  return ['cloud']
}

function mixedConditionDirectionForIcon(
  code: string,
): MixedConditionDirection | null {
  if (['01', '02', '32'].includes(code)) return 'sun-forward'
  if (code === '03') return 'cloud-forward'
  return null
}

function conditionColor(kind: ConditionKind): string {
  switch (kind) {
    case 'sun':
      return '#c98200'
    case 'rain':
      return '#073a67'
    case 'snow':
      return '#8fb6d8'
    case 'storm':
      return '#25154f'
    case 'cloud':
      return '#313131'
  }
}

function getColumnBackground(
  iconCode: string,
  isPrimaryColumn: boolean,
): string {
  if (isPrimaryColumn) return '#303030'
  const mixedDirection = mixedConditionDirectionForIcon(iconCode)
  if (mixedDirection) {
    const sunColor = conditionColor('sun')
    const cloudColor = conditionColor('cloud')
    const cloudOverlayOpacity = mixedDirection === 'sun-forward' ? 0.5 : 1
    return mixedDirection === 'sun-forward'
      ? `linear-gradient(to bottom, transparent 0%, color-mix(in srgb, ${cloudColor} ${cloudOverlayOpacity * 100}%, transparent) 100%), ${sunColor}`
      : `linear-gradient(to bottom, color-mix(in srgb, ${cloudColor} ${cloudOverlayOpacity * 100}%, transparent) 0%, transparent 100%), ${sunColor}`
  }
  const kinds = conditionKindsForIcon(iconCode)
  const colors = kinds.map(conditionColor)
  if (colors.length === 1) return colors[0]
  return `linear-gradient(to bottom, ${colors[0]} 0%, ${colors[1]} 100%)`
}

function computeLayout(
  chartHeight: number,
  cardDims: { width: number; height: number }[],
  labelData: LabelDatum[],
): { kMax: number; contentTop: number; contentBottom: number } {
  const firstHeight = cardDims[0]?.height ?? 0
  const firstTemp = labelData[0]?.temp ?? 0
  const tempRange = Math.max(
    1,
    Math.max(...labelData.map((d) => d.temp)) -
      Math.min(...labelData.map((d) => d.temp)),
  )
  let kLo = 0
  let kHi = (chartHeight / firstHeight / tempRange) * 2
  for (let iter = 0; iter < K_MAX_ITERATIONS; iter++) {
    const k = (kLo + kHi) / 2
    let contentTop = 0
    let contentBottom = 0
    for (let i = 0; i < labelData.length; i++) {
      const offsetY =
        i === 0 ? 0 : -firstHeight * k * (labelData[i].temp - firstTemp)
      const top = offsetY
      const bottom = offsetY + cardDims[i].height
      contentTop = Math.min(contentTop, top)
      contentBottom = Math.max(contentBottom, bottom)
    }
    const span = contentBottom - contentTop
    if (span <= chartHeight) kLo = k
    else kHi = k
    if (Math.abs(kHi - kLo) < K_EPS) break
  }
  const kMax = kLo
  let contentTop = 0
  let contentBottom = 0
  for (let i = 0; i < labelData.length; i++) {
    const offsetY =
      i === 0 ? 0 : -firstHeight * kMax * (labelData[i].temp - firstTemp)
    contentTop = Math.min(contentTop, offsetY)
    contentBottom = Math.max(contentBottom, offsetY + cardDims[i].height)
  }
  return { kMax, contentTop, contentBottom }
}

function getColumnLayout(
  chartWidth: number,
  numCols: number,
  baseGap: number,
): { x: number; width: number }[] {
  const totalGap = Math.max(0, numCols - 1) * baseGap
  const contentWidth = chartWidth - totalGap
  const totalFr = numCols
  const result: { x: number; width: number }[] = []
  let x = 0
  for (let i = 0; i < numCols; i++) {
    const w = (1 / totalFr) * contentWidth
    result.push({ x, width: w })
    if (i < numCols - 1) x += w + baseGap
  }
  return result
}

export function TemperatureCurveChart({
  currentTemp,
  hourlyForecast,
  windSpeed = 0,
  windGust = 0,
  windDirection = null,
  todayPop = null,
  iconCode: currentIconCode,
  currentDateMs,
}: TemperatureCurveChartProps) {
  const temps = [currentTemp, ...hourlyForecast.map((h) => h.temp)].slice(
    0,
    NUM_FORECASTED_HOURS + 1,
  )
  const numHours = temps.length

  const nowPop = todayPop ?? null
  const nowWind = Math.max(windSpeed, windGust)
  const nowWindFmt = formatWind(nowWind, windDirection ?? null)
  const currentDate = useMemo(() => new Date(currentDateMs), [currentDateMs])
  const labelData = useMemo(() => {
    const labels = [
      {
        key: 0,
        time: 'NOW',
        temp: currentTemp,
        iconCode: currentIconCode ?? hourlyForecast[0]?.iconCode ?? '00',
        pop: nowPop != null ? `${formatNumeric(nowPop)}%` : null,
        popNum: nowPop,
        windNum: nowWindFmt.windNum,
        windDirection: nowWindFmt.windDirection,
        isToday: true,
        isPrimaryColumn: true,
        isDaylight: isDaylightAt(currentDate),
        showTemp: true,
        showPopBadge: false,
        showWindBadge: false,
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
          windNum: windFmt.windNum,
          windDirection: windFmt.windDirection,
          isToday: false,
          isPrimaryColumn: false,
          isDaylight: isDaylightAt(
            typeof h.utc === 'string' ? new Date(h.utc) : h.utc,
          ),
          showTemp: false,
          showPopBadge: false,
          showWindBadge: false,
        }
      }),
    ].slice(0, numHours) as LabelDatum[]

    return labels.map((label, index) => {
      const previous = labels[index - 1]
      if (!previous) return label
      const isPopRepeated = (label.popNum ?? 0) === (previous.popNum ?? 0)
      return {
        ...label,
        showTemp: true,
        showPopBadge:
          !isPopRepeated && (label.popNum ?? 0) >= POP_DISPLAY_THRESHOLD_PCT,
        showWindBadge: label.windNum > HIGH_WIND_THRESHOLD_KMH,
      }
    })
  }, [
    currentTemp,
    currentIconCode,
    currentDate,
    hourlyForecast,
    nowPop,
    nowWindFmt.windDirection,
    nowWindFmt.windNum,
    numHours,
  ])

  const gridCols = `repeat(${numHours}, minmax(0, 1fr))`
  const chartAreaRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [layout, setLayout] = useState<{
    chartWidth: number
    chartHeight: number
    cardDims: { width: number; height: number }[]
    kMax: number
    contentTop: number
    contentBottom: number
  } | null>(null)

  const updateLayout = useCallback(
    (chartEl: HTMLDivElement, dims: { width: number; height: number }[]) => {
      const chartWidth = chartEl.clientWidth
      const chartHeight = chartEl.clientHeight
      if (chartHeight <= 0) return
      const { kMax, contentTop, contentBottom } = computeLayout(
        chartHeight,
        dims,
        labelData,
      )
      setLayout({
        chartWidth,
        chartHeight,
        cardDims: dims,
        kMax,
        contentTop,
        contentBottom,
      })
    },
    [labelData],
  )

  useLayoutEffect(() => {
    const chartEl = chartAreaRef.current
    if (!chartEl) return
    const cardEls = cardRefs.current
    const dims = cardEls.slice(0, labelData.length).map((el) =>
      el
        ? {
            width: el.getBoundingClientRect().width,
            height: el.getBoundingClientRect().height,
          }
        : { width: 0, height: 0 },
    )
    if (dims.some((d) => d.height === 0)) return
    updateLayout(chartEl, dims)
  }, [labelData, updateLayout])

  useLayoutEffect(() => {
    const chartEl = chartAreaRef.current
    if (!chartEl) return
    const runLayout = () => {
      const cardEls = cardRefs.current
      const dims = cardEls.slice(0, labelData.length).map((el) =>
        el
          ? {
              width: el.getBoundingClientRect().width,
              height: el.getBoundingClientRect().height,
            }
          : { width: 0, height: 0 },
      )
      if (dims.some((d) => d.height === 0)) return
      updateLayout(chartEl, dims)
    }
    const ro = new ResizeObserver(runLayout)
    ro.observe(chartEl)
    window.addEventListener('resize', runLayout)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', runLayout)
    }
  }, [labelData, updateLayout])

  const firstHeight = layout?.cardDims[0]?.height ?? 0
  const firstTemp = labelData[0]?.temp ?? 0
  const columns = layout
    ? getColumnLayout(layout.chartWidth, labelData.length, CHART_GAP_X)
    : []

  function renderCard(label: LabelDatum, forMeasure: boolean, index: number) {
    const card = (
      <WeatherConditionCard
        ref={
          forMeasure
            ? (el) => {
                cardRefs.current[index] = el
              }
            : undefined
        }
        temp={label.temp}
        iconCode={label.iconCode}
        pop={label.pop}
        popNum={label.popNum}
        windNum={label.windNum}
        windDirection={label.windDirection}
        isDaylight={label.isDaylight}
        isPrimaryColumn={label.isPrimaryColumn}
        showTemp={label.showTemp}
        showPopBadge={label.showPopBadge}
        showWindBadge={label.showWindBadge}
      />
    )
    return card
  }

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-visible text-white"
      aria-label={`Temperature outlook: current and next ${NUM_FORECASTED_HOURS} hours`}
    >
      {layout && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          aria-hidden
        >
          {labelData.map((label, i) => {
            const col = columns[i]
            return (
              <div
                key={label.key}
                className="absolute top-0 bottom-0"
                style={{
                  left: col.x,
                  width: col.width,
                  background: getColumnBackground(
                    label.iconCode,
                    label.isPrimaryColumn,
                  ),
                }}
              />
            )
          })}
        </div>
      )}
      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col"
        style={{
          paddingTop: CHART_INSET_TOP,
          paddingRight: CHART_INSET_RIGHT,
          paddingBottom: CHART_INSET_BOTTOM,
          paddingLeft: CHART_INSET_LEFT,
        }}
      >
        <div
          className="flex shrink-0 items-center"
          style={{
            height: CHART_TIME_ROW_HEIGHT_PX + 2 * CHART_TIME_ROW_PADDING_V_PX,
            paddingTop: CHART_TIME_ROW_PADDING_V_PX,
            paddingBottom: CHART_TIME_ROW_PADDING_V_PX,
            marginBottom: CHART_TIME_ROW_PADDING_V_PX + CHART_TOP_RESERVE_PX,
          }}
          aria-hidden
        >
          {layout && (
            <svg
              width={layout.chartWidth}
              height={CHART_TIME_ROW_HEIGHT_PX}
              className="block w-full shrink-0"
              style={{ overflow: 'visible' }}
            >
              {labelData.map((d, i) => {
                const col = columns[i]
                const cx = col.x + col.width / 2
                return (
                  <text
                    key={d.key}
                    x={cx}
                    y={CHART_TIME_ROW_HEIGHT_PX / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="text-big fill-white"
                    style={{
                      ...TIME_LABEL_STYLE,
                      fontWeight: d.isToday ? 'bold' : undefined,
                    }}
                  >
                    {d.time}
                  </text>
                )
              })}
            </svg>
          )}
        </div>
        <div
          ref={chartAreaRef}
          className="relative min-h-0 flex-1"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div
            className="pointer-events-none invisible absolute inset-0 grid"
            style={{
              gridTemplateColumns: gridCols,
              columnGap: CHART_GAP_X,
            }}
            aria-hidden
          >
            {labelData.map((label, i) => (
              <div
                key={label.key}
                className="flex flex-col items-center justify-start px-1"
              >
                {renderCard(label, true, i)}
              </div>
            ))}
          </div>
          {layout && (
            <svg
              className="absolute inset-0 h-full w-full overflow-visible"
              width={layout.chartWidth}
              height={layout.chartHeight}
              style={{ display: 'block' }}
            >
              <g
                transform={`translate(0, ${layout.chartHeight - layout.contentBottom})`}
              >
                {labelData.map((label, i) => {
                  const offsetY =
                    i === 0
                      ? 0
                      : -firstHeight * layout.kMax * (label.temp - firstTemp)
                  const col = columns[i]
                  const dim = layout.cardDims[i]
                  return (
                    <foreignObject
                      key={label.key}
                      x={col.x}
                      y={offsetY}
                      width={col.width}
                      height={dim.height}
                      style={{ overflow: 'visible' }}
                    >
                      <div className="origin-top-left">
                        {renderCard(label, false, i)}
                      </div>
                    </foreignObject>
                  )
                })}
              </g>
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}
