import { View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme';

interface Props {
  step: number; // 1-based
  total: number;
}

export function StepProgress({ step, total }: Props) {
  const { c, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <Segment key={i} filled={i < step} color={c.primary} track={c.surfaceAlt} radius={radius.pill} />
      ))}
    </View>
  );
}

function Segment({
  filled,
  color,
  track,
  radius,
}: {
  filled: boolean;
  color: string;
  track: string;
  radius: number;
}) {
  const style = useAnimatedStyle(() => ({
    backgroundColor: withTiming(filled ? color : track, { duration: 300 }),
  }));
  return <Animated.View style={[{ flex: 1, height: 6, borderRadius: radius }, style]} />;
}
