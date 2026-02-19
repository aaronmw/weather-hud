import { FONT_AWESOME_ICON_STYLE } from '@/lib/config'
import { getIconVariantForStyle } from '@/lib/fontawesome-classes'
import type { IconString } from '@/components/Icon/types'

const v = getIconVariantForStyle(FONT_AWESOME_ICON_STYLE)
const iconMap = {
  '00': `${v}:sun`,
  '01': `${v}:sun`,
  '02': `${v}:cloud-sun`,
  '03': `${v}:cloud-sun`,
  '04': `${v}:cloud`,
  '05': `${v}:cloud`,
  '06': `${v}:cloud`,
  '07': `${v}:cloud-snow`,
  '08': `${v}:cloud-snow`,
  '09': `${v}:cloud-rain`,
  '10': `${v}:cloud-rain`,
  '11': `${v}:cloud-rain`,
  '12': `${v}:cloud-rain`,
  '13': `${v}:cloud-rain`,
  '14': `${v}:cloud-rain`,
  '15': `${v}:snowflake`,
  '16': `${v}:snowflake`,
  '17': `${v}:snowflake`,
  '18': `${v}:snowflake`,
  '19': `${v}:snowflake`,
  '20': `${v}:cloud`,
  '21': `${v}:cloud`,
  '22': `${v}:cloud`,
  '23': `${v}:cloud`,
  '24': `${v}:cloud`,
  '25': `${v}:cloud`,
  '26': `${v}:cloud`,
  '27': `${v}:cloud`,
  '28': `${v}:cloud`,
  '29': `${v}:cloud`,
  '30': `${v}:cloud-sun`,
  '31': `${v}:cloud`,
  '32': `${v}:cloud`,
  '33': `${v}:cloud`,
  '34': `${v}:cloud`,
  '35': `${v}:cloud`,
  '36': `${v}:cloud`,
  '37': `${v}:cloud`,
  '38': `${v}:cloud`,
  '39': `${v}:cloud-bolt`,
  '40': `${v}:cloud-bolt`,
  '41': `${v}:cloud-bolt`,
  '42': `${v}:cloud-bolt`,
  '43': `${v}:cloud-bolt`,
  '44': `${v}:bolt`,
  '45': `${v}:bolt`,
  '46': `${v}:bolt`,
  '47': `${v}:cloud-bolt`,
} as Record<string, IconString>

export function getConditionIcon(code: string): IconString {
  return iconMap[code] ?? 'solid:cloud'
}
