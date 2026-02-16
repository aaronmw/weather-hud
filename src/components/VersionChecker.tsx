'use client'

import { REFRESH_INTERVAL_MS } from '@/lib/config'
import { useEffect, useRef } from 'react'

export function VersionChecker() {
  const buildIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (window.location.search.startsWith('?v=')) {
      window.history.replaceState(null, '', window.location.pathname)
    }
    const check = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        const { buildId } = await res.json()
        if (buildIdRef.current !== null && buildIdRef.current !== buildId) {
          window.location.replace(window.location.pathname + '?v=' + buildId)
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
