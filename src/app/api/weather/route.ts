import { fetchCanmoreWeather } from '@/lib/ec-weather';
import { NextResponse } from 'next/server';

export const revalidate = 3600;

export async function GET() {
  try {
    const data = await fetchCanmoreWeather();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
