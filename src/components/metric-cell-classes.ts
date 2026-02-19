import { twJoin } from 'tailwind-merge'

const baseCellClass = twJoin(
  'flex',
  'flex-col',
  'items-center',
  'justify-center',
  'px-6',
  'border-foreground/20',
  'gap-2',
)

export const cellClass = twJoin(baseCellClass, 'border-b', 'border-r')
export const cellClassLastRow = twJoin(baseCellClass, 'border-r')
export const unitSpanClass = twJoin('unit', 'text-[1em]')
