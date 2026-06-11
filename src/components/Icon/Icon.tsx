'use client'

import {
  FONT_AWESOME_ICON_STYLE,
  type FontAwesomeIconStyle,
} from '@/lib/config'
import {
  getFontAwesomeStyleClasses,
  getIconVariantForStyle,
} from '@/lib/fontawesome-classes'
import { iconStringToVariantAndName } from '@/lib/iconStringToVariantAndName'
import { useSyncExternalStore } from 'react'
import { twMerge } from 'tailwind-merge'
import type { IconProps, IconVariant } from './types'

function resolveStyleClasses(iconVariant: string | undefined): string {
  const style = FONT_AWESOME_ICON_STYLE
  if (iconVariant === 'brands') return 'fa-brands'
  if (!iconVariant) return getFontAwesomeStyleClasses(style)
  if (iconVariant === 'duotone')
    return getFontAwesomeStyleClasses('duotone-solid')
  if (iconVariant.startsWith('sharp-')) {
    return getFontAwesomeStyleClasses(
      `sharp-${iconVariant.replace('sharp-', '')}` as FontAwesomeIconStyle,
    )
  }
  return getFontAwesomeStyleClasses(style, iconVariant)
}

export function Icon({
  className,
  name,
  rotate,
  spin = false,
  variant = getIconVariantForStyle(FONT_AWESOME_ICON_STYLE) as IconVariant,
  ...otherProps
}: IconProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const [iconVariant, iconName] = iconStringToVariantAndName(name)
  const styleClasses = resolveStyleClasses(iconVariant ?? variant ?? undefined)
  const iconClasses = twMerge(
    `fa fa-fw fa-${iconName}`,
    styleClasses,
    typeof rotate === 'string' && `fa-${rotate}`,
    typeof rotate === 'number' && `fa-rotate-${rotate}`,
    spin && `fa-spin`,
  )

  if (!isMounted) {
    return (
      <span
        className={twMerge(`no-underline!`, className)}
        {...otherProps}
      >
        <i
          aria-hidden
          className={twMerge(`fa fa-fw fa-${iconName}`, styleClasses)}
          data-icon-placeholder
          style={{
            display: 'inline-block',
            height: '1em',
            lineHeight: 1,
            visibility: 'hidden',
            width: '1.25em',
          }}
        />
      </span>
    )
  }

  return (
    <span
      className={twMerge(`no-underline!`, className)}
      key={`${iconVariant ?? variant}-${iconName}`}
      {...otherProps}
    >
      <i
        data-icon
        className={iconClasses}
      />
    </span>
  )
}
