import { DEFAULT_PROVINCE, DEFAULT_SITE_CODE } from '@/lib/config'
import { fetchWeather } from '@/lib/ec-weather'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const siteCode = searchParams.get('siteCode') ?? DEFAULT_SITE_CODE
  const province = searchParams.get('province') ?? DEFAULT_PROVINCE

  try {
    const data = await fetchWeather(siteCode, province)
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
