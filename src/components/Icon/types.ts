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
  | 'cloud'
  | 'cloud-bolt'
  | 'cloud-rain'
  | 'cloud-snow'
  | 'cloud-sun'
  | 'droplet'
  | 'plus'
  | 'snowflake'
  | 'sun'
  | 'wind'
