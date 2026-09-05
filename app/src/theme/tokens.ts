/**
 * Saksham design tokens. One source of truth for colour, type, spacing, radius
 * and elevation. Consume via `useTheme()` — never hard-code a hex in a screen.
 */

export type Scheme = 'light' | 'dark';

export interface Palette {
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textDim: string;
  textFaint: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  onPrimary: string;
  accent: string;
  accentDark: string;
  accentSoft: string;
  violet: string;
  violetDark: string;
  violetSoft: string;
  pink: string;
  pinkDark: string;
  pinkSoft: string;
  sun: string;
  sunDark: string;
  sunSoft: string;
  info: string;
  infoDark: string;
  infoSoft: string;
  success: string;
  successDark: string;
  successSoft: string;
  warn: string;
  warnSoft: string;
  danger: string;
  dangerDark: string;
  dangerSoft: string;
  scrim: string;
}

const palette: Record<Scheme, Palette> = {
  light: {
    bg: '#F5F7FB',
    bgElevated: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF1FA',
    surfaceSunken: '#E7EBF6',
    border: '#E4E9F6',
    borderStrong: '#CDD6EC',

    text: '#12172B',
    textDim: '#565F7D',
    textFaint: '#8B93AC',

    // Brand green — the mic/leaves in the mark. Vivid, not corporate-blue.
    primary: '#12B76A',
    primaryDark: '#0B8F52',
    primarySoft: '#DEFBEA',
    onPrimary: '#FFFFFF',

    // Brand orange — the rising figure in the mark.
    accent: '#FF8A34',
    accentDark: '#D96A17',
    accentSoft: '#FFE9D3',

    violet: '#7C5CFC',
    violetDark: '#5B3FE0',
    violetSoft: '#EEE8FF',

    pink: '#FF5D8F',
    pinkDark: '#DE2E68',
    pinkSoft: '#FFE1EC',

    sun: '#FFC93C',
    sunDark: '#C98F00',
    sunSoft: '#FFF3D2',

    info: '#3B82F6',
    infoDark: '#1D5FDB',
    infoSoft: '#DDEAFE',

    success: '#0EA773',
    successDark: '#0A7D57',
    successSoft: '#D8F5E8',
    warn: '#D97706',
    warnSoft: '#FDECC8',
    danger: '#F43F5E',
    dangerDark: '#C11F3D',
    dangerSoft: '#FFE1E7',

    scrim: 'rgba(12,20,40,0.5)',
  },
  dark: {
    bg: '#0B1120',
    bgElevated: '#131C2E',
    surface: '#151F33',
    surfaceAlt: '#1C2942',
    surfaceSunken: '#0F1826',
    border: '#28344E',
    borderStrong: '#3A4967',

    text: '#EDF1FB',
    textDim: '#A2B1CE',
    textFaint: '#66759A',

    primary: '#1FD888',
    primaryDark: '#12B76A',
    primarySoft: '#0F2E22',
    onPrimary: '#04170F',

    accent: '#FFA255',
    accentDark: '#D96A17',
    accentSoft: '#3A2412',

    violet: '#9C85FF',
    violetDark: '#7C5CFC',
    violetSoft: '#221B45',

    pink: '#FF7DA6',
    pinkDark: '#DE2E68',
    pinkSoft: '#3A1826',

    sun: '#FFD666',
    sunDark: '#C98F00',
    sunSoft: '#332608',

    info: '#4C97FF',
    infoDark: '#2E71D9',
    infoSoft: '#18294A',

    success: '#2BB57C',
    successDark: '#0A7D57',
    successSoft: '#123528',
    warn: '#E0A23C',
    warnSoft: '#33280F',
    danger: '#FF6B6F',
    dangerDark: '#C11F3D',
    dangerSoft: '#3A1C1D',

    scrim: 'rgba(0,0,0,0.6)',
  },
};

interface GradientSet {
  primary: readonly [string, string, ...string[]];
  hero: readonly [string, string, ...string[]];
  sunset: readonly [string, string, ...string[]];
}

export const gradients: Record<Scheme, GradientSet> = {
  light: {
    primary: ['#1DD379', '#0B8F52'],
    hero: ['#12B76A', '#0E9F6E', '#5B3FE0'],
    sunset: ['#FF8A34', '#FF5D8F'],
  },
  dark: {
    primary: ['#1FD888', '#0B8F52'],
    hero: ['#0B3A2A', '#12253F', '#1B1240'],
    sunset: ['#D96A17', '#DE2E68'],
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// Bigger, rounder than a typical enterprise app on purpose — big soft shapes
// read as friendly/energetic rather than clinical.
export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  xxl: 44,
  pill: 999,
} as const;

// Plain system font, normal weights, no letter-spacing tricks. Negative
// tracking and heavy (700+) synthetic-bold weights look broken on Devanagari
// and other Indic scripts (browsers fake bold by smearing glyphs, and
// tightened tracking collides conjuncts/matras) — so this scale stays close to
// default HTML weights (400/500/600) across every language, not just Latin.
export const type = {
  hero: { fontSize: 38, lineHeight: 45, fontWeight: '600' as const },
  display: { fontSize: 30, lineHeight: 38, fontWeight: '600' as const },
  title: { fontSize: 22, lineHeight: 29, fontWeight: '600' as const },
  h2: { fontSize: 18, lineHeight: 25, fontWeight: '500' as const },
  bodyLg: { fontSize: 17, lineHeight: 26, fontWeight: '400' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '500' as const },
  caption: { fontSize: 12.5, lineHeight: 16, fontWeight: '400' as const },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '500' as const },
} as const;

export function elevation(
  scheme: Scheme,
  level: 'card' | 'raised' | 'float',
  tint?: string,
) {
  if (scheme === 'dark') {
    // shadows read poorly on dark; lean on borders instead
    return {
      shadowColor: tint ?? '#000',
      shadowOpacity: level === 'float' ? 0.5 : 0.3,
      shadowRadius: level === 'float' ? 24 : 12,
      shadowOffset: { width: 0, height: level === 'float' ? 10 : 4 },
      elevation: level === 'float' ? 12 : 4,
    };
  }
  const map = {
    card: { shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
    raised: { shadowOpacity: 0.14, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 7 },
    float: { shadowOpacity: 0.22, shadowRadius: 32, shadowOffset: { width: 0, height: 18 }, elevation: 15 },
  } as const;
  return { shadowColor: tint ?? '#16204A', ...map[level] };
}

export { palette };
