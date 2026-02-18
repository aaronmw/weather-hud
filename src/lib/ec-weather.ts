import { XMLParser } from 'fast-xml-parser';

const EC_BASE = 'https://dd.weather.gc.ca/today/citypage_weather';

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
  periodDisplay: string;
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

function roundTemp(n: number | null): number | null {
  return n != null ? Math.round(n) : null;
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

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function periodLabel(name: string): string {
  return WEEKDAYS.includes(name) ? name[0] : name;
}

const ICON_CODE_DESCRIPTIONS: Record<string, string> = {
  '00': 'Sunny', '01': 'A few clouds', '02': 'A mix of sun and cloud', '03': 'Cloudy periods',
  '04': 'Increasing cloudiness', '05': 'Clearing', '06': 'Chance of showers', '07': 'Chance of flurries or rain showers',
  '08': 'A few flurries', '09': 'Chance of thunderstorms', '10': 'Cloudy', '11': 'Overcast',
  '12': 'Showers', '13': 'Periods of rain', '14': 'Chance of freezing rain', '15': 'Rain or snow',
  '16': 'Flurries', '17': 'Periods of snow', '18': 'Snow', '19': 'Blizzard',
  '20': 'Fog', '21': 'Fog patches', '22': 'Smoke', '23': 'Dust',
  '24': 'Blowing snow', '25': 'Ice pellets', '26': 'Freezing drizzle', '27': 'Freezing rain',
  '28': 'Rain', '29': 'Drizzle', '30': 'Windy', '31': 'Clear', '32': 'Partly cloudy',
  '33': 'Cloudy', '34': 'Cloudy', '35': 'Cloudy', '36': 'Cloudy', '37': 'Cloudy', '38': 'Cloudy', '39': 'Chance of thunderstorms',
  '40': 'Thunderstorms', '41': 'Thunderstorms', '42': 'Thunderstorms', '43': 'Thunderstorms', '44': 'Thunderstorms',
  '45': 'Thunderstorms', '46': 'Thunderstorms', '47': 'Chance of thunderstorms',
};

export async function fetchWeather(
  siteCode: string,
  province: string,
): Promise<WeatherData> {
  const base = `${EC_BASE}/${province}`;
  const siteRegex = new RegExp(
    `(\\d{8}T\\d{6}\\.\\d+Z_MSC_CitypageWeather_${siteCode}_en\\.xml)`,
  );

  let hour = new Date().getUTCHours();
  let filename: string | undefined;

  for (let attempt = 0; attempt < 3; attempt++) {
    const h = hour.toString().padStart(2, '0');
    const dirRes = await fetch(`${base}/${h}/`);
    const dirHtml = await dirRes.text();
    filename = dirHtml.match(siteRegex)?.[1];
    if (filename) break;
    hour = (hour - 1 + 24) % 24;
  }

  if (!filename) throw new Error(`Weather file not found for ${siteCode} in ${province}`);
  const h = hour.toString().padStart(2, '0');

  const xmlRes = await fetch(`${base}/${h}/${filename}`);
  const xml = await xmlRes.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const doc = parser.parse(xml) as Record<string, unknown>;

  const siteData = doc?.siteData as Record<string, unknown> | undefined;
  if (!siteData) throw new Error('Invalid XML structure');

  const locationObj = siteData?.location as Record<string, unknown> | undefined;
  const locationName = extractText(locationObj?.name);
  const locationProvince = extractText(
    (locationObj?.province as Record<string, unknown>) ?? locationObj?.province
  );
  const current = siteData?.currentConditions as Record<string, unknown> | undefined;
  const currentCondition = extractText(current?.condition);
  const forecastGroup = siteData?.forecastGroup as Record<string, unknown> | undefined;
  const forecasts = forecastGroup?.forecast;
  const forecastList = Array.isArray(forecasts) ? forecasts : forecasts ? [forecasts] : [];

  const currentTemp = roundTemp(num(extractText(current?.temperature))) ?? 0;
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
    const cloudPrecip = f?.cloudPrecip as Record<string, unknown> | undefined;
    const icon = extractText(abbrev?.iconCode);
    const textSummary = extractText(abbrev?.textSummary);
    const cloudPrecipSummary = extractText(cloudPrecip?.textSummary);
    const temps = f?.temperatures as Record<string, unknown> | undefined;
    const tempList = temps?.temperature;
    const tempArr = Array.isArray(tempList) ? tempList : tempList ? [tempList] : [];
    const highTemp = tempArr.find((t: Record<string, unknown>) => (t as Record<string, string>)['@_class'] === 'high');
    const lowTemp = tempArr.find((t: Record<string, unknown>) => (t as Record<string, string>)['@_class'] === 'low');
    const high = highTemp ? roundTemp(num(extractText(highTemp))) : null;
    const low = lowTemp ? roundTemp(num(extractText(lowTemp))) : null;
    const popObj = abbrev?.pop;
    const pop = num(extractText(popObj));
    const uv = f?.uv as Record<string, unknown> | undefined;
    const uvIndex = uv ? num(extractText(uv?.index)) : null;

    if (textForecastName === 'Today') {
      todayHigh = high ?? currentTemp;
      uvIndexTodayHigh = uvIndex;
      iconCode = icon ? String(icon).padStart(2, '0') : '02';
      condition =
        textSummary ||
        cloudPrecipSummary ||
        currentCondition ||
        ICON_CODE_DESCRIPTIONS[iconCode] ||
        ICON_CODE_DESCRIPTIONS['02'];
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
      const nightLow = nextLow ? roundTemp(num(extractText(nextLow))) : null;

      const fullPeriod = textForecastName || period;
      dayForecasts.push({
        period: fullPeriod,
        periodDisplay: periodLabel(fullPeriod),
        condition: textSummary || cloudPrecipSummary || ICON_CODE_DESCRIPTIONS[icon ? String(icon).padStart(2, '0') : '00'] || '',
        iconCode: icon ? String(icon).padStart(2, '0') : '00',
        high,
        low: nightLow,
        pop,
      });
    }
  }

  if (!condition && dayForecasts.length > 0) {
    const first = dayForecasts[0];
    iconCode = first.iconCode;
    condition =
      first.condition ||
      currentCondition ||
      ICON_CODE_DESCRIPTIONS[iconCode] ||
      ICON_CODE_DESCRIPTIONS['02'];
    if (todayHigh === 0) todayHigh = first.high ?? currentTemp;
  }

  return {
    location: locationProvince
      ? `${locationName}, ${locationProvince}`
      : locationName || province,
    condition: condition || ICON_CODE_DESCRIPTIONS[iconCode] || '—',
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
