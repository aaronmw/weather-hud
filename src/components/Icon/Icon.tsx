'use client'

import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { iconStringToVariantAndName } from '@/lib/iconStringToVariantAndName'
import type { IconProps } from './types'

export function Icon({
  className,
  name,
  rotate,
  spin = false,
  variant = 'regular',
  ...otherProps
}: IconProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const [iconVariant = variant, iconName] = iconStringToVariantAndName(name)

  if (!isMounted) {
    return (
      <span
        className={twMerge(`no-underline!`, className)}
        {...otherProps}
      />
    )
  }

  return (
    <span
      className={twMerge(`no-underline!`, className)}
      key={`${iconVariant}-${iconName}`}
      {...otherProps}
    >
      <i
        data-icon
        className={twMerge(
          `fa fa-fw fa-${iconName}`,
          typeof rotate === 'string' && `fa-${rotate}`,
          typeof rotate === 'number' && `fa-rotate-${rotate}`,
          spin && `fa-spin`,
          iconVariant && iconVariant.startsWith('sharp-')
            ? `fa-sharp fa-${iconVariant.replace('sharp-', '')}`
            : `fa-${iconVariant}`,
        )}
      />
    </span>
  )
}
