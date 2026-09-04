import { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/theme';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  /** stagger index for the entrance animation */
  index?: number;
  flat?: boolean;
}

export function Card({ children, style, padded = true, index = 0, flat }: Props) {
  const { c, radius, elevation } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(360).springify().damping(18)}
      style={[
        {
          backgroundColor: c.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: c.border,
        },
        padded && { padding: 18 },
        !flat && elevation('card'),
        style,
      ]}>
      {children}
    </Animated.View>
  );
}

export function Divider() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.border, marginVertical: 14 }} />;
}
