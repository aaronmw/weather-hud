'use client'

import { DevPanel } from '@/components/DevPanel'
import { PreventBurnIn } from '@/components/PreventBurnIn'
import { TemperatureCurveChart } from '@/components/TemperatureCurveChart'
import {
  BURN_IN_BOUNCE_SPEED_PX_PER_SECOND,
  CANMORE_TZ,
  NUM_FORECASTED_HOURS,
  REFRESH_INTERVAL_MS,
} from '@/lib/config'
import { describeIconCode, type WeatherData } from '@/lib/ec-weather'
import { useEffect, useState } from 'react'
import { twJoin } from 'tailwind-merge'

const DEV_FORECAST_HOURS = 7
const TEMP_MIN_C = -30
const TEMP_MAX_C = 30
const WIND_MIN_KMH = 0
const WIND_MAX_KMH = 100
const POP_MIN_PCT = 0
const POP_MAX_PCT = 100
const DEV_CONDITION_CODES = ['00', '01', '02', '03', '10', '12', '16', '39']
const DEV_CONDITION_WEIGHTS = [10, 16, 24, 16, 12, 14, 5, 3]
const DEFAULT_TEXT_SHADOW = '0px 5px 20px rgba(0,0,0,0.5)'
const DEFAULT_FAN_SHADOW_PARTS = {
  x: '0px',
  y: '5px',
  blur: '20px',
  color: 'rgba(0, 0, 0, 0.5)',
}
const NO_FAN_SHADOW_PARTS = {
  x: '0px',
  y: '0px',
  blur: '0px',
  color: 'transparent',
}
const DEV_CONDITION_TRANSITIONS: Record<string, string[]> = {
  '00': ['00', '01', '02'],
  '01': ['00', '01', '02', '03'],
  '02': ['01', '02', '03', '10'],
  '03': ['02', '03', '10', '12'],
  '10': ['03', '10', '12', '16'],
  '12': ['03', '10', '12', '16', '39'],
  '16': ['10', '12', '16'],
  '39': ['10', '12', '39'],
}
const DEV_POP_CONDITION_CODES = new Set(['12', '39'])
function fetchWeather() {
  return fetch('/api/weather').then((res) => {
    if (!res.ok) throw new Error(res.statusText)
    return res.json()
  })
}

function formatLastSynced(msAgo: number): string {
  const sec = Math.floor(msAgo / 1000)
  if (sec < 60) return `Last synced ${sec} second${sec === 1 ? '' : 's'} ago`
  const min = Math.floor(sec / 60)
  return `Last synced ${min} minute${min === 1 ? '' : 's'} ago`
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function randomInt(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min))
}

function roundToNearestTen(value: number): number {
  return Math.round(value / 10) * 10
}

function randomNowTemp(): number {
  return Math.round(
    (randomInt(TEMP_MIN_C, TEMP_MAX_C) + randomInt(TEMP_MIN_C, TEMP_MAX_C)) / 2,
  )
}

function randomNowWind(): number {
  return Math.round(WIND_MAX_KMH * Math.random() ** 2.8)
}

function randomNowPop(): number {
  return clamp(
    roundToNearestTen(POP_MAX_PCT * Math.random() ** 1.8),
    POP_MIN_PCT,
    POP_MAX_PCT,
  )
}

function randomTempNudge(): number {
  return Math.random() < 0.15 ? randomInt(-5, 5) : randomInt(-2, 2)
}

function randomWindNudge(): number {
  return Math.random() < 0.15 ? randomInt(-30, 30) : randomInt(-10, 10)
}

function randomPopNudge(): number {
  const nudges = [-20, -10, 0, 10, 20]
  return nudges[randomInt(0, nudges.length - 1)] ?? 0
}

function randomWeightedConditionCode(): string {
  const total = DEV_CONDITION_WEIGHTS.reduce((sum, weight) => sum + weight, 0)
  let cursor = Math.random() * total
  for (let i = 0; i < DEV_CONDITION_CODES.length; i++) {
    cursor -= DEV_CONDITION_WEIGHTS[i] ?? 0
    if (cursor <= 0) return DEV_CONDITION_CODES[i] ?? '02'
  }
  return '02'
}

function randomNextConditionCode(previous: string): string {
  if (Math.random() < 0.65) return previous
  const options = DEV_CONDITION_TRANSITIONS[previous] ?? DEV_CONDITION_CODES
  return options[randomInt(0, options.length - 1)] ?? previous
}

function conditionCanHavePop(iconCode: string): boolean {
  return DEV_POP_CONDITION_CODES.has(iconCode)
}

function formatConsoleHour(utc: Date | string): string {
  const date = typeof utc === 'string' ? new Date(utc) : utc
  return date.toLocaleTimeString('en-CA', {
    timeZone: CANMORE_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  })
}

function logFetchedWeatherData(d: WeatherData): void {
  const nowPop = d.sevenDayForecast[0]?.pop ?? d.hourlyForecast[0]?.pop ?? null
  const rows = [
    {
      hour: 'Now',
      condition: d.condition || describeIconCode(d.iconCode),
      iconCode: d.iconCode,
      tempC: d.currentTemp,
      popPct: nowPop,
      windKmh: Math.max(d.windSpeed, d.windGust),
      windSpeedKmh: d.windSpeed,
      windGustKmh: d.windGust,
    },
    ...d.hourlyForecast.slice(0, NUM_FORECASTED_HOURS).map((hour) => ({
      hour: formatConsoleHour(hour.utc),
      condition: describeIconCode(hour.iconCode),
      iconCode: hour.iconCode,
      tempC: hour.temp,
      popPct: hour.pop,
      windKmh: Math.max(hour.windSpeed, hour.windGust),
      windSpeedKmh: hour.windSpeed,
      windGustKmh: hour.windGust,
    })),
  ]

  console.info(`[Weather HUD] fetched weather data for ${d.location}`, rows)
  console.table(rows)
}

function splitCssShadowLayers(value: string): string[] {
  const layers: string[] = []
  let layerStart = 0
  let depth = 0

  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if (char === '(') depth += 1
    if (char === ')') depth = Math.max(0, depth - 1)
    if (char === ',' && depth === 0) {
      layers.push(value.slice(layerStart, i).trim())
      layerStart = i + 1
    }
  }

  layers.push(value.slice(layerStart).trim())
  return layers.filter(Boolean)
}

function getFanShadowParts(textShadow: string): typeof DEFAULT_FAN_SHADOW_PARTS {
  const probe = document.createElement('span')
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  probe.style.textShadow = textShadow
  document.body.append(probe)

  const computedTextShadow = getComputedStyle(probe).textShadow
  probe.remove()

  const firstLayer = splitCssShadowLayers(computedTextShadow)[0]
  if (!firstLayer || firstLayer === 'none') return NO_FAN_SHADOW_PARTS

  const lengths = firstLayer.match(/-?\d*\.?\d+px/g) ?? []
  if (lengths.length < 2) return NO_FAN_SHADOW_PARTS

  return {
    x: lengths[0] ?? DEFAULT_FAN_SHADOW_PARTS.x,
    y: lengths[1] ?? DEFAULT_FAN_SHADOW_PARTS.y,
    blur: lengths[2] ?? '0px',
    color:
      firstLayer.replace(/-?\d*\.?\d+px/g, '').trim() ||
      DEFAULT_FAN_SHADOW_PARTS.color,
  }
}

function areWeatherAnimationsEnabled(search: string): boolean {
  return new URLSearchParams(search).get('animated') !== 'false'
}

export default function Home() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [weatherAnimationsEnabled, setWeatherAnimationsEnabled] = useState(
    () =>
      typeof window === 'undefined'
        ? true
        : areWeatherAnimationsEnabled(window.location.search),
  )

  const onRefresh = (d: WeatherData) => {
    logFetchedWeatherData(d)
    setData(d)
    setError(null)
    setLastSyncTime(Date.now())
  }

  useEffect(() => {
    fetchWeather()
      .then(onRefresh)
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    const id = setInterval(
      () =>
        fetchWeather()
          .then(onRefresh)
          .catch((err) => setError(err.message)),
      REFRESH_INTERVAL_MS,
    )
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!lastSyncTime) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [lastSyncTime])

  useEffect(() => {
    const syncWeatherAnimationsEnabled = () => {
      setWeatherAnimationsEnabled(
        areWeatherAnimationsEnabled(window.location.search),
      )
    }

    window.addEventListener('popstate', syncWeatherAnimationsEnabled)
    return () =>
      window.removeEventListener('popstate', syncWeatherAnimationsEnabled)
  }, [])

  const [devPanelOpen, setDevPanelOpen] = useState(false)
  const [selectedHour, setSelectedHour] = useState(0)
  const [temperatureOffsets, setTemperatureOffsets] = useState<number[]>(() =>
    Array(DEV_FORECAST_HOURS).fill(0),
  )
  const [windSpeedOffsets, setWindSpeedOffsets] = useState<number[]>(() =>
    Array(DEV_FORECAST_HOURS).fill(0),
  )
  const [popOffsets, setPopOffsets] = useState<number[]>(() =>
    Array(DEV_FORECAST_HOURS).fill(0),
  )
  const [conditionCodeOverrides, setConditionCodeOverrides] = useState<
    (string | null)[]
  >(() => Array(DEV_FORECAST_HOURS).fill(null))
  const [textShadow, setTextShadow] = useState(DEFAULT_TEXT_SHADOW)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--hud-text-shadow', textShadow)
    const fanShadowParts = getFanShadowParts(textShadow)
    document.documentElement.style.setProperty(
      '--hud-fan-shadow-x',
      fanShadowParts.x,
    )
    document.documentElement.style.setProperty(
      '--hud-fan-shadow-y',
      fanShadowParts.y,
    )
    document.documentElement.style.setProperty(
      '--hud-fan-shadow-blur',
      fanShadowParts.blur,
    )
    document.documentElement.style.setProperty(
      '--hud-fan-shadow-color',
      fanShadowParts.color,
    )
  }, [textShadow])

  const randomizeForecast = () => {
    if (!data) return

    const targetTemps = Array<number>(DEV_FORECAST_HOURS)
    const targetWinds = Array<number>(DEV_FORECAST_HOURS)
    const targetPops = Array<number>(DEV_FORECAST_HOURS)
    const targetConditionCodes = Array<string>(DEV_FORECAST_HOURS)

    targetTemps[0] = randomNowTemp()
    targetWinds[0] = randomNowWind()
    targetConditionCodes[0] = randomWeightedConditionCode()
    targetPops[0] = conditionCanHavePop(targetConditionCodes[0])
      ? randomNowPop()
      : 0

    for (let i = 1; i < DEV_FORECAST_HOURS; i++) {
      targetTemps[i] = clamp(
        targetTemps[i - 1] + randomTempNudge(),
        TEMP_MIN_C,
        TEMP_MAX_C,
      )
      targetWinds[i] = clamp(
        targetWinds[i - 1] + randomWindNudge(),
        WIND_MIN_KMH,
        WIND_MAX_KMH,
      )
      targetConditionCodes[i] = randomNextConditionCode(
        targetConditionCodes[i - 1] ?? '02',
      )
      targetPops[i] = conditionCanHavePop(targetConditionCodes[i])
        ? clamp(
            roundToNearestTen(
              (conditionCanHavePop(targetConditionCodes[i - 1] ?? '')
                ? (targetPops[i - 1] ?? 0)
                : randomNowPop()) + randomPopNudge(),
            ),
            POP_MIN_PCT,
            POP_MAX_PCT,
          )
        : 0
    }

    const nowBasePop =
      data.sevenDayForecast[0]?.pop ?? data.hourlyForecast[0]?.pop ?? 0
    const nextTemperatureOffsets = targetTemps.map((target, index) => {
      const base =
        index === 0
          ? data.currentTemp
          : (data.hourlyForecast[index - 1]?.temp ?? 0)
      return target - base
    })
    const nextWindSpeedOffsets = targetWinds.map((target, index) => {
      const base =
        index === 0
          ? Math.max(data.windSpeed, data.windGust)
          : Math.max(
              data.hourlyForecast[index - 1]?.windSpeed ?? 0,
              data.hourlyForecast[index - 1]?.windGust ?? 0,
            )
      return target - base
    })
    const nextPopOffsets = targetPops.map((target, index) => {
      const base =
        index === 0 ? nowBasePop : (data.hourlyForecast[index - 1]?.pop ?? 0)
      return target - base
    })

    setTemperatureOffsets(nextTemperatureOffsets)
    setWindSpeedOffsets(nextWindSpeedOffsets)
    setPopOffsets(nextPopOffsets)
    setConditionCodeOverrides(targetConditionCodes)
  }

  const devPanel =
    process.env.NODE_ENV === 'development' ? (
      <DevPanel
        isOpen={devPanelOpen}
        onOpenChange={setDevPanelOpen}
        canRandomize={data != null}
        onRandomizeForecast={randomizeForecast}
        selectedHour={selectedHour}
        onSelectedHourChange={setSelectedHour}
        temperatureOffset={temperatureOffsets[selectedHour] ?? 0}
        onTemperatureOffsetChange={(delta) => {
          setTemperatureOffsets((prev) => {
            const next = [...prev]
            next[selectedHour] = (next[selectedHour] ?? 0) + delta
            return next
          })
        }}
        windSpeedOffset={windSpeedOffsets[selectedHour] ?? 0}
        onWindSpeedOffsetChange={(delta) => {
          setWindSpeedOffsets((prev) => {
            const next = [...prev]
            next[selectedHour] = (next[selectedHour] ?? 0) + delta
            return next
          })
        }}
        popOffset={popOffsets[selectedHour] ?? 0}
        onPopOffsetChange={(delta) => {
          setPopOffsets((prev) => {
            const next = [...prev]
            next[selectedHour] = (next[selectedHour] ?? 0) + delta
            return next
          })
        }}
        textShadow={textShadow}
        onTextShadowChange={setTextShadow}
      />
    ) : null

  if (error) {
    return (
      <>
        <main className="flex min-h-screen w-screen flex-col items-center justify-center overflow-hidden bg-black p-8">
          <PreventBurnIn
            className="min-h-screen w-full"
            scaleTo={0.95}
            speedPxPerSecond={BURN_IN_BOUNCE_SPEED_PX_PER_SECOND}
          >
            <div className="flex min-h-screen w-full flex-col items-center justify-center">
              <p className="text-big text-red-600">Error: {error}</p>
            </div>
          </PreventBurnIn>
        </main>
        {devPanel}
      </>
    )
  }

  if (!data) {
    return (
      <>
        <main className="flex min-h-screen w-screen flex-col items-center justify-center overflow-hidden bg-black p-8">
          <PreventBurnIn
            className="min-h-screen w-full"
            scaleTo={0.95}
            speedPxPerSecond={BURN_IN_BOUNCE_SPEED_PX_PER_SECOND}
          >
            <div className="flex min-h-screen w-full flex-col items-center justify-center">
              <p className="text-big">Loading…</p>
            </div>
          </PreventBurnIn>
        </main>
        {devPanel}
      </>
    )
  }

  const lastSyncedText =
    lastSyncTime != null ? formatLastSynced(now - lastSyncTime) : null

  return (
    <main
      className={twJoin(
        'relative flex h-screen w-screen flex-col overflow-hidden bg-black',
      )}
    >
      <PreventBurnIn
        className="min-h-0 w-full flex-1"
        scaleTo={0.95}
        speedPxPerSecond={BURN_IN_BOUNCE_SPEED_PX_PER_SECOND}
      >
        <div
          className={twJoin(
            'weather-strip-and-chart flex h-full min-h-0 w-full flex-col',
          )}
        >
          <section
            aria-label="Temperature outlook"
            className="flex min-h-0 w-full flex-1 overflow-visible"
          >
            <TemperatureCurveChart
              animated={weatherAnimationsEnabled}
              currentTemp={data.currentTemp + (temperatureOffsets[0] ?? 0)}
              hourlyForecast={data.hourlyForecast.map((h, i) => ({
                ...h,
                iconCode: conditionCodeOverrides[i + 1] ?? h.iconCode,
                temp: h.temp + (temperatureOffsets[i + 1] ?? 0),
                windSpeed: Math.max(
                  0,
                  h.windSpeed + (windSpeedOffsets[i + 1] ?? 0),
                ),
                windGust: Math.max(
                  0,
                  h.windGust + (windSpeedOffsets[i + 1] ?? 0),
                ),
                pop: Math.min(
                  100,
                  Math.max(0, (h.pop ?? 0) + (popOffsets[i + 1] ?? 0)),
                ),
              }))}
              windSpeed={Math.max(
                0,
                data.windSpeed + (windSpeedOffsets[0] ?? 0),
              )}
              windGust={Math.max(0, data.windGust + (windSpeedOffsets[0] ?? 0))}
              windDirection={data.windDirection}
              todayPop={(() => {
                const base =
                  data.sevenDayForecast[0]?.pop ??
                  data.hourlyForecast[0]?.pop ??
                  null
                return base != null
                  ? Math.min(100, Math.max(0, base + (popOffsets[0] ?? 0)))
                  : Math.min(100, Math.max(0, popOffsets[0] ?? 0))
              })()}
              iconCode={conditionCodeOverrides[0] ?? data.iconCode}
              currentDateMs={now}
            />
          </section>
        </div>
      </PreventBurnIn>
      {(data?.location || lastSyncedText) && (
        <div
          className="absolute right-0 bottom-4 left-0 flex justify-center gap-2 text-[16px] opacity-30"
          aria-live="polite"
        >
          {data?.location && <span>{data.location}</span>}
          {data?.location && lastSyncedText && <span>&bull;</span>}
          {lastSyncedText && <span>{lastSyncedText}</span>}
        </div>
      )}
      {devPanel}
    </main>
  )
}
