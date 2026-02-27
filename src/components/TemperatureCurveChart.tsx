'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import {
  CANMORE_TZ,
  CHART_GAP_X,
  CHART_INSET_BOTTOM,
  CHART_INSET_LEFT,
  CHART_INSET_RIGHT,
  CHART_INSET_TOP,
  LABEL_OPACITY_STEP_PCT,
  NUM_FORECASTED_HOURS,
  WIND_THRESHOLD_HIGH_KMH,
  WIND_THRESHOLD_LOW_KMH,
} from '@/lib/config'
import type { HourlyForecast } from '@/lib/ec-weather'
import { degreesToCardinal, formatNumeric } from '@/lib/format'
import { twJoin } from 'tailwind-merge'

const SPARK_PATH_STROKE_WIDTH = 10
const SPARK_VIEWBOX_PADDING = SPARK_PATH_STROKE_WIDTH / 2
const K_MAX_ITERATIONS = 20
const K_EPS = 1e-3

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
}

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
): { windNum: number; windDirection: number | null } {
  return { windNum: speed, windDirection: direction }
}

function windIntensityPct(kmh: number): number {
  if (kmh < WIND_THRESHOLD_LOW_KMH) return 0
  if (kmh >= WIND_THRESHOLD_HIGH_KMH) return 100
  return (
    5 +
    ((kmh - WIND_THRESHOLD_LOW_KMH) * (100 - 5)) /
      (WIND_THRESHOLD_HIGH_KMH - WIND_THRESHOLD_LOW_KMH)
  )
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
  gapX: number,
): { x: number; width: number }[] {
  const totalGap = (numCols - 1) * gapX
  const contentWidth = chartWidth - totalGap
  const totalFr = 2 + (numCols - 1)
  const result: { x: number; width: number }[] = []
  let x = 0
  for (let i = 0; i < numCols; i++) {
    const w = ((i === 0 ? 2 : 1) / totalFr) * contentWidth
    result.push({ x, width: w })
    x += w + gapX
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
  const sparkPoints =
    numHours > 1
      ? temps.map((temp, i) => {
          const x = (i / (numHours - 1)) * 100
          const y = range > 0 ? 10 + 80 * (1 - (temp - minTemp) / range) : 50
          return { x, y }
        })
      : [{ x: 50, y: 50 }]
  const sparkPath =
    sparkPoints.length > 1
      ? `M ${sparkPoints.map((p) => `${p.x},${p.y}`).join(' L ')}`
      : ''

  const nowPop = todayPop ?? hourlyForecast[0]?.pop ?? null
  const nowWind = Math.max(windSpeed, windGust)
  const nowWindFmt = formatWind(nowWind, windDirection ?? null)
  const labelData = useMemo(
    () =>
      [
        {
          key: 0,
          time: 'Now',
          temp: currentTemp,
          iconCode: currentIconCode ?? hourlyForecast[0]?.iconCode ?? '00',
          pop: nowPop != null ? `${formatNumeric(nowPop)}%` : null,
          popNum: nowPop,
          windNum: nowWindFmt.windNum,
          windDirection: nowWindFmt.windDirection,
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
            windNum: windFmt.windNum,
            windDirection: windFmt.windDirection,
            isToday: false,
          }
        }),
      ].slice(0, numHours) as LabelDatum[],
    [
      currentTemp,
      hourlyForecast,
      todayPop,
      windSpeed,
      windGust,
      windDirection,
      currentIconCode,
      numHours,
    ],
  )

  const gridCols = `2fr repeat(${numHours - 1}, minmax(0, 1fr))`
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
    const { width: chartWidth, height: chartHeight } =
      chartEl.getBoundingClientRect()
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
  }, [labelData])

  useLayoutEffect(() => {
    const chartEl = chartAreaRef.current
    if (!chartEl) return
    const ro = new ResizeObserver(() => {
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
      const { width: chartWidth, height: chartHeight } =
        chartEl.getBoundingClientRect()
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
    })
    ro.observe(chartEl)
    return () => ro.disconnect()
  }, [labelData])

  const firstHeight = layout?.cardDims[0]?.height ?? 0
  const firstTemp = labelData[0]?.temp ?? 0
  const columns = layout
    ? getColumnLayout(layout.chartWidth, labelData.length, CHART_GAP_X)
    : []

  function renderCard(label: LabelDatum, forMeasure: boolean, index: number) {
    const hasConditional = (label.popNum ?? 0) > 0 || label.windNum > 0
    return (
      <div
        ref={
          forMeasure
            ? (el) => {
                cardRefs.current[index] = el
              }
            : undefined
        }
        className={twJoin(
          'flex w-full flex-col items-center justify-center overflow-hidden',
          'border-foreground',
          label.isToday
            ? ['mx-0', 'border-16', 'rounded-4xl']
            : ['mx-0', 'border-12', 'rounded-2xl'],
        )}
        style={{
          opacity: Math.max(0, (100 - index * LABEL_OPACITY_STEP_PCT) / 100),
        }}
      >
        <div
          className={twJoin(
            'flex w-full items-center justify-center',
            label.isToday
              ? 'px-4 py-6 text-[9rem] leading-[1em] font-black'
              : 'text-huge px-2 py-3',
          )}
        >
          {formatNumeric(label.temp)}°
        </div>
        {hasConditional && (
          <div
            className={twJoin('flex', 'w-full', 'flex-col', 'overflow-hidden')}
          >
            {(label.popNum ?? 0) > 0 && (
              <div
                className={twJoin(
                  'flex items-center justify-center leading-tight',
                  (label.popNum ?? 0) >= 50
                    ? 'text-blue-100'
                    : 'text-blue-900 dark:text-blue-100',
                  label.isToday
                    ? 'px-4 py-2 text-[4rem] font-black'
                    : 'text-small px-2 py-1',
                )}
                style={{
                  backgroundColor: `rgb(29 78 216 / ${label.popNum}%)`,
                }}
              >
                {label.pop}
              </div>
            )}
            {label.windNum > 0 && (
              <div
                className={twJoin(
                  'flex items-center justify-center gap-1 leading-tight',
                  label.isToday
                    ? 'px-4 py-2 text-[4rem] font-black'
                    : 'text-small px-2 py-1',
                  windIntensityPct(label.windNum) > 0
                    ? windIntensityPct(label.windNum) >= 50
                      ? 'text-red-100'
                      : 'text-red-900 dark:text-red-100'
                    : '',
                )}
                style={
                  windIntensityPct(label.windNum) > 0
                    ? {
                        backgroundColor: `rgb(185 28 28 / ${windIntensityPct(label.windNum)}%)`,
                      }
                    : undefined
                }
              >
                {formatNumeric(label.windNum)}
                {label.windDirection != null && (
                  <span
                    className="inline-block"
                    style={{
                      transform: `rotate(${label.windDirection}deg)`,
                    }}
                    aria-label={`From ${degreesToCardinal(label.windDirection)}`}
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
  }

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
        className="flex min-h-0 flex-1 flex-col"
        aria-label={`Temperature outlook: current and next ${NUM_FORECASTED_HOURS} hours`}
      >
        <div
          className="text-small grid shrink-0 place-items-center py-2"
          style={{
            gridTemplateColumns: gridCols,
            width: '100%',
            columnGap: CHART_GAP_X,
          }}
          aria-hidden
        >
          {labelData.map((d, i) => (
            <div
              key={d.key}
              className="flex w-full items-center justify-center"
              style={{
                opacity: Math.max(0, (100 - i * LABEL_OPACITY_STEP_PCT) / 100),
              }}
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
                className={twJoin(
                  'flex flex-col items-center justify-start',
                  label.isToday ? 'px-2' : 'px-1',
                )}
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
