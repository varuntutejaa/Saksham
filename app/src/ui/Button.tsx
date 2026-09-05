import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { Txt } from './Txt';

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'green' | 'danger';
type Size = 'md' | 'lg';

// Matches the leaves in the Saksham mark.
const GREEN_GRADIENT = ['#2FAE60', '#0E7C3D'] as const;
const GREEN_LIP = '#0A5C2E';
// A punchier teal-to-emerald sweep for "call to action" buttons — distinct
// from the flatter brand-green fill so it doesn't read as a solid colour.
const CALL_GRADIENT = ['#22D3A6', '#0EA773', '#0A7A54'] as const;
const CALL_LIP = '#065A3D';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  loading,
  disabled,
  fullWidth = true,
  style,
}: Props) {
  const { c, radius, gradient, elevation } = useTheme();
  const press = useSharedValue(0);
  const scale = useSharedValue(1);

  const height = size === 'lg' ? 58 : 46;
  const lip = size === 'lg' ? 7 : 5;

  // Chunky, tactile "3D" press for the high-emphasis actions — the ones that
  // matter get a physical push-down, not just a fade. Everything else stays flat.
  const hasLip = variant === 'primary' || variant === 'success' || variant === 'green';

  const fg =
    hasLip
      ? c.onPrimary
      : variant === 'ghost'
        ? c.primary
        : variant === 'danger'
          ? c.danger
          : c.text;

  const surface: ViewStyle =
    variant === 'secondary'
      ? { backgroundColor: c.surfaceAlt, borderWidth: 1.5, borderColor: c.border }
      : variant === 'ghost'
        ? { backgroundColor: 'transparent' }
        : variant === 'danger'
          ? { backgroundColor: c.dangerSoft, borderWidth: 1.5, borderColor: c.danger }
          : {};

  const fillColors: readonly [string, string, ...string[]] =
    variant === 'success' ? CALL_GRADIENT : variant === 'green' ? GREEN_GRADIENT : gradient.primary;
  const lipColor = variant === 'success' ? CALL_LIP : variant === 'green' ? GREEN_LIP : c.primaryDark;

  function press_() {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  }

  const faceAnim = useAnimatedStyle(() =>
    hasLip
      ? { transform: [{ translateY: press.value * lip }] }
      : { transform: [{ scale: scale.value }] },
  );

  function onPressIn() {
    if (hasLip) press.value = withTiming(1, { duration: 90 });
    else scale.value = withSpring(0.96, { damping: 18 });
  }
  function onPressOut() {
    if (hasLip) press.value = withTiming(0, { duration: 140 });
    else scale.value = withSpring(1, { damping: 14 });
  }

  const inner = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={size === 'lg' ? 22 : 18} color={fg} />}
          <Txt variant={size === 'lg' ? 'bodyLg' : 'label'} style={{ color: fg, fontWeight: '600' }}>
            {label}
          </Txt>
        </>
      )}
    </View>
  );

  if (hasLip) {
    return (
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={press_}
        disabled={disabled || loading}
        style={[
          {
            height: height + lip,
            opacity: disabled ? 0.45 : 1,
            alignSelf: fullWidth ? 'stretch' : 'flex-start',
          },
          style,
        ]}>
        <View
          pointerEvents="none"
          style={[
            styles.lip,
            { top: lip, height, borderRadius: radius.lg, backgroundColor: lipColor },
          ]}
        />
        <Animated.View
          style={[
            styles.face,
            { height, borderRadius: radius.lg, overflow: 'hidden' },
            elevation('raised'),
            faceAnim,
          ]}>
          <LinearGradient colors={fillColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.fill, { paddingHorizontal: 22 }]}>
            {inner}
          </LinearGradient>
        </Animated.View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={press_}
      disabled={disabled || loading}
      style={[
        faceAnim,
        {
          height,
          borderRadius: radius.lg,
          opacity: disabled ? 0.45 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}>
      <View style={[styles.fill, surface, { borderRadius: radius.lg, paddingHorizontal: 22 }]}>{inner}</View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lip: { position: 'absolute', left: 0, right: 0 },
  face: { position: 'absolute', left: 0, right: 0, top: 0 },
});
