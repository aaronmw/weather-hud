import type {
  IconString,
  IconVariant,
  WeatherIconName,
} from '@/components/Icon/types'
import { FONT_AWESOME_ICON_STYLE } from '@/lib/config'
import { getIconVariantForStyle } from '@/lib/fontawesome-classes'

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

const CLEAR_CODES = new Set(['00', '31'])
const PARTLY_CLOUDY_CODES = new Set(['01', '02', '03', '04', '05', '32'])
const CLOUD_CODES = new Set([
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
  '21',
  '24',
  '25',
  '26',
  '27',
  '28',
  '29',
  '32',
  '33',
  '34',
  '35',
  '36',
  '37',
  '38',
  '39',
  '40',
  '41',
  '42',
  '43',
  '44',
  '45',
  '46',
  '47',
])
const STORM_CODES = new Set([
  '09',
  '19',
  '39',
  '40',
  '41',
  '42',
  '43',
  '44',
  '45',
  '46',
  '47',
])
const RAIN_CODES = new Set([
  '12',
  '13',
  '15',
  '19',
  '26',
  '27',
  '28',
  '29',
  '40',
  '41',
  '42',
  '43',
  '44',
  '45',
  '46',
])

export interface WeatherConditionPresentation {
  icon: WeatherIconName
  hasClouds: boolean
  usesDayCloudySky: boolean
  showsLensFlare: boolean
  showsStormSky: boolean
  showsRain: boolean
  showsLightning: boolean
}

function fallbackPresentation(code: string): WeatherConditionPresentation {
  const hasClouds = CLOUD_CODES.has(code)
  const showsLightning = STORM_CODES.has(code)
  return {
    icon: iconMap[code] ?? 'cloud',
    hasClouds,
    usesDayCloudySky: hasClouds && !PARTLY_CLOUDY_CODES.has(code),
    showsLensFlare: CLEAR_CODES.has(code),
    showsStormSky: showsLightning,
    showsRain: RAIN_CODES.has(code),
    showsLightning,
  }
}

export function getConditionPresentation(
  code: string,
  condition = '',
): WeatherConditionPresentation {
  const text = condition.trim().toLowerCase()
  if (!text) return fallbackPresentation(code)

  const isSmoke = /\b(smoke|smog|haze|ash)\b/.test(text)
  if (isSmoke) {
    return {
      icon: 'smog',
      hasClouds: false,
      usesDayCloudySky: false,
      showsLensFlare: false,
      showsStormSky: false,
      showsRain: false,
      showsLightning: false,
    }
  }

  const isDust = /\b(dust|sandstorm)\b/.test(text)
  if (isDust) {
    return {
      icon: 'sun-dust',
      hasClouds: false,
      usesDayCloudySky: false,
      showsLensFlare: false,
      showsStormSky: false,
      showsRain: false,
      showsLightning: false,
    }
  }

  const isStorm = /\b(thunder\w*|lightning|storms?)\b/.test(text)
  const hasPrecipitation = /\b(rain\w*|shower\w*|drizzle|precipitation)\b/.test(
    text,
  )
  const isPossible = /\b(chance|possible|possibility|probability|risk)\b/.test(
    text,
  )
  if (isStorm) {
    return {
      icon: 'cloud-bolt',
      hasClouds: true,
      usesDayCloudySky: true,
      showsLensFlare: false,
      showsStormSky: true,
      showsRain: hasPrecipitation && !isPossible,
      showsLightning: true,
    }
  }

  const isWintry =
    /\b(freezing|snow\w*|flurr\w*|blizzard|sleet|ice pellets?|hail)\b/.test(
      text,
    )
  if (isWintry) {
    const isMixed = /\b(freezing|sleet|ice pellets?|hail|rain)\b/.test(text)
    return {
      icon: isMixed ? 'cloud-sleet' : 'cloud-snow',
      hasClouds: true,
      usesDayCloudySky: true,
      showsLensFlare: false,
      showsStormSky: false,
      showsRain: false,
      showsLightning: false,
    }
  }

  if (hasPrecipitation) {
    return {
      icon: /\bdrizzle\b/.test(text) ? 'cloud-drizzle' : 'cloud-showers',
      hasClouds: true,
      usesDayCloudySky: true,
      showsLensFlare: false,
      showsStormSky: false,
      showsRain: !isPossible,
      showsLightning: false,
    }
  }

  if (/\b(fog|mist)\b/.test(text)) {
    return {
      icon: 'cloud-fog',
      hasClouds: true,
      usesDayCloudySky: true,
      showsLensFlare: false,
      showsStormSky: false,
      showsRain: false,
      showsLightning: false,
    }
  }

  if (/\b(wind\w*|squalls?)\b/.test(text)) {
    return {
      icon: 'wind',
      hasClouds: false,
      usesDayCloudySky: false,
      showsLensFlare: false,
      showsStormSky: false,
      showsRain: false,
      showsLightning: false,
    }
  }

  const isPartlyCloudy =
    /\b(partly|a few clouds?|mix of sun|mainly sunny|cloudy periods?|sunny periods?|clearing)\b/.test(
      text,
    )
  if (isPartlyCloudy) {
    return {
      icon: 'sun-cloud',
      hasClouds: true,
      usesDayCloudySky: false,
      showsLensFlare: false,
      showsStormSky: false,
      showsRain: false,
      showsLightning: false,
    }
  }

  if (/\b(cloud\w*|overcast)\b/.test(text)) {
    return {
      icon: 'clouds',
      hasClouds: true,
      usesDayCloudySky: true,
      showsLensFlare: false,
      showsStormSky: false,
      showsRain: false,
      showsLightning: false,
    }
  }

  if (/\b(sun\w*|clear)\b/.test(text)) {
    return {
      icon: 'sun-bright',
      hasClouds: false,
      usesDayCloudySky: false,
      showsLensFlare: true,
      showsStormSky: false,
      showsRain: false,
      showsLightning: false,
    }
  }

  return fallbackPresentation(code)
}

export function getConditionIcon(
  code: string,
  variant: IconVariant = v,
  isDaylight = true,
  condition = '',
): IconString {
  const mappedIcon = getConditionPresentation(code, condition).icon
  const icon = isDaylight
    ? mappedIcon
    : (nightIconMap[mappedIcon] ?? mappedIcon)
  return `${variant}:${icon}`
}
