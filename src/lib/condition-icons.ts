import { FONT_AWESOME_ICON_STYLE } from '@/lib/config'
import { getIconVariantForStyle } from '@/lib/fontawesome-classes'
import type {
  IconString,
  IconVariant,
  WeatherIconName,
} from '@/components/Icon/types'

const v = getIconVariantForStyle(FONT_AWESOME_ICON_STYLE) as IconVariant
const iconMap = {
  '00': 'sun-bright',
  '01': 'sun-cloud',
  '02': 'clouds-sun',
  '03': 'clouds-sun',
  '04': 'clouds-sun',
  '05': 'sun-cloud',
  '06': 'cloud-showers',
  '07': 'cloud-sleet',
  '08': 'cloud-snow',
  '09': 'cloud-bolt-sun',
  '10': 'clouds',
  '11': 'clouds',
  '12': 'cloud-showers',
  '13': 'cloud-showers',
  '14': 'cloud-sleet',
  '15': 'cloud-sleet',
  '16': 'cloud-snow',
  '17': 'cloud-snow',
  '18': 'snow-blowing',
  '19': 'cloud-bolt',
  '20': 'cloud-fog',
  '21': 'cloud-fog',
  '22': 'smoke',
  '23': 'sun-dust',
  '24': 'snow-blowing',
  '25': 'cloud-hail',
  '26': 'cloud-drizzle',
  '27': 'cloud-sleet',
  '28': 'cloud-showers',
  '29': 'cloud-drizzle',
  '30': 'wind',
  '31': 'sun-bright',
  '32': 'sun-cloud',
  '33': 'clouds',
  '34': 'clouds',
  '35': 'clouds',
  '36': 'clouds',
  '37': 'clouds',
  '38': 'clouds',
  '39': 'cloud-bolt-sun',
  '40': 'cloud-bolt',
  '41': 'cloud-bolt',
  '42': 'cloud-bolt',
  '43': 'cloud-bolt',
  '44': 'cloud-bolt',
  '45': 'cloud-bolt',
  '46': 'cloud-bolt',
  '47': 'cloud-bolt-sun',
} as Record<string, WeatherIconName>

const nightIconMap: Partial<Record<WeatherIconName, WeatherIconName>> = {
  'cloud-bolt-sun': 'cloud-bolt-moon',
  'cloud-sun': 'cloud-moon',
  'clouds-sun': 'cloud-moon',
  'sun-bright': 'moon',
  'sun-cloud': 'moon-cloud',
  'sun-dust': 'smog',
}

export function getConditionIcon(
  code: string,
  variant: IconVariant = v,
  isDaylight = true,
): IconString {
  const mappedIcon = iconMap[code] ?? 'cloud'
  const icon = isDaylight
    ? mappedIcon
    : (nightIconMap[mappedIcon] ?? mappedIcon)
  return `${variant}:${icon}`
}
