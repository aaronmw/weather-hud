'use client'

import { DevPanel } from '@/components/DevPanel'
import { TemperatureCurveChart } from '@/components/TemperatureCurveChart'
import {
  BURN_IN_ORBIT_DURATION_MS,
  BURN_IN_ORBIT_RADIUS_PX,
  CANMORE_LAT,
  CANMORE_LNG,
  CANMORE_TZ,
  REFRESH_INTERVAL_MS,
} from '@/lib/config'
import type { WeatherData } from '@/lib/ec-weather'
import { getSunTimes } from '@/lib/sun'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { twJoin } from 'tailwind-merge'

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

export default function Home() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const initialLoadDone = useRef(false)

  const onRefresh = (d: WeatherData) => {
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

  const isNight = useMemo(() => {
    const { sunrise, sunset } = getSunTimes(
      CANMORE_LAT,
      CANMORE_LNG,
      new Date(now),
      CANMORE_TZ,
    )
    return now < sunrise.getTime() || now >= sunset.getTime()
  }, [now])

  const [devThemeOverride, setDevThemeOverride] = useState<
    'light' | 'dark' | null
  >(null)
  const [devPanelOpen, setDevPanelOpen] = useState(false)
  const [selectedHour, setSelectedHour] = useState(0)
  const [temperatureOffsets, setTemperatureOffsets] = useState<number[]>(() =>
    Array(7).fill(0),
  )
  const [windSpeedOffsets, setWindSpeedOffsets] = useState<number[]>(() =>
    Array(7).fill(0),
  )
  const [popOffsets, setPopOffsets] = useState<number[]>(() => Array(7).fill(0))

  const effectiveTheme =
    process.env.NODE_ENV === 'development' && devThemeOverride != null
      ? devThemeOverride
      : isNight
        ? 'dark'
        : 'light'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme)
  }, [effectiveTheme])

  const orbitStyle = {
    '--burn-in-orbit-radius': `${BURN_IN_ORBIT_RADIUS_PX}px`,
    animation: `burn-in-orbit ${BURN_IN_ORBIT_DURATION_MS}ms linear infinite`,
  } as React.CSSProperties

  const devPanel =
    process.env.NODE_ENV === 'development' ? (
      <DevPanel
        isOpen={devPanelOpen}
        onOpenChange={setDevPanelOpen}
        theme={effectiveTheme}
        onThemeChange={setDevThemeOverride}
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
        <main className="flex min-h-screen w-screen flex-col items-center justify-center overflow-hidden p-8">
          <div
            className="flex min-h-screen w-full flex-col items-center justify-center"
            style={orbitStyle}
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
        <main className="flex min-h-screen w-screen flex-col items-center justify-center overflow-hidden p-8">
          <div
            className="flex min-h-screen w-full flex-col items-center justify-center"
            style={orbitStyle}
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
        'relative flex h-screen w-screen flex-col overflow-hidden',
      )}
    >
      <div
        className={twJoin(
          'weather-strip-and-chart flex min-h-0 flex-1 flex-col',
          'w-full',
        )}
        style={orbitStyle}
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
              pop:
                h.pop != null
                  ? Math.min(
                      100,
                      Math.max(0, h.pop + (popOffsets[i + 1] ?? 0)),
                    )
                  : null,
            }))}
            windSpeed={Math.max(0, data.windSpeed + (windSpeedOffsets[0] ?? 0))}
            windGust={Math.max(0, data.windGust + (windSpeedOffsets[0] ?? 0))}
            windDirection={data.windDirection}
            todayPop={(() => {
              const base =
                data.sevenDayForecast[0]?.pop ?? data.hourlyForecast[0]?.pop ?? null
              return base != null
                ? Math.min(
                    100,
                    Math.max(0, base + (popOffsets[0] ?? 0)),
                  )
                : null
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
