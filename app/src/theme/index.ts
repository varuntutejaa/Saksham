import { useColorScheme } from 'react-native';
import {
  palette,
  gradients,
  spacing,
  radius,
  type,
  elevation,
  type Palette,
  type Scheme,
} from './tokens';

export interface Theme {
  scheme: Scheme;
  c: Palette;
  gradient: (typeof gradients)['light'];
  spacing: typeof spacing;
  radius: typeof radius;
  type: typeof type;
  elevation: (level: 'card' | 'raised' | 'float') => ReturnType<typeof elevation>;
}

export function useTheme(): Theme {
  const scheme: Scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return {
    scheme,
    c: palette[scheme],
    gradient: gradients[scheme],
    spacing,
    radius,
    type,
    elevation: (level) => elevation(scheme, level),
  };
}

export { spacing, radius, type } from './tokens';
