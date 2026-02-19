'use client'

import { CANMORE_LAT, CANMORE_LNG, CANMORE_TZ } from '@/lib/config'
import { getSunTimes } from '@/lib/sun'
import { useEffect } from 'react'

function isDark(): boolean {
  const now = Date.now()
  const { sunrise, sunset } = getSunTimes(CANMORE_LAT, CANMORE_LNG, new Date(now), CANMORE_TZ)
  return now < sunrise.getTime() || now >= sunset.getTime()
}

export function CanmoreThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const apply = () => {
      document.documentElement.setAttribute('data-theme', isDark() ? 'dark' : 'light')
    }
    apply()
    const id = setInterval(apply, 60_000)
    return () => clearInterval(id)
  }, [])
  return <>{children}</>
}
