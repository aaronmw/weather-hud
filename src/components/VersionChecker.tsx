'use client'

import { REFRESH_INTERVAL_MS } from '@/lib/config'
import { useEffect, useRef } from 'react'

export function VersionChecker() {
  const buildIdRef = useRef<string | null>(null)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/version')
        const { buildId } = await res.json()
        if (buildIdRef.current !== null && buildIdRef.current !== buildId) {
          window.location.reload()
        }
        buildIdRef.current = buildId
      } catch {
        // ignore network errors, will retry on next poll
      }
    }
    check()
    const id = setInterval(check, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return null
}
