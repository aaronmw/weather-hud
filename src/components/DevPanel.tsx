'use client'

import { Icon } from '@/components/Icon'
import React, { useCallback, useEffect, useRef } from 'react'
import { twJoin } from 'tailwind-merge'

const HOUR_OPTIONS = 7

type DevPanelProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  theme: 'light' | 'dark'
  onThemeChange: (theme: 'light' | 'dark') => void
  selectedHour: number
  onSelectedHourChange: (hour: number) => void
  temperatureOffset: number
  onTemperatureOffsetChange: (delta: number) => void
  windSpeedOffset: number
  onWindSpeedOffsetChange: (delta: number) => void
  popOffset: number
  onPopOffsetChange: (delta: number) => void
}

export function DevPanel({
  isOpen,
  onOpenChange,
  theme,
  onThemeChange,
  selectedHour,
  onSelectedHourChange,
  temperatureOffset,
  onTemperatureOffsetChange,
  windSpeedOffset,
  onWindSpeedOffsetChange,
  popOffset,
  onPopOffsetChange,
}: DevPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const cogRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, close])

  useEffect(() => {
    if (!isOpen) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        panelRef.current?.contains(target) ||
        cogRef.current?.contains(target)
      )
        return
      close()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [isOpen, close])

  return (
    <>
      <button
        ref={cogRef}
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        className="border-foreground/30 bg-background/80 fixed right-2 bottom-2 flex h-10 w-10 items-center justify-center rounded-full border opacity-60 hover:opacity-100"
        aria-label="Open dev panel"
        aria-expanded={isOpen}
      >
        <Icon
          name="gear"
          className="text-sm"
        />
      </button>
      {isOpen && (
        <div
          ref={panelRef}
          className="border-foreground/30 bg-background/95 fixed right-2 bottom-16 z-50 flex w-64 flex-col gap-4 rounded-lg border p-4 shadow-lg"
          role="dialog"
          aria-label="Dev panel"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Dev</span>
            <button
              type="button"
              onClick={close}
              className="text-foreground/70 hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded text-sm transition-colors hover:bg-foreground/10"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm opacity-80">Theme</span>
            <div
              className="border-foreground/30 flex rounded-md border p-0.5"
              role="group"
              aria-label="Theme"
            >
              {(['light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onThemeChange(t)}
                  className={twJoin(
                    'flex-1 rounded px-2 py-1.5 text-sm capitalize transition-colors',
                    theme === t
                      ? 'bg-foreground text-background'
                      : 'hover:bg-foreground/10',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm opacity-80">Hour</span>
            <div
              className="border-foreground/30 flex rounded-md border p-0.5"
              role="group"
              aria-label="Forecast hour"
            >
              {Array.from({ length: HOUR_OPTIONS }, (_, i) => i).map(
                (hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => onSelectedHourChange(hour)}
                    className={twJoin(
                      'min-w-0 flex-1 rounded px-1 py-1.5 text-sm font-medium transition-colors',
                      selectedHour === hour
                        ? 'bg-foreground text-background'
                        : 'hover:bg-foreground/10',
                    )}
                  >
                    {hour}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm opacity-80">Temp offset</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onTemperatureOffsetChange(-1)}
                className="border-foreground/30 flex h-8 w-8 shrink-0 items-center justify-center rounded border text-sm font-bold transition-colors hover:bg-foreground/10"
                aria-label={`Decrease hour ${selectedHour} temperature by 1°`}
              >
                −
              </button>
              <span className="text-sm tabular-nums">
                {temperatureOffset > 0 ? `+${temperatureOffset}` : temperatureOffset}°
              </span>
              <button
                type="button"
                onClick={() => onTemperatureOffsetChange(1)}
                className="border-foreground/30 flex h-8 w-8 shrink-0 items-center justify-center rounded border text-sm font-bold transition-colors hover:bg-foreground/10"
                aria-label={`Increase hour ${selectedHour} temperature by 1°`}
              >
                +
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm opacity-80">Windspeed offset</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onWindSpeedOffsetChange(-10)}
                className="border-foreground/30 flex h-8 w-8 shrink-0 items-center justify-center rounded border text-sm font-bold transition-colors hover:bg-foreground/10"
                aria-label={`Decrease hour ${selectedHour} windspeed by 10`}
              >
                −
              </button>
              <span className="text-sm tabular-nums">
                {windSpeedOffset > 0 ? `+${windSpeedOffset}` : windSpeedOffset}{' '}
                km/h
              </span>
              <button
                type="button"
                onClick={() => onWindSpeedOffsetChange(10)}
                className="border-foreground/30 flex h-8 w-8 shrink-0 items-center justify-center rounded border text-sm font-bold transition-colors hover:bg-foreground/10"
                aria-label={`Increase hour ${selectedHour} windspeed by 10`}
              >
                +
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm opacity-80">POP offset</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPopOffsetChange(-10)}
                className="border-foreground/30 flex h-8 w-8 shrink-0 items-center justify-center rounded border text-sm font-bold transition-colors hover:bg-foreground/10"
                aria-label={`Decrease hour ${selectedHour} POP by 10%`}
              >
                −
              </button>
              <span className="text-sm tabular-nums">
                {popOffset > 0 ? `+${popOffset}` : popOffset}%
              </span>
              <button
                type="button"
                onClick={() => onPopOffsetChange(10)}
                className="border-foreground/30 flex h-8 w-8 shrink-0 items-center justify-center rounded border text-sm font-bold transition-colors hover:bg-foreground/10"
                aria-label={`Increase hour ${selectedHour} POP by 10%`}
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
