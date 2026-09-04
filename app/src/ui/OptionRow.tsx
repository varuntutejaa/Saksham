import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { Txt } from './Txt';

interface Props {
  label: string;
  sublabel?: string;
  emoji?: string;
  selected?: boolean;
  onPress: () => void;
  index?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function OptionRow({ label, sublabel, emoji, selected, onPress, index = 0 }: Props) {
  const { c, radius, elevation } = useTheme();
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    checkScale.value = selected
      ? withSequence(withSpring(1.3, { damping: 8 }), withSpring(1, { damping: 10 }))
      : withTiming(0, { duration: 150 });
  }, [selected]);

  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  function press() {
    Haptics.selectionAsync().catch(() => {});
    onPress();
  }

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(360).springify().damping(16)}>
      <AnimatedPressable
        onPressIn={() => (scale.value = withSpring(0.97, { damping: 16 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 12 }))}
        onPress={press}
        style={[
          pressStyle,
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            borderRadius: radius.lg,
            borderWidth: 2,
            borderColor: selected ? c.primary : c.border,
            backgroundColor: selected ? c.primarySoft : c.surface,
            paddingVertical: 18,
            paddingHorizontal: 18,
          },
          elevation('card'),
        ]}>
        {emoji && <Txt style={{ fontSize: 26 }}>{emoji}</Txt>}
        <View style={{ flex: 1 }}>
          <Txt variant="bodyLg" style={{ fontWeight: '600' }}>
            {label}
          </Txt>
          {sublabel && (
            <Txt variant="caption" tone="faint">
              {sublabel}
            </Txt>
          )}
        </View>
        <Animated.View style={checkStyle}>
          <Ionicons name="checkmark-circle" size={26} color={c.primary} />
        </Animated.View>
      </AnimatedPressable>
    </Animated.View>
  );
}
