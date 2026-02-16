import { formatNumeric } from '@/lib/format'

interface ValueAndUnitPairProps {
  value: string | number
  unit: string
}

export function ValueAndUnitPair({ value, unit }: ValueAndUnitPairProps) {
  return (
    <span className="inline-flex items-center">
      <span className="tertiary-value">{formatNumeric(value)}</span>
      <span className="unit">{unit}</span>
    </span>
  )
}
