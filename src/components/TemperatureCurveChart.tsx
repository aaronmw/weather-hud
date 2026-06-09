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

interface ColumnSceneRun {
  src: string
  startIndex: number
  endIndex: number
}

type ConditionSceneMatch = 'all' | string[]
type ConditionSceneTime = 'day' | 'night' | 'both'

interface ConditionSceneRule {
  conditions: ConditionSceneMatch
  dayOrNight: ConditionSceneTime
  layers: string[]
}

const CONDITION_SCENES: ConditionSceneRule[] = [
  {
    conditions: 'all',
    dayOrNight: 'night',
    layers: ['/night.png'],
  },
  {
    conditions: 'all',
    dayOrNight: 'day',
    layers: ['/day.png'],
  },
  {
    conditions: [
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
      '12',
      '13',
      '14',
      '19',
      '20',
      '21',
      '22',
      '23',
      '24',
      '25',
      '26',
      '27',
      '28',
      '29',
      '32',
      '33',
      '34',
      '35',
      '36',
      '37',
      '38',
      '39',
      '40',
      '41',
      '42',
      '43',
      '47',
    ],
    dayOrNight: 'both',
    layers: ['/clouds.png'],
  },
  {
    conditions: [
      '06',
      '07',
      '09',
      '12',
      '13',
      '14',
      '15',
      '19',
      '26',
      '27',
      '28',
      '29',
      '39',
      '40',
      '41',
      '42',
      '43',
      '44',
      '45',
      '46',
      '47',
    ],
    dayOrNight: 'both',
    layers: ['/rain.png'],
  },
]

const ORDERED_SCENE_LAYER_SOURCES = CONDITION_SCENES.reduce<string[]>(
  (sources, rule) => {
    for (const src of rule.layers) {
      if (!sources.includes(src)) sources.push(src)
    }
    return sources
  },
  [],
)

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

function sceneRuleMatchesTime(
  ruleTime: ConditionSceneTime,
  isDaylight: boolean,
): boolean {
  return (
    ruleTime === 'both' ||
    (ruleTime === 'day' && isDaylight) ||
    (ruleTime === 'night' && !isDaylight)
  )
}

function sceneRuleMatchesCondition(
  ruleConditions: ConditionSceneMatch,
  iconCode: string,
): boolean {
  return ruleConditions === 'all' || ruleConditions.includes(iconCode)
}

function getColumnSceneLayerSources(label: LabelDatum): string[] {
  return CONDITION_SCENES.flatMap((rule) =>
    sceneRuleMatchesTime(rule.dayOrNight, label.isDaylight) &&
    sceneRuleMatchesCondition(rule.conditions, label.iconCode)
      ? rule.layers
      : [],
  )
}

function getColumnSceneRuns(labelData: LabelDatum[]): ColumnSceneRun[] {
  const layerSets = labelData.map((label) => {
    return new Set(getColumnSceneLayerSources(label))
  })

  return ORDERED_SCENE_LAYER_SOURCES.flatMap((src) => {
    const runs: ColumnSceneRun[] = []
    let index = 0
    while (index < layerSets.length) {
      if (!layerSets[index].has(src)) {
        index += 1
        continue
      }
      const startIndex = index
      while (index + 1 < layerSets.length && layerSets[index + 1].has(src)) {
        index += 1
      }
      runs.push({ src, startIndex, endIndex: index })
      index += 1
    }
    return runs
  })
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
  const sceneRuns = layout ? getColumnSceneRuns(labelData) : []

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
          {sceneRuns.map((run) => {
            const firstCol = columns[run.startIndex]
            const lastCol = columns[run.endIndex]
            return (
              <div
                key={`${run.src}-${run.startIndex}-${run.endIndex}`}
                className="absolute top-0 bottom-0"
                style={{
                  left: firstCol.x,
                  width: lastCol.x + lastCol.width - firstCol.x,
                  backgroundImage: `url("${run.src}")`,
                  backgroundPosition: 'top left',
                  backgroundRepeat: 'repeat-x',
                  backgroundSize: 'auto 100%',
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
