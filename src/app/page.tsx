'use client'

import { Icon } from '@/components/Icon'
import { ScreenWiper } from '@/components/ScreenWiper'
import { ValueAndUnitPair } from '@/components/ValueAndUnitPair'
import { getConditionIcon } from '@/lib/condition-icons'
import { REFRESH_INTERVAL_MS } from '@/lib/config'
import type { WeatherData } from '@/lib/ec-weather'
import React, { useEffect, useRef, useState } from 'react'
import { twJoin } from 'tailwind-merge'

function fetchWeather() {
  return fetch('/api/weather').then(res => {
    if (!res.ok) throw new Error(res.statusText)
    return res.json()
  })
}

export default function Home() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [wiperTrigger, setWiperTrigger] = useState(0)
  const initialLoadDone = useRef(false)

  const onRefresh = (d: WeatherData) => {
    setData(d)
    setError(null)
    if (initialLoadDone.current) setWiperTrigger(t => t + 1)
    initialLoadDone.current = true
  }

  useEffect(() => {
    fetchWeather().then(onRefresh).catch(err => setError(err.message))
  }, [])

  useEffect(() => {
    const id = setInterval(
      () => fetchWeather().then(onRefresh).catch(err => setError(err.message)),
      REFRESH_INTERVAL_MS
    )
    return () => clearInterval(id)
  }, [])

  if (error) {
    return (
      <>
        <main className="flex min-h-screen flex-col items-center justify-center p-8">
          <p className="text-red-600">Error: {error}</p>
        </main>
        {wiperTrigger > 0 && <ScreenWiper key={wiperTrigger} />}
      </>
    )
  }

  if (!data) {
    return (
      <>
        <main className="flex min-h-screen flex-col items-center justify-center p-8">
          <p>Loading…</p>
        </main>
        {wiperTrigger > 0 && <ScreenWiper key={wiperTrigger} />}
      </>
    )
  }

  const conditionIcon = getConditionIcon(data.iconCode)

  return (
    <>
    <main
      className={twJoin(
        'grid',
        'h-screen',
        'w-screen',
        'grid-cols-2',
        'grid-rows-[2fr_1fr]',
        'overflow-hidden',
        'gap-12 p-12',
      )}
    >
      <section
        aria-label="Current weather"
        className="flex flex-col items-center justify-center p-8"
      >
        <h1 className="mb-8 text-2xl font-semibold">{data.location}</h1>
        <figure className="mb-4">
          <Icon
            name={conditionIcon}
            className="text-[10rem]"
          />
        </figure>
        <p className="mb-4">{data.condition}</p>
      </section>

      <section
        aria-label="Conditions Summary"
        className="grid"
      >
        <dl className="grid grid-cols-[auto_1fr] items-center">
          {(
            [
              ['Current', data.currentTemp, '°C'],
              ['High', data.todayHigh, '°C'],
              ['Low', data.todayLow, '°C'],
              [
                'Wind',
                data.windGust > data.windSpeed
                  ? `${data.windSpeed} – ${data.windGust}`
                  : data.windSpeed,
                'km/h',
              ],
              [
                'UV Index',
                `${data.uvIndexNow ?? data.uvIndexTodayHigh ?? '—'}${data.uvIndexTodayHigh != null ? ` (high ${data.uvIndexTodayHigh})` : ''}`,
              ],
            ] as [string, string | number, string?][]
          ).map(([label, value, unit], index) => {
            const isOdd = index % 2 === 0
            return (
              <div
                key={label}
                className={twJoin(
                  'contents',
                  isOdd && '*:bg-sky-500/10',
                  '*:px-6',
                )}
              >
                <dt className="flex h-full items-center">
                  <span className="label">{label}</span>
                </dt>
                <dd className="flex h-full items-center text-2xl">
                  {unit != null ? (
                    <ValueAndUnitPair
                      value={value}
                      unit={unit}
                    />
                  ) : (
                    <span className="value">{value}</span>
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      </section>

      <section
        aria-label="7-day forecast"
        className="col-span-2"
      >
        <ol className="grid h-full w-full grid-cols-7">
          {data.sevenDayForecast.map((day, index) => {
            const isOdd = index % 2 === 0
            const dayIcon = getConditionIcon(day.iconCode)
            return (
              <li
                key={day.period}
                className={twJoin(
                  'flex',
                  'h-full',
                  'flex-col',
                  'items-center',
                  'justify-center',
                  'gap-3',
                  isOdd && 'bg-sky-500/10',
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
                      ['High', day.high ?? '—', day.high != null ? '°C' : ''],
                      ['Low', day.low ?? '—', day.low != null ? '°C' : ''],
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
    </main>
    {wiperTrigger > 0 && <ScreenWiper key={wiperTrigger} />}
    </>
  )
}
