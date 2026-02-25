# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Weather HUD is a full-screen, ambient weather display for Canmore, Alberta. It runs as a browser-based heads-up display intended for continuous display on a wall-mounted screen. The location (EC site code `s0000403`) is hardcoded in `src/lib/ec-weather.ts`.

## Commands

- `npm run dev` — start dev server (uses `--webpack` flag, not Turbopack)
- `npm run build` — production build
- `npm run lint` — ESLint 9 flat config
- No test framework is configured

## Tech Stack

- **Next.js 16** with App Router, React 19, TypeScript (strict)
- **Tailwind CSS v4** — uses v4 syntax: `@import 'tailwindcss'`, `@utility`, `@theme inline` (not v3 `@tailwind` directives)
- **Font Awesome Pro** via CDN Kit script — icon style is config-driven via `FONT_AWESOME_ICON_STYLE` in `src/lib/config.ts`
- **fast-xml-parser** for parsing Environment Canada XML weather data
- **tailwind-merge** (`twJoin`/`twMerge`) for class composition
- No env vars required — the EC weather API is public and unauthenticated

## Architecture

**Data flow:** EC XML → server route handler → JSON → client polling

1. `src/app/api/weather/route.ts` — GET handler with 1-hour ISR cache (`revalidate = 3600`). Calls `fetchCanmoreWeather()`.
2. `src/lib/ec-weather.ts` — scrapes EC's hourly directory listing to find the latest XML for Canmore, parses it into a typed `WeatherData` interface.
3. `src/app/page.tsx` — `'use client'` component that polls `/api/weather` every 15 minutes. Plain `useState`/`useRef` for state.

## Styling Conventions

- Base font size is `text-[2vh]` on `html` — all sizing is viewport-height relative for fixed-screen display
- Layout uses a CSS grid with named areas defined as `@utility weather-grid` in `globals.css`
- Grid area classes follow `ga-{name}` naming (e.g., `ga-condition-header`, `ga-wind-current`)
- Text uses two sizes: `text-big` and `text-small` (defined via `@utility` in `globals.css`)
- Burn-in orbit animation (`burn-in-orbit` keyframes) is a core feature for OLED/CRT protection — do not remove

## Key Config (`src/lib/config.ts`)

- `REFRESH_INTERVAL_MS` (15 min) — client polling interval
- `BURN_IN_ORBIT_RADIUS_PX` / `BURN_IN_ORBIT_DURATION_MS` — burn-in prevention orbit parameters
- `FONT_AWESOME_ICON_STYLE` — global FA icon variant (currently `duotone-regular`)

## Code Style

- Prettier: single quotes, no semicolons, 2-space indent, trailing commas, `singleAttributePerLine: true`
- `prettier-plugin-tailwindcss` with `tailwindFunctions: ["twJoin", "twMerge"]`
- Conventional Commits format (e.g., `feat(weather):`, `style(globals):`, `chore(config):`)
- Unicode minus (`\u2212`) for negative numbers via `formatNumeric()` in `src/lib/format.ts`
- `'use client'` on components that use hooks/browser APIs (`page.tsx`, `Icon.tsx`)
