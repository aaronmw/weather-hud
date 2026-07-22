import { DEFAULT_PROVINCE, DEFAULT_SITE_CODE } from '@/lib/config'
import { fetchWeather } from '@/lib/ec-weather'
import {
  addAirQualityToWeather,
  fetchCanmoreAirQuality,
} from '@/lib/air-quality'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const siteCode = searchParams.get('siteCode') ?? DEFAULT_SITE_CODE
  const province = searchParams.get('province') ?? DEFAULT_PROVINCE

  try {
    const isCanmore =
      siteCode === DEFAULT_SITE_CODE && province === DEFAULT_PROVINCE
    const airQualityPromise = isCanmore
      ? fetchCanmoreAirQuality().catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Unknown error'
          console.warn(`[Weather HUD] Air quality unavailable: ${message}`)
          return null
        })
      : Promise.resolve(null)

    const [weather, airQuality] = await Promise.all([
      fetchWeather(siteCode, province),
      airQualityPromise,
    ])
    return NextResponse.json(
      airQuality ? addAirQualityToWeather(weather, airQuality) : weather,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
