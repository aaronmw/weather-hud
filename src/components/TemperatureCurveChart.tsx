'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { WeatherConditionCard } from '@/components/WeatherConditionCard'
import {
  CANMORE_TZ,
  CHART_GAP_X,
  CHART_INSET_BOTTOM,
  CHART_INSET_LEFT,
  CHART_INSET_RIGHT,
  CHART_INSET_TOP,
  CHART_TIME_ROW_HEIGHT_PX,
  CHART_TIME_ROW_PADDING_V_PX,
  CHART_TOP_RESERVE_PX,
  LABEL_OPACITY_STEP_PCT,
  NUM_FORECASTED_HOURS,
  FREEZE_ZONE_CLASSES,
  WEATHER_CARD_BORDER_RADIUS_PX,
  WEATHER_CARD_BORDER_RING_PX,
} from '@/lib/config'
import type { HourlyForecast } from '@/lib/ec-weather'
import { formatNumeric } from '@/lib/format'
import { twJoin } from 'tailwind-merge'

const SPARK_PATH_STROKE_WIDTH = 10
const SPARK_VIEWBOX_PADDING = SPARK_PATH_STROKE_WIDTH / 2
const K_MAX_ITERATIONS = 20
const K_EPS = 1e-3
const NOW_CARD_SCALE = 2

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
  const nowCardHeight = (cardDims[0]?.height ?? 0) * NOW_CARD_SCALE
  for (let iter = 0; iter < K_MAX_ITERATIONS; iter++) {
    const k = (kLo + kHi) / 2
    let contentTop = 0
    let contentBottom = 0
    for (let i = 0; i < labelData.length; i++) {
      const offsetY =
        i === 0 ? 0 : -firstHeight * k * (labelData[i].temp - firstTemp)
      const top = offsetY
      const bottom =
        offsetY + (i === 0 ? nowCardHeight : cardDims[i].height)
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
    contentBottom = Math.max(
      contentBottom,
      offsetY + (i === 0 ? nowCardHeight : cardDims[i].height),
    )
  }
  return { kMax, contentTop, contentBottom }
}

function gapAfterColumn(
  index: number,
  baseGap: number,
  ringPx: number,
  nowScale: number,
): number {
  const rightOverflow = index === 0 ? ringPx * nowScale : ringPx
  return baseGap + rightOverflow + ringPx
}

function getColumnLayout(
  chartWidth: number,
  numCols: number,
  baseGap: number,
  ringPx: number,
  nowScale: number,
): { x: number; width: number }[] {
  let totalGap = 0
  for (let i = 0; i < numCols - 1; i++) {
    totalGap += gapAfterColumn(i, baseGap, ringPx, nowScale)
  }
  const contentWidth = chartWidth - totalGap
  const totalFr = 2 + (numCols - 1)
  const result: { x: number; width: number }[] = []
  let x = 0
  for (let i = 0; i < numCols; i++) {
    const w = ((i === 0 ? 2 : 1) / totalFr) * contentWidth
    result.push({ x, width: w })
    if (i < numCols - 1) x += w + gapAfterColumn(i, baseGap, ringPx, nowScale)
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

  const nowPop = todayPop ?? null
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
    zeroLineY: number
    showFreezeTint: boolean
    chartRectLeft: number
    chartRectTop: number
    viewportWidth: number
    viewportHeight: number
  } | null>(null)

  function updateLayout(
    chartEl: HTMLDivElement,
    dims: { width: number; height: number }[],
  ) {
    const chartRect = chartEl.getBoundingClientRect()
    const chartWidth = chartRect.width
    const chartHeight = chartRect.height
    if (chartHeight <= 0) return
    const { kMax, contentTop, contentBottom } = computeLayout(
      chartHeight,
      dims,
      labelData,
    )
    const zeroLineY = (dims[0]?.height ?? 0) * kMax * (labelData[0]?.temp ?? 0)
    const freezeTintHeight = Math.max(0, contentBottom - zeroLineY)
    const showFreezeTint = freezeTintHeight > 0
    setLayout({
      chartWidth,
      chartHeight,
      cardDims: dims,
      kMax,
      contentTop,
      contentBottom,
      zeroLineY,
      showFreezeTint,
      chartRectLeft: chartRect.left,
      chartRectTop: chartRect.top,
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.documentElement.clientHeight,
    })
  }

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
  }, [labelData])

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
  }, [labelData])

  const firstHeight = layout?.cardDims[0]?.height ?? 0
  const firstTemp = labelData[0]?.temp ?? 0
  const columns = layout
    ? getColumnLayout(
        layout.chartWidth,
        labelData.length,
        CHART_GAP_X,
        WEATHER_CARD_BORDER_RING_PX,
        NOW_CARD_SCALE,
      )
    : []

  function renderCard(label: LabelDatum, forMeasure: boolean, index: number) {
    const opacity = Math.max(0, (100 - index * LABEL_OPACITY_STEP_PCT) / 100)
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
        pop={label.pop}
        popNum={label.popNum}
        windNum={label.windNum}
        windDirection={label.windDirection}
        opacity={opacity}
      />
    )
    return card
  }

  const freezeTintBandTop = layout
    ? layout.chartHeight - layout.contentBottom + layout.zeroLineY
    : 0
  const freezeTintHeightToViewportBottom = layout
    ? layout.viewportHeight - layout.chartRectTop - freezeTintBandTop
    : 0

  return (
    <div
      className="fixed inset-0 flex h-screen w-screen flex-col overflow-visible"
      aria-label={`Temperature outlook: current and next ${NUM_FORECASTED_HOURS} hours`}
    >
      <div
        className="flex min-h-0 flex-1 flex-col"
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
            height:
              CHART_TIME_ROW_HEIGHT_PX + 2 * CHART_TIME_ROW_PADDING_V_PX,
            paddingTop: CHART_TIME_ROW_PADDING_V_PX,
            paddingBottom: CHART_TIME_ROW_PADDING_V_PX,
            marginBottom:
              CHART_TIME_ROW_PADDING_V_PX + CHART_TOP_RESERVE_PX,
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
                const opacity = Math.max(
                  0,
                  (100 - i * LABEL_OPACITY_STEP_PCT) / 100,
                )
                return (
                  <text
                    key={d.key}
                    x={cx}
                    y={CHART_TIME_ROW_HEIGHT_PX / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-foreground text-small"
                    style={{
                      opacity,
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
                className={twJoin(
                  'flex flex-col items-center justify-start',
                  label.isToday ? 'px-2' : 'px-1',
                )}
              >
                {renderCard(label, true, i)}
              </div>
            ))}
          </div>
          {layout?.showFreezeTint && (
            <>
              <svg
                className="pointer-events-none absolute"
                width={layout.viewportWidth}
                height={freezeTintHeightToViewportBottom}
                aria-hidden
                style={{ left: 0, top: 0, overflow: 'visible' }}
              >
                <defs>
                  <mask
                    id="freezeTintMask"
                    maskUnits="userSpaceOnUse"
                    maskContentUnits="userSpaceOnUse"
                    x={0}
                    y={0}
                    width={layout.viewportWidth}
                    height={freezeTintHeightToViewportBottom}
                  >
                    <rect
                      x={0}
                      y={0}
                      width={layout.viewportWidth}
                      height={freezeTintHeightToViewportBottom}
                      fill="white"
                    />
                    {labelData.map((_, i) => {
                      const offsetY =
                        i === 0
                          ? 0
                          : -firstHeight *
                            layout.kMax *
                            (labelData[i].temp - firstTemp)
                      const col = columns[i]
                      const cardHeight =
                        i === 0
                          ? layout.cardDims[0].height * NOW_CARD_SCALE
                          : layout.cardDims[i].height
                      const cardRadius =
                        i === 0
                          ? WEATHER_CARD_BORDER_RADIUS_PX * NOW_CARD_SCALE
                          : WEATHER_CARD_BORDER_RADIUS_PX
                      const cutoutX =
                        layout.chartRectLeft + col.x - WEATHER_CARD_BORDER_RING_PX
                      const cutoutY =
                        offsetY - layout.zeroLineY - WEATHER_CARD_BORDER_RING_PX
                      const cutoutW =
                        col.width + 2 * WEATHER_CARD_BORDER_RING_PX
                      const cutoutH =
                        cardHeight + 2 * WEATHER_CARD_BORDER_RING_PX
                      const cutoutRx = cardRadius + WEATHER_CARD_BORDER_RING_PX
                      return (
                        <rect
                          key={labelData[i].key}
                          x={cutoutX}
                          y={cutoutY}
                          width={cutoutW}
                          height={cutoutH}
                          rx={cutoutRx}
                          ry={cutoutRx}
                          fill="black"
                        />
                      )
                    })}
                  </mask>
                </defs>
              </svg>
              <div
                className={FREEZE_ZONE_CLASSES}
                style={{
                  top: freezeTintBandTop,
                  left: -layout.chartRectLeft,
                  width: layout.viewportWidth,
                  height: freezeTintHeightToViewportBottom,
                  mask: 'url(#freezeTintMask)',
                  WebkitMask: 'url(#freezeTintMask)',
                  maskSize: `${layout.viewportWidth}px ${freezeTintHeightToViewportBottom}px`,
                  WebkitMaskSize: `${layout.viewportWidth}px ${freezeTintHeightToViewportBottom}px`,
                }}
                aria-hidden
              />
            </>
          )}
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
                      <div
                        className={twJoin(
                          'origin-top-left',
                          i === 0 && 'scale-200 w-1/2',
                        )}
                      >
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
