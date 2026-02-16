import type { FontAwesomeIconStyle } from '@/lib/config'

const STYLE_CLASSES: Record<FontAwesomeIconStyle, string> = {
  'classic-thin': 'fa-classic fa-thin',
  'classic-light': 'fa-classic fa-light',
  'classic-regular': 'fa-classic fa-regular',
  'classic-solid': 'fa-classic fa-solid',
  'duotone-thin': 'fa-duotone fa-thin',
  'duotone-light': 'fa-duotone fa-light',
  'duotone-regular': 'fa-duotone fa-regular',
  'duotone-solid': 'fa-duotone fa-solid',
  'sharp-thin': 'fa-sharp fa-thin',
  'sharp-light': 'fa-sharp fa-light',
  'sharp-regular': 'fa-sharp fa-regular',
  'sharp-solid': 'fa-sharp fa-solid',
  'sharp-duotone-thin': 'fa-sharp-duotone fa-thin',
  'sharp-duotone-light': 'fa-sharp-duotone fa-light',
  'sharp-duotone-regular': 'fa-sharp-duotone fa-regular',
  'sharp-duotone-solid': 'fa-sharp-duotone fa-solid',
  chisel: 'fa-chisel fa-regular',
  etch: 'fa-etch fa-solid',
  graphite: 'fa-graphite fa-thin',
  jelly: 'fa-jelly fa-regular',
  'jelly-fill': 'fa-jelly-fill fa-regular',
  'jelly-duo': 'fa-jelly-duo fa-regular',
  notdog: 'fa-notdog fa-solid',
  'notdog-duo': 'fa-notdog-duo fa-solid',
  slab: 'fa-slab fa-regular',
  'slab-press': 'fa-slab-press fa-regular',
  thumbprint: 'fa-thumbprint fa-light',
  utility: 'fa-utility fa-regular',
  'utility-fill': 'fa-utility-fill fa-semibold',
  'utility-duo': 'fa-utility-duo fa-semibold',
  whiteboard: 'fa-whiteboard fa-semibold',
}

const VARIANT_OVERRIDABLE = new Set<FontAwesomeIconStyle>([
  'classic-thin',
  'classic-light',
  'classic-regular',
  'classic-solid',
  'duotone-thin',
  'duotone-light',
  'duotone-regular',
  'duotone-solid',
  'sharp-thin',
  'sharp-light',
  'sharp-regular',
  'sharp-solid',
  'sharp-duotone-thin',
  'sharp-duotone-light',
  'sharp-duotone-regular',
  'sharp-duotone-solid',
])

export function getFontAwesomeStyleClasses(
  style: FontAwesomeIconStyle,
  overrideVariant?: string,
): string {
  if (!overrideVariant || !VARIANT_OVERRIDABLE.has(style)) {
    return STYLE_CLASSES[style]
  }
  const prefix = style.startsWith('sharp-duotone')
    ? 'fa-sharp-duotone'
    : style.startsWith('sharp')
      ? 'fa-sharp'
      : style.startsWith('duotone')
        ? 'fa-duotone'
        : 'fa-classic'
  return `${prefix} fa-${overrideVariant}`
}

const STYLE_TO_ICON_VARIANT: Record<FontAwesomeIconStyle, string> = {
  'classic-thin': 'thin',
  'classic-light': 'light',
  'classic-regular': 'regular',
  'classic-solid': 'solid',
  'duotone-thin': 'thin',
  'duotone-light': 'light',
  'duotone-regular': 'regular',
  'duotone-solid': 'solid',
  'sharp-thin': 'sharp-thin',
  'sharp-light': 'sharp-light',
  'sharp-regular': 'sharp-regular',
  'sharp-solid': 'sharp-solid',
  'sharp-duotone-thin': 'sharp-thin',
  'sharp-duotone-light': 'sharp-light',
  'sharp-duotone-regular': 'sharp-regular',
  'sharp-duotone-solid': 'sharp-solid',
  chisel: 'regular',
  etch: 'solid',
  graphite: 'thin',
  jelly: 'regular',
  'jelly-fill': 'regular',
  'jelly-duo': 'regular',
  notdog: 'solid',
  'notdog-duo': 'solid',
  slab: 'regular',
  'slab-press': 'regular',
  thumbprint: 'light',
  utility: 'semibold',
  'utility-fill': 'semibold',
  'utility-duo': 'semibold',
  whiteboard: 'semibold',
}

export function getIconVariantForStyle(style: FontAwesomeIconStyle): string {
  return STYLE_TO_ICON_VARIANT[style]
}
