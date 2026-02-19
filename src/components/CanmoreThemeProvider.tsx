'use client'

import SunCalc from 'suncalc'
import { useEffect } from 'react'

const CANMORE_LAT = 51.0883
const CANMORE_LNG = -115.3581

function isDark(lat: number, lng: number): boolean {
  const now = new Date()
  const times = SunCalc.getTimes(now, lat, lng)
  return now < times.sunrise || now > times.sunset
}

export function CanmoreThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const apply = () => {
      document.documentElement.setAttribute('data-theme', isDark(CANMORE_LAT, CANMORE_LNG) ? 'dark' : 'light')
    }
    apply()
    const id = setInterval(apply, 60_000)
    return () => clearInterval(id)
  }, [])
  return <>{children}</>
}
