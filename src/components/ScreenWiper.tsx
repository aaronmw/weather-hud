'use client'

import { SCREEN_WIPER_DURATION_MS } from '@/lib/config'
import { useEffect, useState } from 'react'

export function ScreenWiper() {
  const [mounted, setMounted] = useState(true)

  useEffect(() => {
    const id = setTimeout(() => setMounted(false), SCREEN_WIPER_DURATION_MS)
    return () => clearTimeout(id)
  }, [])

  if (!mounted) return null

  return (
    <div
      className="screen-wiper pointer-events-none fixed inset-0 z-1000"
      style={{ animationDuration: `${SCREEN_WIPER_DURATION_MS}ms` }}
      aria-hidden
    />
  )
}
