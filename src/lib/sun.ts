/** NOAA-based sunrise/sunset calculator. Returns local Date objects. */

const RAD = Math.PI / 180
const DEG = 180 / Math.PI

export interface SunTimes {
  sunrise: Date
  sunset: Date
}

function dateInTimezone(date: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)!.value, 10)
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day'), 12, 0, 0))
}

export function getSunTimes(
  lat: number,
  lng: number,
  date: Date,
  timeZone?: string,
): SunTimes {
  const calcDate = timeZone ? dateInTimezone(date, timeZone) : date
  const jd = toJulianDay(calcDate)
  const jc = (jd - 2451545) / 36525

  const geomMeanLongSun =
    (280.46646 + jc * (36000.76983 + 0.0003032 * jc)) % 360
  const geomMeanAnomSun = 357.52911 + jc * (35999.05029 - 0.0001537 * jc)
  const eccentEarthOrbit = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc)

  const sunEqOfCtr =
    Math.sin(geomMeanAnomSun * RAD) *
      (1.914602 - jc * (0.004817 + 0.000014 * jc)) +
    Math.sin(2 * geomMeanAnomSun * RAD) * (0.019993 - 0.000101 * jc) +
    Math.sin(3 * geomMeanAnomSun * RAD) * 0.000289

  const sunTrueLong = geomMeanLongSun + sunEqOfCtr
  const sunAppLong =
    sunTrueLong - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * jc) * RAD)

  const meanObliqEcliptic =
    23 +
    (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60
  const obliqCorr =
    meanObliqEcliptic + 0.00256 * Math.cos((125.04 - 1934.136 * jc) * RAD)

  const sunDeclin =
    Math.asin(Math.sin(obliqCorr * RAD) * Math.sin(sunAppLong * RAD)) * DEG

  const y = Math.tan((obliqCorr / 2) * RAD) ** 2
  const eqOfTime =
    4 *
    DEG *
    (y * Math.sin(2 * geomMeanLongSun * RAD) -
      2 * eccentEarthOrbit * Math.sin(geomMeanAnomSun * RAD) +
      4 *
        eccentEarthOrbit *
        y *
        Math.sin(geomMeanAnomSun * RAD) *
        Math.cos(2 * geomMeanLongSun * RAD) -
      0.5 * y * y * Math.sin(4 * geomMeanLongSun * RAD) -
      1.25 *
        eccentEarthOrbit *
        eccentEarthOrbit *
        Math.sin(2 * geomMeanAnomSun * RAD))

  const hourAngle =
    Math.acos(
      Math.cos(90.833 * RAD) /
        (Math.cos(lat * RAD) * Math.cos(sunDeclin * RAD)) -
        Math.tan(lat * RAD) * Math.tan(sunDeclin * RAD),
    ) * DEG

  const solarNoon = (720 - 4 * lng - eqOfTime) / 1440
  const sunriseMinutes = (solarNoon - (hourAngle * 4) / 1440) * 1440
  const sunsetMinutes = (solarNoon + (hourAngle * 4) / 1440) * 1440

  const dayStart = new Date(calcDate)
  dayStart.setUTCHours(0, 0, 0, 0)

  return {
    sunrise: new Date(dayStart.getTime() + sunriseMinutes * 60_000),
    sunset: new Date(dayStart.getTime() + sunsetMinutes * 60_000),
  }
}

function toJulianDay(date: Date): number {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1
  const d = date.getUTCDate() + date.getUTCHours() / 24
  const a = Math.floor((14 - m) / 12)
  const yy = y + 4800 - a
  const mm = m + 12 * a - 3
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  )
}
