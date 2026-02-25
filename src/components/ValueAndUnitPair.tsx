import { formatNumeric } from '@/lib/format'

interface ValueAndUnitPairProps {
  value: string | number
  unit: string
}

export function ValueAndUnitPair({ value, unit }: ValueAndUnitPairProps) {
  return (
    <span className="primary-value inline-flex items-center">
      <span>{formatNumeric(value)}</span>
      <span className="unit">{unit}</span>
    </span>
  )
}
