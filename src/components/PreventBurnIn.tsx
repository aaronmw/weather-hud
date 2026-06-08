'use client'

import { type ReactNode, useEffect, useRef } from 'react'
import { twJoin } from 'tailwind-merge'

const DEFAULT_SCALE_TO = 0.95
const DEFAULT_CROSSING_DURATION_MS = 60_000

interface PreventBurnInProps {
  children: ReactNode
  scaleTo?: number
  speedPxPerSecond?: number
  crossingDurationMs?: number
  className?: string
}

interface Position {
  x: number
  y: number
}

interface Bounds {
  maxX: number
  maxY: number
}

function randomDirection(): Position {
  return {
    x: Math.random() < 0.5 ? -1 : 1,
    y: Math.random() < 0.5 ? -1 : 1,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function PreventBurnIn({
  children,
  scaleTo = DEFAULT_SCALE_TO,
  speedPxPerSecond,
  crossingDurationMs = DEFAULT_CROSSING_DURATION_MS,
  className,
}: PreventBurnInProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number | null>(null)
  const positionRef = useRef<Position>({ x: 0, y: 0 })
  const directionRef = useRef<Position>({ x: 1, y: 1 })
  const velocityRef = useRef<Position>({ x: 0, y: 0 })
  const boundsRef = useRef<Bounds>({ maxX: 0, maxY: 0 })
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    const surface = surfaceRef.current
    if (!container || !surface) return

    const motionPreference = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    )

    const applyPosition = () => {
      const { x, y } = positionRef.current
      surface.style.setProperty('scale', String(scaleTo))
      surface.style.setProperty('translate', `${x}px ${y}px`)
    }

    const measureBounds = () => {
      const containerRect = container.getBoundingClientRect()
      const surfaceWidth = surface.offsetWidth
      const surfaceHeight = surface.offsetHeight
      const maxX = Math.max(
        0,
        (containerRect.width - surfaceWidth * scaleTo) / 2,
      )
      const maxY = Math.max(
        0,
        (containerRect.height - surfaceHeight * scaleTo) / 2,
      )

      boundsRef.current = { maxX, maxY }
      positionRef.current = {
        x: clamp(positionRef.current.x, -maxX, maxX),
        y: clamp(positionRef.current.y, -maxY, maxY),
      }
      const durationSpeedX =
        maxX > 0 ? (maxX * 2 * 1000) / crossingDurationMs : 0
      const durationSpeedY =
        maxY > 0 ? (maxY * 2 * 1000) / crossingDurationMs : 0
      const speedX = speedPxPerSecond ?? durationSpeedX
      const speedY = speedPxPerSecond ?? durationSpeedY

      velocityRef.current = {
        x: maxX > 0 ? (speedX / 1000) * directionRef.current.x : 0,
        y: maxY > 0 ? (speedY / 1000) * directionRef.current.y : 0,
      }
      applyPosition()
    }

    const cancelFrame = () => {
      if (frameRef.current == null) return
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    const centerSurface = () => {
      positionRef.current = { x: 0, y: 0 }
      velocityRef.current = { x: 0, y: 0 }
      lastFrameTimeRef.current = null
      applyPosition()
    }

    const tick = (timestamp: number) => {
      if (reducedMotionRef.current) {
        centerSurface()
        return
      }

      const lastFrameTime = lastFrameTimeRef.current ?? timestamp
      const elapsedMs = timestamp - lastFrameTime
      lastFrameTimeRef.current = timestamp

      const bounds = boundsRef.current
      const velocity = velocityRef.current
      let nextX = positionRef.current.x + velocity.x * elapsedMs
      let nextY = positionRef.current.y + velocity.y * elapsedMs

      if (nextX <= -bounds.maxX || nextX >= bounds.maxX) {
        nextX = clamp(nextX, -bounds.maxX, bounds.maxX)
        directionRef.current.x *= -1
        velocityRef.current.x *= -1
      }
      if (nextY <= -bounds.maxY || nextY >= bounds.maxY) {
        nextY = clamp(nextY, -bounds.maxY, bounds.maxY)
        directionRef.current.y *= -1
        velocityRef.current.y *= -1
      }

      positionRef.current = { x: nextX, y: nextY }
      applyPosition()
      frameRef.current = window.requestAnimationFrame(tick)
    }

    const startMotion = () => {
      cancelFrame()
      reducedMotionRef.current = motionPreference.matches
      if (reducedMotionRef.current) {
        centerSurface()
        return
      }
      measureBounds()
      lastFrameTimeRef.current = null
      frameRef.current = window.requestAnimationFrame(tick)
    }

    directionRef.current = randomDirection()
    reducedMotionRef.current = motionPreference.matches
    centerSurface()
    measureBounds()
    startMotion()

    const resizeObserver = new ResizeObserver(measureBounds)
    resizeObserver.observe(container)
    resizeObserver.observe(surface)
    window.addEventListener('resize', measureBounds)
    motionPreference.addEventListener('change', startMotion)

    return () => {
      cancelFrame()
      resizeObserver.disconnect()
      window.removeEventListener('resize', measureBounds)
      motionPreference.removeEventListener('change', startMotion)
    }
  }, [crossingDurationMs, scaleTo, speedPxPerSecond])

  return (
    <div
      ref={containerRef}
      className={twJoin('relative overflow-visible', className)}
    >
      <div
        ref={surfaceRef}
        className="h-full w-full"
        style={{
          scale: scaleTo,
          translate: '0px 0px',
          transformOrigin: 'center',
          willChange: 'scale, translate',
        }}
      >
        {children}
      </div>
    </div>
  )
}
