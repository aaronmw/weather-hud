'use client'

import { Icon } from '@/components/Icon'
import { ScreenWiper } from '@/components/ScreenWiper'
import { SubGrid } from '@/components/SubGrid'
import { ValueAndUnitPair } from '@/components/ValueAndUnitPair'
import { getConditionIcon } from '@/lib/condition-icons'
import { REFRESH_INTERVAL_MS, SCREEN_WIPER_INTERVAL_MS } from '@/lib/config'
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
    const id = setInterval(
      () => setWiperTrigger(t => t + 1),
      SCREEN_WIPER_INTERVAL_MS,
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
        )}
      >
        <section
          aria-label="Current weather"
          className={twJoin(
            'flex',
            'flex-col',
            'items-center',
            'justify-center',
            'p-8',
            'border-foreground/10 border-r',
          )}
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
          className="grid grid-rows-3 gap-0"
        >
          <SubGrid
            label="Current"
            unit="°C"
            current={data.currentTemp}
            high={data.todayHigh}
            low={data.todayLow}
          />
          <SubGrid
            label="Wind"
            unit="km/h"
            current={data.windSpeed}
            high={data.windGust}
            low={data.windSpeed}
          />
          <SubGrid
            label="UV Index"
            current={data.uvIndexNow ?? data.uvIndexTodayHigh ?? 0}
            high={data.uvIndexTodayHigh ?? 0}
            low={0}
          />
        </section>

        <section
          aria-label="7-day forecast"
          className="col-span-2"
        >
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
