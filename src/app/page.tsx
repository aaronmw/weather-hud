'use client'

import { Icon, type IconString } from '@/components/Icon'
import { MetricColumn } from '@/components/MetricColumn'
import { ValueAndUnitPair } from '@/components/ValueAndUnitPair'
import { getConditionIcon } from '@/lib/condition-icons'
import {
  BURN_IN_ORBIT_DURATION_MS,
  BURN_IN_ORBIT_RADIUS_PX,
  DEFAULT_PROVINCE,
  DEFAULT_SITE_CODE,
  FONT_AWESOME_ICON_STYLE,
  REFRESH_INTERVAL_MS,
} from '@/lib/config'
import type { WeatherData } from '@/lib/ec-weather'
import { getIconVariantForStyle } from '@/lib/fontawesome-classes'
import { findNearestStation, findStationByCode } from '@/lib/stations'
import { getSunTimes } from '@/lib/sun'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { twJoin } from 'tailwind-merge'

interface Location {
  siteCode: string
  province: string
  lat: number
  lng: number
}

function fetchWeather(location: Location) {
  const params = new URLSearchParams({
    siteCode: location.siteCode,
    province: location.province,
  })
  return fetch(`/api/weather?${params}`).then((res) => {
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
  const [location, setLocation] = useState<Location>(() => {
    const defaultStation = findStationByCode(DEFAULT_SITE_CODE)
    return {
      siteCode: DEFAULT_SITE_CODE,
      province: DEFAULT_PROVINCE,
      lat: defaultStation?.lat ?? 51.09,
      lng: defaultStation?.lng ?? -115.36,
    }
  })
  const initialLoadDone = useRef(false)

  const onRefresh = useCallback((d: WeatherData) => {
    setData(d)
    setError(null)
    setLastSyncTime(Date.now())
    initialLoadDone.current = true
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const station = findNearestStation(
          pos.coords.latitude,
          pos.coords.longitude,
        )
        console.log(
          `Nearest station: ${station.name}, ${station.province} (${station.code})`,
        )
        setLocation({
          siteCode: station.code,
          province: station.province,
          lat: station.lat,
          lng: station.lng,
        })
      },
      () => {
        /* denied or unavailable — keep default */
      },
    )
  }, [])

  useEffect(() => {
    fetchWeather(location)
      .then(onRefresh)
      .catch((err) => setError(err.message))
  }, [location, onRefresh])

  useEffect(() => {
    const id = setInterval(
      () =>
        fetchWeather(location)
          .then(onRefresh)
          .catch((err) => setError(err.message)),
      REFRESH_INTERVAL_MS,
    )
    return () => clearInterval(id)
  }, [location, onRefresh])

  useEffect(() => {
    if (!lastSyncTime) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [lastSyncTime])

  const isNight = useMemo(() => {
    const { sunrise, sunset } = getSunTimes(location.lat, location.lng, new Date(now))
    return now < sunrise.getTime() || now >= sunset.getTime()
  }, [location.lat, location.lng, now])

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
  const iconStyle = getIconVariantForStyle(FONT_AWESOME_ICON_STYLE)

  const headerConfig: {
    ga: string
    label: string | null
    highlighted?: boolean
  }[] = [
    { ga: 'ga-labels-header', label: null, highlighted: true },
    { ga: 'ga-condition-header', label: 'Condition', highlighted: true },
    { ga: 'ga-wind-header', label: 'Wind' },
    { ga: 'ga-uv-header', label: 'UV Index' },
    { ga: 'ga-forecast-header', label: 'Forecast' },
  ]

  const labelConfig: { ga: string; label: string; borderB?: boolean }[] = [
    { ga: 'ga-labels-current', label: 'Current', borderB: true },
    { ga: 'ga-labels-high', label: 'High', borderB: true },
    { ga: 'ga-labels-low', label: 'Low' },
  ]

  const metricConfig = [
    {
      column: 'condition' as const,
      icon: conditionIcon,
      caption: data.condition,
      unit: '°',
      current: data.currentTemp,
      high: data.todayHigh,
      low: data.todayLow,
      primary: true,
      highlighted: true,
    },
    {
      column: 'wind' as const,
      icon: `${iconStyle}:wind` as IconString,
      caption: 'Wind',
      unit: 'km/h',
      spaceBeforeUnit: true,
      current: data.windSpeed,
      high: data.windGust,
      low: data.windSpeed,
    },
    {
      column: 'uv' as const,
      icon: `${iconStyle}:sun` as IconString,
      caption: 'UV Index',
      current: data.uvIndexNow ?? data.uvIndexTodayHigh ?? 0,
      high: data.uvIndexTodayHigh ?? 0,
      low: 0,
    },
  ]

  const lastSyncedText =
    lastSyncTime != null ? formatLastSynced(now - lastSyncTime) : null

  return (
    <main
      className={twJoin(
        'relative',
        'h-screen',
        'w-screen',
        'overflow-hidden',
        'transition-opacity duration-[10s]',
        isNight ? 'opacity-60' : 'opacity-100',
      )}
    >
      <div
        className={twJoin('weather-grid', 'h-full', 'w-full')}
        style={orbitStyle}
      >
        {headerConfig.map(({ ga, label, highlighted }) => (
          <div
            key={ga}
            className={twJoin(
              ga,
              highlighted && 'highlighted',
              label != null && 'flex items-center justify-center',
              'py-2',
              'border-foreground/20 border-r border-b',
            )}
          >
            {label != null && <span className="label-large">{label}</span>}
          </div>
        ))}
        {labelConfig.map(({ ga, label, borderB = false }) => (
          <div
            key={ga}
            className={twJoin(
              ga,
              'highlighted',
              'flex items-center justify-center overflow-hidden px-2',
              'border-foreground/20 border-r',
              borderB && 'border-b',
            )}
          >
            <span className="vertical-label">{label}</span>
          </div>
        ))}
        {metricConfig.map(props => (
          <MetricColumn
            key={props.column}
            {...props}
          />
        ))}
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
              'divide-foreground/20',
              'flex flex-col justify-stretch',
              'h-full w-full',
              'divide-x divide-y',
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
      {(data?.location || lastSyncedText) && (
        <div
          className="absolute right-0 bottom-2 left-0 flex justify-center gap-2 text-xs opacity-30"
          aria-live="polite"
        >
          {data?.location && <span>{data.location}</span>}
          {data?.location && lastSyncedText && <span>&bull;</span>}
          {lastSyncedText && <span>{lastSyncedText}</span>}
        </div>
      )}
    </main>
  )
}
