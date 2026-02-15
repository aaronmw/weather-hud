import { XMLParser } from 'fast-xml-parser';

const CANMORE_SITE_CODE = 's0000403';
const EC_BASE = 'https://dd.weather.gc.ca/today/citypage_weather/AB';

export interface WeatherData {
  location: string;
  condition: string;
  iconCode: string;
  currentTemp: number;
  todayHigh: number;
  todayLow: number;
  windSpeed: number;
  windGust: number;
  uvIndexNow: number | null;
  uvIndexTodayHigh: number | null;
  sevenDayForecast: DayForecast[];
}

export interface DayForecast {
  period: string;
  condition: string;
  iconCode: string;
  high: number | null;
  low: number | null;
  pop: number | null;
}

function num(s: string | undefined): number | null {
  if (s === undefined || s === '') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function extractText(obj: unknown): string {
  if (obj == null) return '';
  if (typeof obj === 'string' || typeof obj === 'number') return String(obj);
  if (typeof obj === 'object') {
    const o = obj as Record<string, unknown>;
    const text = o['#text'] ?? o['#'];
    return text != null ? String(text) : '';
  }
  return '';
}

export async function fetchCanmoreWeather(): Promise<WeatherData> {
  const hour = new Date().getUTCHours().toString().padStart(2, '0');
  const dirRes = await fetch(`${EC_BASE}/${hour}/`, { next: { revalidate: 3600 } });
  const dirHtml = await dirRes.text();
  const fileMatch = dirHtml.match(
    new RegExp(`(\\d{8}T\\d{6}\\.\\d+Z_MSC_CitypageWeather_${CANMORE_SITE_CODE}_en\\.xml)`)
  );
  const filename = fileMatch?.[1];
  if (!filename) throw new Error('Canmore weather file not found');

  const xmlRes = await fetch(`${EC_BASE}/${hour}/${filename}`, { next: { revalidate: 3600 } });
  const xml = await xmlRes.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const doc = parser.parse(xml) as Record<string, unknown>;

  const siteData = doc?.siteData as Record<string, unknown> | undefined;
  if (!siteData) throw new Error('Invalid XML structure');

  const location = extractText(
    (siteData?.location as Record<string, unknown>)?.name
  ) || 'Canmore';
  const current = siteData?.currentConditions as Record<string, unknown> | undefined;
  const forecastGroup = siteData?.forecastGroup as Record<string, unknown> | undefined;
  const forecasts = forecastGroup?.forecast;
  const forecastList = Array.isArray(forecasts) ? forecasts : forecasts ? [forecasts] : [];

  const currentTemp = num(extractText(current?.temperature)) ?? 0;
  const windObj = current?.wind as Record<string, unknown> | undefined;
  const windSpeed = num(extractText(windObj?.speed)) ?? 0;
  const windGustRaw = extractText(windObj?.gust);
  const windGust = windGustRaw === '00' || windGustRaw === '' ? windSpeed : (num(windGustRaw) ?? windSpeed);

  let todayHigh = 0;
  let todayLow = 0;
  let uvIndexTodayHigh: number | null = null;
  let condition = '';
  let iconCode = '';

  const dayForecasts: DayForecast[] = [];
  for (let i = 0; i < forecastList.length; i++) {
    const f = forecastList[i] as Record<string, unknown>;
    const periodObj = f?.period as Record<string, string> | undefined;
    const period = extractText(periodObj);
    const textForecastName = periodObj?.['@_textForecastName'] ?? '';
    const abbrev = f?.abbreviatedForecast as Record<string, unknown> | undefined;
    const icon = extractText(abbrev?.iconCode);
    const textSummary = extractText(abbrev?.textSummary);
    const temps = f?.temperatures as Record<string, unknown> | undefined;
    const tempList = temps?.temperature;
    const tempArr = Array.isArray(tempList) ? tempList : tempList ? [tempList] : [];
    const highTemp = tempArr.find((t: Record<string, unknown>) => (t as Record<string, string>)['@_class'] === 'high');
    const lowTemp = tempArr.find((t: Record<string, unknown>) => (t as Record<string, string>)['@_class'] === 'low');
    const high = highTemp ? num(extractText(highTemp)) : null;
    const low = lowTemp ? num(extractText(lowTemp)) : null;
    const popObj = abbrev?.pop;
    const pop = num(extractText(popObj));
    const uv = f?.uv as Record<string, unknown> | undefined;
    const uvIndex = uv ? num(extractText(uv?.index)) : null;

    if (textForecastName === 'Today') {
      todayHigh = high ?? currentTemp;
      uvIndexTodayHigh = uvIndex;
      condition = textSummary;
      iconCode = icon ? String(icon).padStart(2, '0') : '02';
    }
    if (textForecastName === 'Tonight') {
      todayLow = low ?? currentTemp;
    }

    const isDayPeriod = !textForecastName.toLowerCase().includes('night') && textForecastName !== 'Tonight';
    if (isDayPeriod && dayForecasts.length < 7) {
      const nextF = forecastList[i + 1] as Record<string, unknown> | undefined;
      const nextTemps = nextF?.temperatures as Record<string, unknown> | undefined;
      const nextTempList = nextTemps?.temperature;
      const nextTempArr = Array.isArray(nextTempList) ? nextTempList : nextTempList ? [nextTempList] : [];
      const nextLow = nextTempArr.find((t: Record<string, unknown>) => (t as Record<string, string>)['@_class'] === 'low');
      const nightLow = nextLow ? num(extractText(nextLow)) : null;

      dayForecasts.push({
        period: textForecastName || period,
        condition: textSummary,
        iconCode: icon ? String(icon).padStart(2, '0') : '00',
        high,
        low: nightLow,
        pop,
      });
    }
  }

  return {
    location: `${location}, AB`,
    condition: condition || '—',
    iconCode: iconCode || '00',
    currentTemp,
    todayHigh,
    todayLow,
    windSpeed,
    windGust,
    uvIndexNow: uvIndexTodayHigh,
    uvIndexTodayHigh,
    sevenDayForecast: dayForecasts,
  };
}
