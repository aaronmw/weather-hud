'use client'

import { Icon, type IconString } from '@/components/Icon'
import { SubGrid } from '@/components/SubGrid'
import { ValueAndUnitPair } from '@/components/ValueAndUnitPair'
import { getConditionIcon } from '@/lib/condition-icons'
import {
  BURN_IN_ORBIT_DURATION_MS,
  BURN_IN_ORBIT_RADIUS_PX,
  FONT_AWESOME_ICON_STYLE,
  REFRESH_INTERVAL_MS,
} from '@/lib/config'
import { getIconVariantForStyle } from '@/lib/fontawesome-classes'
import type { WeatherData } from '@/lib/ec-weather'
import React, { useEffect, useRef, useState } from 'react'
import { twJoin } from 'tailwind-merge'

function fetchWeather() {
  return fetch('/api/weather').then(res => {
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
      .catch(err => setError(err.message))
  }, [])

  useEffect(() => {
    const id = setInterval(
      () =>
        fetchWeather()
          .then(onRefresh)
          .catch(err => setError(err.message)),
      REFRESH_INTERVAL_MS,
    )
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!lastSyncTime) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [lastSyncTime])

  const orbitStyle = {
    '--burn-in-orbit-radius': `${BURN_IN_ORBIT_RADIUS_PX}px`,
    'animation': `burn-in-orbit ${BURN_IN_ORBIT_DURATION_MS}ms linear infinite`,
  } as React.CSSProperties

  if (error) {
    return (
      <main className="flex min-h-screen w-screen flex-col items-center justify-center overflow-hidden p-8">
        <div
          className="flex min-h-screen w-full flex-col items-center justify-center"
          style={orbitStyle}
        >
          <p className="text-red-600">Error: {error}</p>
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="flex min-h-screen w-screen flex-col items-center justify-center overflow-hidden p-8">
        <div
          className="flex min-h-screen w-full flex-col items-center justify-center"
          style={orbitStyle}
        >
          <p>Loading…</p>
        </div>
      </main>
    )
  }

  const conditionIcon = getConditionIcon(data.iconCode)

  const lastSyncedText =
    lastSyncTime != null ? formatLastSynced(now - lastSyncTime) : null

  return (
    <main className={twJoin('relative', 'h-screen', 'w-screen', 'overflow-hidden')}>
      <div
        className={twJoin(
          'grid',
          'h-full',
          'w-full',
          'grid-rows-[3fr_3fr_3fr_4fr]',
        )}
        style={orbitStyle}
      >
        <div className="border-foreground/10 flex flex-col justify-center border-b">
          <SubGrid
            label="Current"
            icon={conditionIcon}
            caption={data.condition}
            unit="°"
            current={data.currentTemp}
            high={data.todayHigh}
            low={data.todayLow}
            primary
          />
        </div>

        <div className="border-foreground/10 flex flex-col justify-center border-b">
          <SubGrid
            label="Wind"
            icon={`${getIconVariantForStyle(FONT_AWESOME_ICON_STYLE)}:wind` as IconString}
            caption="Wind"
            unit="km/h"
            spaceBeforeUnit
            current={data.windSpeed}
            high={data.windGust}
            low={data.windSpeed}
          />
        </div>

        <div className="flex flex-col justify-center">
          <SubGrid
            label="UV Index"
            icon={`${getIconVariantForStyle(FONT_AWESOME_ICON_STYLE)}:sun` as IconString}
            caption="UV Index"
            current={data.uvIndexNow ?? data.uvIndexTodayHigh ?? 0}
            high={data.uvIndexTodayHigh ?? 0}
            low={0}
          />
        </div>

        <section aria-label="7-day forecast">
          <ol
            className={twJoin(
              'divide-foreground/10',
              'flex justify-stretch',
              'h-full w-full',
              'divide-x',
              'border-foreground/10 border-t',
            )}
          >
            {data.sevenDayForecast.map(day => {
              const dayIcon = getConditionIcon(day.iconCode)
              return (
                <li
                  key={day.period}
                  className={twJoin(
                    'h-full w-full',
                    'flex flex-col',
                    'items-center',
                    'justify-center',
                    'gap-3',
                  )}
                >
                  <span className="mb-2 font-medium">{day.period}</span>
                  <Icon
                    name={dayIcon}
                    className="text-[3rem]"
                  />
                  <dl className="grid grid-cols-[auto_1fr] items-center gap-x-2">
                    {(
                      [
                        ['High', day.high ?? '—', day.high != null ? '°' : ''],
                        ['Low', day.low ?? '—', day.low != null ? '°' : ''],
                        ...(day.pop != null ? [['POP', day.pop, '%']] : []),
                      ] as [string, string | number, string][]
                    ).map(([label, value, unit]) => (
                      <React.Fragment key={label}>
                        <dt className="label">{label}</dt>
                        <dd>
                          <ValueAndUnitPair
                            value={value}
                            unit={unit}
                          />
                        </dd>
                      </React.Fragment>
                    ))}
                  </dl>
                </li>
              )
            })}
          </ol>
        </section>
      </div>
      {lastSyncedText && (
        <div
          className="absolute bottom-2 left-0 right-0 flex justify-center text-xs opacity-30"
          aria-live="polite"
        >
          {lastSyncedText}
        </div>
      )}
    </main>
  )
}
