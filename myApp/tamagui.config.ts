import { createTamagui, createTokens, createFont } from 'tamagui'
import { createAnimations } from '@tamagui/animations-react-native'

const animations = createAnimations({
  bouncy: { type: 'spring', damping: 10, mass: 0.9, stiffness: 100 },
  quick: { type: 'spring', damping: 20, mass: 1.2, stiffness: 250 },
  lazy: { type: 'spring', damping: 20, stiffness: 60 },
})

const systemFont = createFont({
  family: 'System',
  size: { 1: 11, 2: 13, 3: 14, 4: 15, 5: 16, 6: 20, 7: 24, 8: 28 },
  lineHeight: { 1: 13, 2: 18, 3: 19, 4: 20, 5: 22, 6: 25, 7: 30, 8: 34 },
  weight: { 4: '400', 6: '600', 7: '700' },
  letterSpacing: { 5: -0.1, 8: -0.3 },
  face: {
    400: { normal: 'System' },
    600: { normal: 'System' },
    700: { normal: 'System' },
  },
})

const tokens = createTokens({
  size: { true: 16, 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32, 9: 40, 10: 44, 11: 48, 12: 64 },
  space: { true: 16, 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32, 9: 40, 10: 44, 11: 48, 12: 64 },
  radius: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, pill: 9999, badge: 5 },
  zIndex: { 0: 0, 1: 100, 2: 200, 3: 300, 4: 400, 5: 500 },
  color: {
    background: '#FBFBF8',
    foreground: '#1F2723',
    textSecondary: '#808868',
    accent: '#F9583B',
    cardBg: '#F0EDE5',
    cardBgLight: '#EAEAE4',
    success: '#2E7D52',
    model: '#BA4C8B',
    modelBadgeBg: '#FEECFB',
    ctaPrimary: '#1F2723',
    ctaPrimaryText: '#FBFBF8',
    ctaSecondary: '#FBFBF8',
    ctaSecondaryText: '#1F2723',
    white: '#FFFFFF',
    transparent: 'transparent',
  },
})

const config = createTamagui({
  animations,
  defaultTheme: 'light',
  shouldAddPrefersColorThemes: false,
  themeClassNameOnRoot: false,
  fonts: {
    heading: systemFont,
    body: systemFont,
  },
  tokens,
  themes: {
    light: {
      background: tokens.color.background,
      color: tokens.color.foreground,
      colorSecondary: tokens.color.textSecondary,
      accent: tokens.color.accent,
      cardBg: tokens.color.cardBg,
      cardBgLight: tokens.color.cardBgLight,
      success: tokens.color.success,
      model: tokens.color.model,
      modelBadgeBg: tokens.color.modelBadgeBg,
      ctaPrimary: tokens.color.ctaPrimary,
      ctaPrimaryText: tokens.color.ctaPrimaryText,
    },
  },
  shorthands: {
    px: 'paddingHorizontal',
    py: 'paddingVertical',
    mx: 'marginHorizontal',
    my: 'marginVertical',
    bg: 'backgroundColor',
    br: 'borderRadius',
    w: 'width',
    h: 'height',
    f: 'flex',
  } as const,
})

export type AppConfig = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config
