import { type ReactNode } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/theme';

type Tint = 'primary' | 'accent' | 'violet' | 'pink' | 'sun' | 'info' | 'success' | 'danger';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  /** stagger index for the entrance animation */
  index?: number;
  flat?: boolean;
  /** colourful surface fill instead of the default white card */
  tint?: Tint;
}

export function Card({ children, style, padded = true, index = 0, flat, tint }: Props) {
  const { c, radius, elevation } = useTheme();

  const tintMap: Record<Tint, { bg: string; border: string }> = {
    primary: { bg: c.primarySoft, border: c.primary },
    accent: { bg: c.accentSoft, border: c.accent },
    violet: { bg: c.violetSoft, border: c.violet },
    pink: { bg: c.pinkSoft, border: c.pink },
    sun: { bg: c.sunSoft, border: c.sun },
    info: { bg: c.infoSoft, border: c.info },
    success: { bg: c.successSoft, border: c.success },
    danger: { bg: c.dangerSoft, border: c.danger },
  };

  const colors = tint ? tintMap[tint] : { bg: c.surface, border: c.border };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(360).springify().damping(18)}
      style={[
        {
          backgroundColor: colors.bg,
          borderRadius: radius.lg,
          borderWidth: tint ? 0 : 1,
          borderColor: colors.border,
        },
        padded && { padding: 18 },
        !flat && elevation('card'),
        style,
      ]}>
      {children}
    </Animated.View>
  );
}
