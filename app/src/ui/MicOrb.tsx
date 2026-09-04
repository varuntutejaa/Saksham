import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';

export type MicState = 'idle' | 'listening' | 'thinking';

interface Props {
  state: MicState;
  onPress: () => void;
  size?: number;
}

export function MicOrb({ state, onPress, size = 168 }: Props) {
  const { c, gradient } = useTheme();
  const pulse = useSharedValue(0);
  const breathe = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(pulse);
    cancelAnimation(breathe);
    cancelAnimation(spin);

    if (state === 'listening') {
      pulse.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }), -1, false);
    } else if (state === 'thinking') {
      spin.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.linear }), -1, false);
    } else {
      breathe.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    }
  }, [state]);

  const ring1 = useAnimatedStyle(() => ({
    opacity: state === 'listening' ? 0.5 - pulse.value * 0.5 : 0,
    transform: [{ scale: 1 + pulse.value * 0.6 }],
  }));
  const ring2 = useAnimatedStyle(() => ({
    opacity: state === 'listening' ? 0.35 - ((pulse.value + 0.4) % 1) * 0.35 : 0,
    transform: [{ scale: 1 + ((pulse.value + 0.4) % 1) * 0.7 }],
  }));
  const core = useAnimatedStyle(() => ({
    transform: [{ scale: state === 'idle' ? 1 + breathe.value * 0.04 : 1 }],
  }));
  const spinner = useAnimatedStyle(() => ({
    opacity: state === 'thinking' ? 1 : 0,
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const colors =
    state === 'listening' ? ([c.danger, '#B7343A'] as const) : gradient.primary;

  return (
    <View
      style={{
        width: size * 1.5,
        height: size * 1.5,
        alignItems: 'center',
        justifyContent: 'center',
      }}>

      <Animated.View
        style={[styles.ring, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.danger }, ring1]}
      />
      <Animated.View
        style={[styles.ring, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.danger }, ring2]}
      />
      <Animated.View
        style={[
          styles.spinnerRing,
          { width: size + 18, height: size + 18, borderRadius: (size + 18) / 2, borderColor: c.primary },
          spinner,
        ]}
      />
      <Animated.View style={core}>
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
          <LinearGradient
            colors={colors}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[
              styles.core,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                shadowColor: state === 'listening' ? c.danger : c.primary,
              },
            ]}>
            <Ionicons
              name={state === 'listening' ? 'stop' : 'mic'}
              size={size * 0.4}
              color="#fff"
            />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute' },
  spinnerRing: {
    position: 'absolute',
    borderWidth: 3,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
});
