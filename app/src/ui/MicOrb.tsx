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
  /** normalized 0-1 live mic volume, only meaningful while state === 'listening' */
  level?: number;
}

// Closed colour loops (first === last) so a full rotation blends seamlessly.
// Two offset sets per state are layered and counter-rotated for a richer,
// shimmering "AI voice agent" swirl instead of a flat two-stop gradient.
const PALETTES: Record<MicState, { a: readonly string[]; b: readonly string[] }> = {
  idle: {
    a: ['#1355C4', '#3D2E8C', '#0E6E6D', '#1355C4'],
    b: ['#0E6E6D', '#1355C4', '#3D2E8C', '#0E6E6D'],
  },
  listening: {
    a: ['#A9291E', '#7A1B33', '#96203F', '#A9291E'],
    b: ['#96203F', '#A9291E', '#7A1B33', '#96203F'],
  },
  thinking: {
    a: ['#3D2E8C', '#12419E', '#4B2E8C', '#3D2E8C'],
    b: ['#4B2E8C', '#3D2E8C', '#12419E', '#4B2E8C'],
  },
};

const ROTATION_MS: Record<MicState, number> = {
  idle: 9000,
  listening: 4200,
  thinking: 2400,
};

export function MicOrb({ state, onPress, size = 168, level = 0 }: Props) {
  const { c } = useTheme();
  const pulse = useSharedValue(0);
  const breathe = useSharedValue(0);
  const spin = useSharedValue(0);
  const rotateA = useSharedValue(0);
  const rotateB = useSharedValue(0);
  const smoothLevel = useSharedValue(0);

  useEffect(() => {
    smoothLevel.value = withTiming(level, { duration: 120, easing: Easing.out(Easing.ease) });
  }, [level]);

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

  // The swirl keeps spinning continuously across state changes — only its
  // speed and palette change — so the orb always reads as "alive", never static.
  useEffect(() => {
    const duration = ROTATION_MS[state];
    cancelAnimation(rotateA);
    cancelAnimation(rotateB);
    rotateA.value = withRepeat(withTiming(rotateA.value + 360, { duration, easing: Easing.linear }), -1, false);
    rotateB.value = withRepeat(withTiming(rotateB.value - 360, { duration: duration * 1.7, easing: Easing.linear }), -1, false);
  }, [state]);

  const ring1 = useAnimatedStyle(() => ({
    opacity: state === 'listening' ? 0.5 - pulse.value * 0.5 : 0,
    transform: [{ scale: 1 + pulse.value * (0.55 + smoothLevel.value * 0.5) }],
  }));
  const ring2 = useAnimatedStyle(() => ({
    opacity: state === 'listening' ? 0.35 - ((pulse.value + 0.4) % 1) * 0.35 : 0,
    transform: [{ scale: 1 + ((pulse.value + 0.4) % 1) * (0.65 + smoothLevel.value * 0.5) }],
  }));
  const glow = useAnimatedStyle(() => ({
    opacity: state === 'listening' ? 0.35 + smoothLevel.value * 0.4 : state === 'thinking' ? 0.3 : 0.18,
    transform: [{ scale: 1 + smoothLevel.value * 0.15 }],
  }));
  const core = useAnimatedStyle(() => ({
    transform: [
      { scale: state === 'idle' ? 1 + breathe.value * 0.04 : state === 'listening' ? 1 + smoothLevel.value * 0.07 : 1 },
    ],
  }));
  const spinner = useAnimatedStyle(() => ({
    opacity: state === 'thinking' ? 1 : 0,
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));
  const swirlA = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotateA.value}deg` }] }));
  const swirlB = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotateB.value}deg` }] }));

  const palette = PALETTES[state];
  const glowColor = state === 'listening' ? c.danger : c.primary;
  const bigSize = size * 1.9;

  return (
    <View
      style={{
        width: size * 1.7,
        height: size * 1.7,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Animated.View
        style={[
          styles.glow,
          { width: size * 1.5, height: size * 1.5, borderRadius: size * 0.75, backgroundColor: glowColor },
          glow,
        ]}
      />

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
          style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
          <View
            style={[
              styles.mask,
              { width: size, height: size, borderRadius: size / 2, shadowColor: glowColor },
            ]}>
            <Animated.View
              style={[styles.swirlLayer, { width: bigSize, height: bigSize, marginLeft: -bigSize / 2, marginTop: -bigSize / 2 }, swirlA]}>
              <LinearGradient
                colors={palette.a as [string, string, ...string[]]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.fill}
              />
            </Animated.View>
            <Animated.View
              style={[styles.swirlLayer, { width: bigSize, height: bigSize, marginLeft: -bigSize / 2, marginTop: -bigSize / 2, opacity: 0.55 }, swirlB]}>
              <LinearGradient
                colors={palette.b as [string, string, ...string[]]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.fill}
              />
            </Animated.View>
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
              start={{ x: 0.15, y: 0.05 }}
              end={{ x: 0.7, y: 0.7 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.iconWrap}>
              <Ionicons name={state === 'listening' ? 'stop' : 'mic'} size={size * 0.4} color="#fff" />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute' },
  ring: { position: 'absolute' },
  spinnerRing: {
    position: 'absolute',
    borderWidth: 3,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  mask: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
  swirlLayer: { position: 'absolute', top: '50%', left: '50%' },
  fill: { flex: 1 },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
});
