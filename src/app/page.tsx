'use client'

import { DevPanel } from '@/components/DevPanel'
import { TemperatureCurveChart } from '@/components/TemperatureCurveChart'
import {
  BURN_IN_SCALE_DURATION_MS,
  CANMORE_TZ,
  NUM_FORECASTED_HOURS,
  REFRESH_INTERVAL_MS,
} from '@/lib/config'
import { describeIconCode, type WeatherData } from '@/lib/ec-weather'
import React, { useEffect, useRef, useState } from 'react'
import { twJoin } from 'tailwind-merge'

const DEV_FORECAST_HOURS = 7
const TEMP_MIN_C = -30
const TEMP_MAX_C = 30
const WIND_MIN_KMH = 0
const WIND_MAX_KMH = 100
const POP_MIN_PCT = 0
const POP_MAX_PCT = 100
const BURN_IN_SCALE_ORIGINS = [
  '0% 0%',
  '50% 0%',
  '100% 0%',
  '0% 50%',
  '50% 50%',
  '100% 50%',
  '0% 100%',
  '50% 100%',
  '100% 100%',
] as const

type BurnInScaleOrigin = (typeof BURN_IN_SCALE_ORIGINS)[number]
const DEFAULT_BURN_IN_SCALE_ORIGIN: BurnInScaleOrigin = '50% 50%'

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

function randomBurnInScaleOrigin(
  previous?: BurnInScaleOrigin,
): BurnInScaleOrigin {
  const options = previous
    ? BURN_IN_SCALE_ORIGINS.filter((origin) => origin !== previous)
    : BURN_IN_SCALE_ORIGINS
  return options[randomInt(0, options.length - 1)] ?? '50% 50%'
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

export default function Home() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [burnInScaleOrigin, setBurnInScaleOrigin] = useState<BurnInScaleOrigin>(
    DEFAULT_BURN_IN_SCALE_ORIGIN,
  )
  const [burnInScale, setBurnInScale] = useState(1)
  const initialLoadDone = useRef(false)
  const burnInScaleFrame = useRef<number | null>(null)

  const onRefresh = (d: WeatherData) => {
    logFetchedWeatherData(d)
    setData(d)
    setError(null)
    setLastSyncTime(Date.now())
    initialLoadDone.current = true
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    burnInScaleFrame.current = window.requestAnimationFrame(() => {
      setBurnInScaleOrigin(
        randomBurnInScaleOrigin(DEFAULT_BURN_IN_SCALE_ORIGIN),
      )
      setBurnInScale(0.95)
    })
    return () => {
      if (burnInScaleFrame.current == null) return
      window.cancelAnimationFrame(burnInScaleFrame.current)
    }
  }, [])

  const burnInStyle = {
    scale: burnInScale,
    transformOrigin: burnInScaleOrigin,
    transition: `scale ${BURN_IN_SCALE_DURATION_MS}ms ease-in-out`,
    willChange: 'scale',
  } as React.CSSProperties

  const onBurnInTransitionEnd = (
    event: React.TransitionEvent<HTMLDivElement>,
  ) => {
    if (event.propertyName !== 'scale') return
    if (burnInScale < 1) {
      setBurnInScale(1)
      return
    }
    setBurnInScaleOrigin((previous) => randomBurnInScaleOrigin(previous))
    burnInScaleFrame.current = window.requestAnimationFrame(() => {
      setBurnInScale(0.95)
    })
  }

  const burnInMotionProps: React.HTMLAttributes<HTMLDivElement> = {
    style: burnInStyle,
    onTransitionEnd: onBurnInTransitionEnd,
  }

  const randomizeForecast = () => {
    if (!data) return

    const targetTemps = Array<number>(DEV_FORECAST_HOURS)
    const targetWinds = Array<number>(DEV_FORECAST_HOURS)
    const targetPops = Array<number>(DEV_FORECAST_HOURS)

    targetTemps[0] = randomNowTemp()
    targetWinds[0] = randomNowWind()
    targetPops[0] = randomNowPop()

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
      targetPops[i] = clamp(
        roundToNearestTen(targetPops[i - 1] + randomPopNudge()),
        POP_MIN_PCT,
        POP_MAX_PCT,
      )
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
      />
    ) : null

  if (error) {
    return (
      <>
        <main className="flex min-h-screen w-screen flex-col items-center justify-center overflow-hidden bg-black p-8">
          <div
            className="flex min-h-screen w-full flex-col items-center justify-center"
            {...burnInMotionProps}
          >
            <p className="text-big text-red-600">Error: {error}</p>
          </div>
        </main>
        {devPanel}
      </>
    )
  }

  if (!data) {
    return (
      <>
        <main className="flex min-h-screen w-screen flex-col items-center justify-center overflow-hidden bg-black p-8">
          <div
            className="flex min-h-screen w-full flex-col items-center justify-center"
            {...burnInMotionProps}
          >
            <p className="text-big">Loading…</p>
          </div>
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
      <div
        className={twJoin(
          'weather-strip-and-chart flex min-h-0 flex-1 flex-col',
          'w-full',
        )}
        {...burnInMotionProps}
      >
        <section
          aria-label="Temperature outlook"
          className="flex min-h-0 w-full flex-1 overflow-visible"
        >
          <TemperatureCurveChart
            currentTemp={data.currentTemp + (temperatureOffsets[0] ?? 0)}
            hourlyForecast={data.hourlyForecast.map((h, i) => ({
              ...h,
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
            windSpeed={Math.max(0, data.windSpeed + (windSpeedOffsets[0] ?? 0))}
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
            iconCode={data.iconCode}
          />
        </section>
      </div>
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
