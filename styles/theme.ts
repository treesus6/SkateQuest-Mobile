/**
 * SkateQuest brand theme constants.
 * Use these in StyleSheet or reference in tailwind.config.js.
 */

export const colors = {
  brand: {
    orange: '#d2673d',
    red: '#FF5A3C',
    dark: '#05070B',
    card: '#121826',
    muted: '#1F2A3C',
    gold: '#FFB84C',
  },
  text: {
    primary: '#F5F5F5',
    secondary: '#C7CED9',
    muted: '#9CA3AF',
  },
  success: '#0a8f08',
  white: '#fff',
  black: '#000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 28,
  xxxl: 32,
} as const;
