interface ValueAndUnitPairProps {
  value: string | number
  unit: string
}

export function ValueAndUnitPair({ value, unit }: ValueAndUnitPairProps) {
  return (
    <>
      <span className="value">{value}</span>
      <span className="unit">{unit}</span>
    </>
  )
}
