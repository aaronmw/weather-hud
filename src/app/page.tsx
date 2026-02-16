'use client'

import { Icon, type IconString } from '@/components/Icon'
import { MetricColumn } from '@/components/MetricColumn'
import { ValueAndUnitPair } from '@/components/ValueAndUnitPair'
import { getConditionIcon } from '@/lib/condition-icons'
import {
  BURN_IN_ORBIT_DURATION_MS,
  BURN_IN_ORBIT_RADIUS_PX,
  FONT_AWESOME_ICON_STYLE,
  REFRESH_INTERVAL_MS,
} from '@/lib/config'
import type { WeatherData } from '@/lib/ec-weather'
import { getIconVariantForStyle } from '@/lib/fontawesome-classes'
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
    <main
      className={twJoin('relative', 'h-screen', 'w-screen', 'overflow-hidden')}
    >
      <div
        className={twJoin('weather-grid', 'h-full', 'w-full')}
        style={orbitStyle}
      >
        <div
          className={twJoin(
            'ga-labels-header',
            'inverted',
            'py-2',
            'border-foreground/35 border-r border-b',
          )}
        />
        <div
          className={twJoin(
            'ga-condition-header',
            'inverted',
            'flex items-center justify-center py-2',
            'border-foreground/35 border-r border-b',
          )}
        >
          <span className="label-large">Condition</span>
        </div>
        <div
          className={twJoin(
            'ga-wind-header',
            'flex items-center justify-center py-2',
            'border-foreground/35 border-r border-b',
          )}
        >
          <span className="label-large">Wind</span>
        </div>
        <div
          className={twJoin(
            'ga-uv-header',
            'flex items-center justify-center py-2',
            'border-foreground/35 border-r border-b',
          )}
        >
          <span className="label-large">UV Index</span>
        </div>
        <div
          className={twJoin(
            'ga-forecast-header',
            'flex items-center justify-center py-2',
            'border-foreground/35 border-r border-b',
          )}
        >
          <span className="label-large">Forecast</span>
        </div>
        <div
          className={twJoin(
            'ga-labels-current',
            'inverted',
            'flex items-center justify-center overflow-hidden px-2',
            'border-foreground/35 border-r border-b',
          )}
        >
          <span className="vertical-label">Current</span>
        </div>
        <div
          className={twJoin(
            'ga-labels-high',
            'inverted',
            'flex items-center justify-center overflow-hidden px-2',
            'border-foreground/35 border-r border-b',
          )}
        >
          <span className="vertical-label">High</span>
        </div>
        <div
          className={twJoin(
            'ga-labels-low',
            'inverted',
            'flex items-center justify-center overflow-hidden px-2',
            'border-foreground/35 border-r',
          )}
        >
          <span className="vertical-label">Low</span>
        </div>
        <MetricColumn
          column="condition"
          icon={conditionIcon}
          caption={data.condition}
          unit="°"
          current={data.currentTemp}
          high={data.todayHigh}
          low={data.todayLow}
          primary
          inverted
        />
        <MetricColumn
          column="wind"
          icon={
            `${getIconVariantForStyle(FONT_AWESOME_ICON_STYLE)}:wind` as IconString
          }
          caption="Wind"
          unit="km/h"
          spaceBeforeUnit
          current={data.windSpeed}
          high={data.windGust}
          low={data.windSpeed}
        />
        <MetricColumn
          column="uv"
          icon={
            `${getIconVariantForStyle(FONT_AWESOME_ICON_STYLE)}:sun` as IconString
          }
          caption="UV Index"
          current={data.uvIndexNow ?? data.uvIndexTodayHigh ?? 0}
          high={data.uvIndexTodayHigh ?? 0}
          low={0}
        />
        <section
          aria-label="7-day forecast"
          className={twJoin(
            'ga-forecast',
            'border-foreground/10',
            'flex items-center',
            'border-l',
          )}
        >
          <ol
            className={twJoin(
              'divide-foreground/10',
              'flex flex-col justify-stretch',
              'h-full w-full',
              'divide-x',
            )}
          >
            {data.sevenDayForecast.map(day => {
              const dayIcon = getConditionIcon(day.iconCode)
              return (
                <li
                  key={day.period}
                  className={twJoin(
                    'h-full w-full',
                    'grid grid-cols-3',
                    'items-center justify-items-center',
                  )}
                >
                  <span className="label-large">{day.periodDisplay}</span>
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
          className="absolute right-0 bottom-2 left-0 flex justify-center text-xs opacity-30"
          aria-live="polite"
        >
          {lastSyncedText}
        </div>
      )}
    </main>
  )
}
