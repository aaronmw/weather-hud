const MINUS = '\u2013'

const CARDINALS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const

export function formatNumeric(value: string | number): string {
  return String(value).replace(/^-/, MINUS)
}

export function degreesToCardinal(deg: number): string {
  const i = Math.round(deg / 22.5) % 16
  return CARDINALS[i]
}
