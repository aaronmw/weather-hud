const MINUS = '\u2212'

export function formatNumeric(value: string | number): string {
  return String(value).replace(/^-/, MINUS)
}
