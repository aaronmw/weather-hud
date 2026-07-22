'use client'

import Image from 'next/image'
import {
  type ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
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
import { getConditionPresentation } from '@/lib/condition-icons'
import { formatNumeric } from '@/lib/format'
import { getSunTimes } from '@/lib/sun'
import { twJoin } from 'tailwind-merge'

const K_MAX_ITERATIONS = 20
const K_EPS = 1e-3
const HIGH_WIND_THRESHOLD_KMH = 20
const TIME_LABEL_STYLE = { fontSize: 'min(5.76vh, 30.24cqw)' }
const DAY_NIGHT_TILE_COUNT = 16
const DAY_NIGHT_TILE_WIDTH_CQH = (588 / 1954) * 100
const CLOUD_LAYER_WIDTH_CQH = (2782 / 1954) * 100
const LIGHTNING_LAYER_WIDTH_CQH = (739 / 977) * 100
const CLOUD_DRIFT_DURATION_SECONDS = 150
const LIGHTNING_MIN_INTERVAL_MS = 3_000
const LIGHTNING_MAX_INTERVAL_MS = 6_000
const STARTUP_LAYOUT_POLL_DURATION_MS = 15_000
const STARTUP_LAYOUT_POLL_INTERVAL_MS = 1_000

const CLOUD_DRIFT_SPRITES = [
  { id: 'base', timelineOffsetPercent: 50 },
  {
    id: 'bottom-right-small',
    scaleClassName: 'origin-bottom-right scale-30',
    timelineOffsetPercent: 25,
  },
  {
    id: 'top-left-small',
    scaleClassName: 'origin-top-left scale-55',
    timelineOffsetPercent: 75,
  },
]

interface ColumnSceneRun {
  layer: SceneLayerDefinition
  startIndex: number
  endIndex: number
}

interface SceneLayerDefinition {
  id: string
  renderElement: (animated: boolean) => ReactElement
}

function TiledSceneLayer({ src }: { src: string }) {
  return (
    <div className="[container-type:size] absolute inset-0 overflow-hidden">
      {Array.from({ length: DAY_NIGHT_TILE_COUNT }, (_, index) => (
        <span
          key={index}
          className="absolute top-0 bottom-0"
          style={{
            left: `calc(${index} * ${DAY_NIGHT_TILE_WIDTH_CQH}cqh)`,
            width: `${DAY_NIGHT_TILE_WIDTH_CQH}cqh`,
          }}
        >
          <Image
            src={src}
            alt=""
            fill
            sizes={`${DAY_NIGHT_TILE_WIDTH_CQH}cqh`}
            className="object-fill"
          />
        </span>
      ))}
    </div>
  )
}

function CloudDriftSprite({
  animated,
  scaleClassName,
  timelineOffsetPercent,
}: {
  animated: boolean
  scaleClassName?: string
  timelineOffsetPercent: number
}) {
  return (
    <span
      className={twJoin(
        'absolute top-0 bottom-0 left-0',
        animated && 'weather-cloud-drift',
      )}
      style={{
        animationDelay: animated
          ? `-${(CLOUD_DRIFT_DURATION_SECONDS * timelineOffsetPercent) / 100}s`
          : undefined,
        width: `${CLOUD_LAYER_WIDTH_CQH}cqh`,
      }}
    >
      <span className={twJoin('absolute inset-0', scaleClassName)}>
        <Image
          src="/clouds-low.png"
          alt=""
          fill
          sizes={`${CLOUD_LAYER_WIDTH_CQH}cqh`}
          className="object-fill"
        />
      </span>
    </span>
  )
}

function CloudSceneLayer({ animated }: { animated: boolean }) {
  return (
    <div className="weather-cloud-fade-in [container-type:size] absolute inset-0 overflow-hidden">
      {[0, 50].flatMap((phaseOffset) =>
        CLOUD_DRIFT_SPRITES.map((sprite) => (
          <CloudDriftSprite
            key={`${sprite.id}-${phaseOffset}`}
            animated={animated}
            scaleClassName={sprite.scaleClassName}
            timelineOffsetPercent={
              (sprite.timelineOffsetPercent + phaseOffset) % 100
            }
          />
        )),
      )}
    </div>
  )
}

function RainSceneLayer({ animated }: { animated: boolean }) {
  return (
    <div
      className={twJoin(
        'absolute inset-0 overflow-hidden',
        !animated && 'weather-cloud-fade-in',
      )}
    >
      <Image
        src="/rain-low.png"
        alt=""
        fill
        sizes="100vw"
        className={twJoin(animated && 'weather-rain-fall', 'object-cover')}
      />
      {animated && (
        <Image
          src="/rain-low.png"
          alt=""
          fill
          sizes="100vw"
          className="weather-rain-fall object-cover"
          style={{ animationDelay: '-0.5s' }}
        />
      )}
    </div>
  )
}

function LensFlareSceneLayer() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <Image
        src="/lens-flare.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-70 mix-blend-screen"
      />
    </div>
  )
}

function getRandomLightningDelayMs(): number {
  return (
    LIGHTNING_MIN_INTERVAL_MS +
    Math.random() * (LIGHTNING_MAX_INTERVAL_MS - LIGHTNING_MIN_INTERVAL_MS)
  )
}

function LightningSceneLayer() {
  const strikeRef = useRef<HTMLSpanElement>(null)
  const afterglowRef = useRef<HTMLSpanElement>(null)
  const flashRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let timeoutId: number | null = null

    function triggerStrike() {
      const strikeEl = strikeRef.current
      const afterglowEl = afterglowRef.current
      const flashEl = flashRef.current
      if (strikeEl && afterglowEl && flashEl) {
        strikeEl.style.left = `${Math.random() * 100}%`
        afterglowEl.classList.remove('weather-lightning-afterglow')
        flashEl.classList.remove('weather-lightning-flash')
        void afterglowEl.offsetWidth
        afterglowEl.classList.add('weather-lightning-afterglow')
        flashEl.classList.add('weather-lightning-flash')
      }
      scheduleStrike()
    }

    function scheduleStrike() {
      timeoutId = window.setTimeout(() => {
        triggerStrike()
      }, getRandomLightningDelayMs())
    }

    scheduleStrike()
    return () => {
      if (timeoutId != null) window.clearTimeout(timeoutId)
    }
  }, [])

  return (
    <div className="[container-type:size] absolute inset-0 overflow-hidden">
      <span
        ref={strikeRef}
        className="absolute top-0 bottom-0 -translate-x-1/2"
        style={{
          left: '50%',
          width: `${LIGHTNING_LAYER_WIDTH_CQH}cqh`,
        }}
      >
        <span
          ref={afterglowRef}
          className="absolute inset-0 opacity-0"
        >
          <Image
            src="/lightning-afterglow.png"
            alt=""
            fill
            sizes={`${LIGHTNING_LAYER_WIDTH_CQH}cqh`}
            className="object-fill"
          />
        </span>
        <span
          ref={flashRef}
          className="absolute inset-0 opacity-0"
        >
          <Image
            src="/lightning-flash.png"
            alt=""
            fill
            sizes={`${LIGHTNING_LAYER_WIDTH_CQH}cqh`}
            className="object-fill"
          />
        </span>
      </span>
    </div>
  )
}

const SCENE_LAYERS = {
  night: {
    id: 'night',
    renderElement: () => <TiledSceneLayer src="/night.png" />,
  },
  day: {
    id: 'day',
    renderElement: () => <TiledSceneLayer src="/day.png" />,
  },
  lensFlare: {
    id: 'lens-flare',
    renderElement: () => <LensFlareSceneLayer />,
  },
  dayCloudy: {
    id: 'day-cloudy',
    renderElement: () => <TiledSceneLayer src="/day-cloudy.png" />,
  },
  clouds: {
    id: 'clouds',
    renderElement: (animated) => <CloudSceneLayer animated={animated} />,
  },
  skyStormy: {
    id: 'sky-stormy',
    renderElement: () => <TiledSceneLayer src="/sky-stormy.png" />,
  },
  rain: {
    id: 'rain',
    renderElement: (animated) => <RainSceneLayer animated={animated} />,
  },
  lightning: {
    id: 'lightning',
    renderElement: () => <LightningSceneLayer />,
  },
} satisfies Record<string, SceneLayerDefinition>

const ORDERED_SCENE_LAYERS = [
  SCENE_LAYERS.night,
  SCENE_LAYERS.day,
  SCENE_LAYERS.lensFlare,
  SCENE_LAYERS.dayCloudy,
  SCENE_LAYERS.clouds,
  SCENE_LAYERS.skyStormy,
  SCENE_LAYERS.rain,
  SCENE_LAYERS.lightning,
]

interface LabelDatum {
  key: number
  time: string
  temp: number
  condition: string
  iconCode: string
  pop: string | null
  popNum: number | null
  windNum: number
  windDirection: number | null
  usAqi: number | null
  isToday: boolean
  isPrimaryColumn: boolean
  isDaylight: boolean
  showTemp: boolean
  showPopBadge: boolean
  showWindBadge: boolean
  isPopBadgeCondensed: boolean
  isWindBadgeCondensed: boolean
}

interface TemperatureCurveChartProps {
  animated?: boolean
  currentTemp: number
  hourlyForecast: HourlyForecast[]
  windSpeed?: number
  windGust?: number
  windDirection?: number | null
  currentPop?: number | null
  currentCondition?: string
  currentUsAqi?: number | null
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

function getColumnSceneLayers(label: LabelDatum): SceneLayerDefinition[] {
  const condition = getConditionPresentation(label.iconCode, label.condition)
  const layers: SceneLayerDefinition[] = []

  if (label.isDaylight) {
    layers.push(
      condition.usesDayCloudySky ? SCENE_LAYERS.dayCloudy : SCENE_LAYERS.day,
    )
    if (condition.showsLensFlare) layers.push(SCENE_LAYERS.lensFlare)
  } else {
    layers.push(SCENE_LAYERS.night)
  }
  if (condition.hasClouds) layers.push(SCENE_LAYERS.clouds)
  if (condition.showsStormSky) layers.push(SCENE_LAYERS.skyStormy)
  if (condition.showsRain) layers.push(SCENE_LAYERS.rain)
  if (condition.showsLightning) layers.push(SCENE_LAYERS.lightning)

  return layers
}

function getColumnSceneRuns(labelData: LabelDatum[]): ColumnSceneRun[] {
  const layerSets = labelData.map((label) => {
    return new Set(getColumnSceneLayers(label).map((layer) => layer.id))
  })

  return ORDERED_SCENE_LAYERS.flatMap((layer) => {
    const runs: ColumnSceneRun[] = []
    let index = 0
    while (index < layerSets.length) {
      if (!layerSets[index].has(layer.id)) {
        index += 1
        continue
      }
      const startIndex = index
      while (
        index + 1 < layerSets.length &&
        layerSets[index + 1].has(layer.id)
      ) {
        index += 1
      }
      runs.push({ layer, startIndex, endIndex: index })
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
  animated = true,
  currentTemp,
  hourlyForecast,
  windSpeed = 0,
  windGust = 0,
  windDirection = null,
  currentPop = null,
  currentCondition = '',
  currentUsAqi = null,
  iconCode: currentIconCode,
  currentDateMs,
}: TemperatureCurveChartProps) {
  const temps = [currentTemp, ...hourlyForecast.map((h) => h.temp)].slice(
    0,
    NUM_FORECASTED_HOURS + 1,
  )
  const numHours = temps.length

  const nowPop = currentPop ?? null
  const nowWind = Math.max(windSpeed, windGust)
  const nowWindFmt = formatWind(nowWind, windDirection ?? null)
  const currentDate = useMemo(() => new Date(currentDateMs), [currentDateMs])
  const labelData = useMemo(() => {
    const labels = [
      {
        key: 0,
        time: 'NOW',
        temp: currentTemp,
        condition: currentCondition,
        iconCode: currentIconCode ?? hourlyForecast[0]?.iconCode ?? '00',
        pop: nowPop != null ? `${formatNumeric(nowPop)}%` : null,
        popNum: nowPop,
        windNum: nowWindFmt.windNum,
        windDirection: nowWindFmt.windDirection,
        usAqi: currentUsAqi,
        isToday: true,
        isPrimaryColumn: true,
        isDaylight: isDaylightAt(currentDate),
        showTemp: true,
        showPopBadge: (nowPop ?? 0) > 0,
        showWindBadge: false,
        isPopBadgeCondensed: false,
        isWindBadgeCondensed: false,
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
          condition: h.condition,
          iconCode: h.iconCode,
          pop: h.pop != null ? `${formatNumeric(h.pop)}%` : null,
          popNum: h.pop,
          windNum: windFmt.windNum,
          windDirection: windFmt.windDirection,
          usAqi: h.usAqi,
          isToday: false,
          isPrimaryColumn: false,
          isDaylight: isDaylightAt(
            typeof h.utc === 'string' ? new Date(h.utc) : h.utc,
          ),
          showTemp: false,
          showPopBadge: true,
          showWindBadge: false,
          isPopBadgeCondensed: false,
          isWindBadgeCondensed: false,
        }
      }),
    ].slice(0, numHours) as LabelDatum[]

    return labels.map((label, index) => {
      const previous = labels[index - 1]
      if (!previous) return label
      const isPopRepeated = (label.popNum ?? 0) === (previous.popNum ?? 0)
      const isWindRepeated = label.windNum === previous.windNum
      return {
        ...label,
        showTemp: true,
        showPopBadge: (label.popNum ?? 0) > 0,
        showWindBadge: label.windNum > HIGH_WIND_THRESHOLD_KMH,
        isPopBadgeCondensed: (label.popNum ?? 0) > 0 && isPopRepeated,
        isWindBadgeCondensed: isWindRepeated,
      }
    })
  }, [
    currentTemp,
    currentIconCode,
    currentCondition,
    currentDate,
    currentUsAqi,
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

  const updateLayoutFromMeasurements = useCallback(() => {
    const chartEl = chartAreaRef.current
    if (!chartEl) return false
    const cardEls = cardRefs.current
    const dims = cardEls.slice(0, labelData.length).map((el) =>
      el
        ? {
            width: el.getBoundingClientRect().width,
            height: el.getBoundingClientRect().height,
          }
        : { width: 0, height: 0 },
    )
    if (dims.some((d) => d.height === 0)) return false
    updateLayout(chartEl, dims)
    return true
  }, [labelData.length, updateLayout])

  useLayoutEffect(() => {
    const chartEl = chartAreaRef.current
    if (!chartEl) return

    let frameId: number | null = null
    const scheduleLayout = () => {
      if (frameId != null) cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        frameId = null
        updateLayoutFromMeasurements()
      })
    }

    const ro = new ResizeObserver(scheduleLayout)
    ro.observe(chartEl)
    cardRefs.current
      .slice(0, labelData.length)
      .forEach((el) => el && ro.observe(el))

    updateLayoutFromMeasurements()
    scheduleLayout()

    const timeoutIds = [100, 500, 1500].map((delay) =>
      window.setTimeout(scheduleLayout, delay),
    )
    const startupPollId = window.setInterval(
      scheduleLayout,
      STARTUP_LAYOUT_POLL_INTERVAL_MS,
    )
    const stopStartupPollId = window.setTimeout(
      () => window.clearInterval(startupPollId),
      STARTUP_LAYOUT_POLL_DURATION_MS,
    )
    void document.fonts?.ready.then(scheduleLayout)
    window.addEventListener('resize', scheduleLayout)
    return () => {
      if (frameId != null) cancelAnimationFrame(frameId)
      timeoutIds.forEach((id) => window.clearTimeout(id))
      window.clearInterval(startupPollId)
      window.clearTimeout(stopStartupPollId)
      ro.disconnect()
      window.removeEventListener('resize', scheduleLayout)
    }
  }, [labelData.length, updateLayoutFromMeasurements])

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
        condition={label.condition}
        iconCode={label.iconCode}
        pop={label.pop}
        popNum={label.popNum}
        windNum={label.windNum}
        windDirection={label.windDirection}
        usAqi={label.usAqi}
        isDaylight={label.isDaylight}
        isPrimaryColumn={label.isPrimaryColumn}
        showTemp={label.showTemp}
        showPopBadge={label.showPopBadge}
        showWindBadge={label.showWindBadge}
        isPopBadgeCondensed={label.isPopBadgeCondensed}
        isWindBadgeCondensed={label.isWindBadgeCondensed}
        animated={animated}
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
                key={`${run.layer.id}-${run.startIndex}-${run.endIndex}`}
                className="absolute top-0 bottom-0 overflow-hidden"
                style={{
                  left: firstCol.x,
                  width: lastCol.x + lastCol.width - firstCol.x,
                }}
              >
                {run.layer.renderElement(animated)}
              </div>
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
            <div className="absolute inset-0 overflow-visible">
              {labelData.map((label, i) => {
                const offsetY =
                  i === 0
                    ? 0
                    : -firstHeight * layout.kMax * (label.temp - firstTemp)
                const col = columns[i]
                const dim = layout.cardDims[i]
                return (
                  <div
                    key={label.key}
                    className="absolute overflow-visible"
                    style={{
                      height: dim.height,
                      left: col.x,
                      top: layout.chartHeight - layout.contentBottom + offsetY,
                      width: col.width,
                    }}
                  >
                    {renderCard(label, false, i)}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
