import { ComponentProps } from 'react'

export interface IconProps extends Omit<ComponentProps<'span'>, 'name'> {
  name: IconString
  rotate?: IconRotationOption
  spin?: boolean
  variant?: IconVariant
}

export type IconString =
  | WeatherIconName
  | `brands:${string}`
  | `${Exclude<IconVariant, 'brands'>}:${WeatherIconName}`

export type IconName = WeatherIconName | string

export type IconRotationOption =
  | 90
  | 180
  | 270
  | 'flip-horizontal'
  | 'flip-vertical'
  | 'flip-both'

export type IconVariant =
  | 'brands'
  | 'duotone'
  | 'light'
  | 'regular'
  | 'semibold'
  | 'sharp-light'
  | 'sharp-regular'
  | 'sharp-solid'
  | 'sharp-thin'
  | 'solid'
  | 'thin'

export type WeatherIconName =
  | 'arrow-up'
  | 'bolt'
  | 'clock'
  | 'cloud'
  | 'gear'
  | 'cloud-bolt'
  | 'cloud-bolt-moon'
  | 'cloud-bolt-sun'
  | 'cloud-drizzle'
  | 'cloud-fog'
  | 'cloud-hail'
  | 'cloud-showers'
  | 'cloud-sleet'
  | 'cloud-snow'
  | 'clouds'
  | 'clouds-sun'
  | 'cloud-moon'
  | 'cloud-sun'
  | 'droplet'
  | 'fan'
  | 'moon-cloud'
  | 'plus'
  | 'smog'
  | 'smoke'
  | 'snow-blowing'
  | 'snowflake'
  | 'moon'
  | 'sun-bright'
  | 'sun-cloud'
  | 'sun-dust'
  | 'temperature-half'
  | 'wind'
