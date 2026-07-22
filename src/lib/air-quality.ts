import { CANMORE_LAT, CANMORE_LNG, NUM_FORECASTED_HOURS } from '@/lib/config'
import type { WeatherData } from '@/lib/ec-weather'

const OPEN_METEO_AIR_QUALITY_URL =
  'https://air-quality-api.open-meteo.com/v1/air-quality'
const AIR_QUALITY_REVALIDATE_SECONDS = 60 * 60
const AIR_QUALITY_FORECAST_HOURS = NUM_FORECASTED_HOURS + 3

interface OpenMeteoAirQualityResponse {
  current?: {
    time?: number
    us_aqi?: number | null
  }
  hourly?: {
    time?: number[]
    us_aqi?: Array<number | null>
  }
}

export interface AirQualityData {
  currentUsAqi: number | null
  hourlyUsAqi: Map<number, number>
}

function normalizeUsAqi(value: unknown): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 500
  ) {
    return null
  }
  return Math.round(value)
}

export async function fetchCanmoreAirQuality(): Promise<AirQualityData> {
  const params = new URLSearchParams({
    latitude: String(CANMORE_LAT),
    longitude: String(CANMORE_LNG),
    current: 'us_aqi',
    hourly: 'us_aqi',
    forecast_hours: String(AIR_QUALITY_FORECAST_HOURS),
    timeformat: 'unixtime',
    timezone: 'GMT',
  })
  const response = await fetch(`${OPEN_METEO_AIR_QUALITY_URL}?${params}`, {
    next: { revalidate: AIR_QUALITY_REVALIDATE_SECONDS },
  })
  if (!response.ok) {
    throw new Error(`Open-Meteo air quality request failed: ${response.status}`)
  }

  const payload = (await response.json()) as OpenMeteoAirQualityResponse
  const times = payload.hourly?.time ?? []
  const values = payload.hourly?.us_aqi ?? []
  const hourlyUsAqi = new Map<number, number>()

  for (let index = 0; index < Math.min(times.length, values.length); index++) {
    const timestamp = times[index]
    const aqi = normalizeUsAqi(values[index])
    if (
      typeof timestamp === 'number' &&
      Number.isFinite(timestamp) &&
      aqi != null
    ) {
      hourlyUsAqi.set(timestamp, aqi)
    }
  }

  return {
    currentUsAqi: normalizeUsAqi(payload.current?.us_aqi),
    hourlyUsAqi,
  }
}

export function addAirQualityToWeather(
  weather: WeatherData,
  airQuality: AirQualityData,
): WeatherData {
  return {
    ...weather,
    currentUsAqi: airQuality.currentUsAqi,
    hourlyForecast: weather.hourlyForecast.map((hour) => {
      const timestamp = Math.floor(new Date(hour.utc).getTime() / 1000)
      return {
        ...hour,
        usAqi: airQuality.hourlyUsAqi.get(timestamp) ?? null,
      }
    }),
  }
}
