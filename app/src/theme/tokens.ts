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
  accentSoft: string;
  success: string;
  successSoft: string;
  warn: string;
  warnSoft: string;
  danger: string;
  dangerSoft: string;
  scrim: string;
}

const palette: Record<Scheme, Palette> = {
  light: {
    bg: '#F3F6FC',
    bgElevated: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceAlt: '#EDF2FB',
    surfaceSunken: '#E6ECF8',
    border: '#E1E8F5',
    borderStrong: '#CBD6EC',

    text: '#132038',
    textDim: '#556588',
    textFaint: '#8B99B7',

    primary: '#1F6FEB',
    primaryDark: '#1355C4',
    primarySoft: '#E4EEFE',
    onPrimary: '#FFFFFF',

    accent: '#F5A524',
    accentSoft: '#FCEBCB',

    success: '#149B63',
    successSoft: '#D5F0E4',
    warn: '#C97A0E',
    warnSoft: '#FBECD2',
    danger: '#E5484D',
    dangerSoft: '#FADFDF',

    scrim: 'rgba(12,20,40,0.45)',
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

    primary: '#4C97FF',
    primaryDark: '#2E71D9',
    primarySoft: '#18294A',
    onPrimary: '#FFFFFF',

    accent: '#FFB84D',
    accentSoft: '#3A2E14',

    success: '#2BB57C',
    successSoft: '#123528',
    warn: '#E0A23C',
    warnSoft: '#33280F',
    danger: '#FF6B6F',
    dangerSoft: '#3A1C1D',

    scrim: 'rgba(0,0,0,0.6)',
  },
};

interface GradientSet {
  primary: readonly [string, string, ...string[]];
  hero: readonly [string, string, ...string[]];
}

export const gradients: Record<Scheme, GradientSet> = {
  light: {
    primary: ['#2E8BFF', '#1355C4'],
    hero: ['#2E8BFF', '#1B63D6', '#0E4AB0'],
  },
  dark: {
    primary: ['#4C97FF', '#255FC9'],
    hero: ['#1E3A6B', '#132747', '#0B1120'],
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

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const type = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800' as const, letterSpacing: -0.3 },
  h2: { fontSize: 19, lineHeight: 25, fontWeight: '700' as const, letterSpacing: -0.2 },
  bodyLg: { fontSize: 17, lineHeight: 26, fontWeight: '500' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '500' as const },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '600' as const },
  caption: { fontSize: 12.5, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.2 },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
} as const;

export function elevation(scheme: Scheme, level: 'card' | 'raised' | 'float') {
  if (scheme === 'dark') {
    // shadows read poorly on dark; lean on borders instead
    return { shadowColor: '#000', shadowOpacity: level === 'float' ? 0.5 : 0.3, shadowRadius: level === 'float' ? 24 : 12, shadowOffset: { width: 0, height: level === 'float' ? 10 : 4 }, elevation: level === 'float' ? 12 : 4 };
  }
  const map = {
    card: { shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
    raised: { shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
    float: { shadowOpacity: 0.18, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 14 },
  } as const;
  return { shadowColor: '#1B3A73', ...map[level] };
}

export { palette };
