import { twJoin } from 'tailwind-merge'

export const REFRESH_INTERVAL_MS = 15 * 60 * 1000
export const DEFAULT_SITE_CODE = 's0000403'
export const DEFAULT_PROVINCE = 'AB'
export const CANMORE_LAT = 51.09
export const CANMORE_LNG = -115.36
export const CANMORE_TZ = 'America/Edmonton'
export const BURN_IN_ORBIT_RADIUS_PX = 5
export const BURN_IN_ORBIT_DURATION_MS = 60_000
export const NUM_FORECASTED_HOURS = 6

export const WIND_THRESHOLD_LOW_KMH = 20
export const WIND_THRESHOLD_HIGH_KMH = 60

export const CHART_INSET_TOP = '0'
export const CHART_INSET_RIGHT = '3vh'
export const CHART_INSET_BOTTOM = '3vh'
export const CHART_INSET_LEFT = '3vh'
export const CHART_GAP_X = 16
export const LABEL_OPACITY_STEP_PCT = 10
export const WEATHER_CARD_BORDER_RADIUS_PX = 16
export const WEATHER_CARD_BORDER_RING_PX = 6
export const CHART_TIME_ROW_HEIGHT_PX = 32
export const CHART_TIME_ROW_PADDING_V_PX = 8
export const CHART_TOP_RESERVE_PX = 14

export const CHART_SCALE_PADDING_BELOW = 2
export const CHART_Y_BOTTOM_MARGIN_RATIO = 0.2
export const OFFSET_SCALE = 0.5

export const SCALE_FACTOR_FOR_NOW = 2.5
export const SCALE_FACTOR_FOR_OTHERS = 1.5

export const FONT_AWESOME_ICON_STYLE = 'sharp-solid' as FontAwesomeIconStyle

export const FREEZE_ZONE_CLASSES = twJoin(
  'absolute',
  'pointer-events-none',
  'bg-linear-to-b',
  'from-blue-900/20',
  'to-transparent',
  'border-blue-900/25',
  'border-2',
)

export type FontAwesomeIconStyle =
  | 'chisel'
  | 'classic-light'
  | 'classic-regular'
  | 'classic-solid'
  | 'classic-thin'
  | 'duotone-light'
  | 'duotone-regular'
  | 'duotone-solid'
  | 'duotone-thin'
  | 'etch'
  | 'graphite'
  | 'jelly'
  | 'jelly-duo'
  | 'jelly-fill'
  | 'notdog'
  | 'notdog-duo'
  | 'sharp-duotone-light'
  | 'sharp-duotone-regular'
  | 'sharp-duotone-solid'
  | 'sharp-duotone-thin'
  | 'sharp-light'
  | 'sharp-regular'
  | 'sharp-solid'
  | 'sharp-thin'
  | 'slab'
  | 'slab-press'
  | 'thumbprint'
  | 'utility'
  | 'utility-duo'
  | 'utility-fill'
  | 'whiteboard'
