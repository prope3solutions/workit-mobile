import { useColorScheme } from 'react-native'
import { useThemeStore } from '@/lib/stores/themeStore'

// ── Light palette ─────────────────────────────────────────────────────────────
export const lightColors = {
  // Core brand
  obsidian: '#0A0A0A',
  green: '#00E87A',
  greenDeep: '#00B85F',
  chalk: '#F5F5F0',
  white: '#FFFFFF',

  // Text
  text: '#0A0A0A',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',

  // Surfaces
  bg: '#F5F5F0',
  surface: '#FFFFFF',
  surface2: '#F0F0EA',

  // Borders
  border: '#E5E5E0',
  stone: '#E5E5E0',
  stone2: '#EFEFE9',

  // Utility
  slate: '#6B7280',
  ember: '#FF4444',
  amber: '#F59E0B',
  deep: '#111827',

  onAccent: '#0A0A0A',
  adminSurface: '#161616',
  adminBorder: '#2A2A2A',
} as const

// ── Dark palette ──────────────────────────────────────────────────────────────
export const darkColors = {
  // Core brand — unchanged
  obsidian: '#0A0A0A',
  green: '#00E87A',
  greenDeep: '#00B85F',
  chalk: '#F5F5F0',
  white: '#FFFFFF',

  // Text
  text: '#F0F0EA',
  textMuted: '#9CA3AF',
  textFaint: '#6B7280',

  // Surfaces
  bg: '#0F0F0F',
  surface: '#1A1A1A',
  surface2: '#222222',

  // Borders
  border: '#2A2A2A',
  stone: '#2A2A2A',
  stone2: '#242424',

  // Utility
  slate: '#9CA3AF',
  ember: '#FF5555',
  amber: '#F59E0B',
  deep: '#E5E5E0',

  onAccent: '#0A0A0A',
  adminSurface: '#161616',
  adminBorder: '#2A2A2A',
} as const

export type Colors = Record<keyof typeof lightColors, string>
export type ColorKey = keyof Colors

// Default export (light) — used by files that don't need dynamic theming
export const colors = lightColors

// ── Hook — resolves system/light/dark at runtime ──────────────────────────────
export function useColors(): Colors {
  const preference = useThemeStore((s) => s.preference)
  const system = useColorScheme()

  const isDark =
    preference === 'dark' ||
    (preference === 'system' && system === 'dark')

  return isDark ? darkColors : lightColors
}
