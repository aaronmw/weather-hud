import { FONT_AWESOME_ICON_STYLE } from '@/lib/config'
import { getIconVariantForStyle } from '@/lib/fontawesome-classes'
import type {
  IconString,
  IconVariant,
  WeatherIconName,
} from '@/components/Icon/types'

const v = getIconVariantForStyle(FONT_AWESOME_ICON_STYLE) as IconVariant
const iconMap = {
  '00': 'sun',
  '01': 'sun',
  '02': 'cloud-sun',
  '03': 'cloud-sun',
  '04': 'cloud',
  '05': 'cloud',
  '06': 'cloud',
  '07': 'cloud-snow',
  '08': 'cloud-snow',
  '09': 'cloud-rain',
  '10': 'cloud-rain',
  '11': 'cloud-rain',
  '12': 'cloud-rain',
  '13': 'cloud-rain',
  '14': 'cloud-rain',
  '15': 'snowflake',
  '16': 'snowflake',
  '17': 'snowflake',
  '18': 'snowflake',
  '19': 'snowflake',
  '20': 'cloud',
  '21': 'cloud',
  '22': 'cloud',
  '23': 'cloud',
  '24': 'cloud',
  '25': 'cloud',
  '26': 'cloud',
  '27': 'cloud',
  '28': 'cloud',
  '29': 'cloud',
  '30': 'cloud-sun',
  '31': 'sun',
  '32': 'cloud-sun',
  '33': 'cloud',
  '34': 'cloud',
  '35': 'cloud',
  '36': 'cloud',
  '37': 'cloud',
  '38': 'cloud',
  '39': 'cloud-bolt',
  '40': 'cloud-bolt',
  '41': 'cloud-bolt',
  '42': 'cloud-bolt',
  '43': 'cloud-bolt',
  '44': 'bolt',
  '45': 'bolt',
  '46': 'bolt',
  '47': 'cloud-bolt',
} as Record<string, WeatherIconName>

export function getConditionIcon(
  code: string,
  variant: IconVariant = v,
  isDaylight = true,
): IconString {
  const mappedIcon = iconMap[code] ?? 'cloud'
  const icon =
    mappedIcon === 'sun'
      ? isDaylight
        ? 'sun'
        : 'moon'
      : mappedIcon === 'cloud-sun'
        ? isDaylight
          ? 'cloud-sun'
          : 'cloud-moon'
        : mappedIcon
  return `${variant}:${icon}`
}
