import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { Txt } from './Txt';

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'green' | 'danger';
type Size = 'md' | 'lg';

// Matches the leaves in the Saksham mark.
const GREEN_GRADIENT = ['#2FAE60', '#0E7C3D'] as const;

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
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const height = size === 'lg' ? 58 : 46;
  const isSolid = variant === 'primary' || variant === 'success' || variant === 'green';
  const fg =
    variant === 'primary' || variant === 'success' || variant === 'green'
      ? c.onPrimary
      : variant === 'ghost'
        ? c.primary
        : variant === 'danger'
          ? c.danger
          : c.text;

  const surface: ViewStyle =
    variant === 'secondary'
      ? { backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border }
      : variant === 'ghost'
        ? { backgroundColor: 'transparent' }
        : variant === 'danger'
          ? { backgroundColor: c.dangerSoft, borderWidth: 1, borderColor: c.danger }
          : {};

  function press() {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
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

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => (scale.value = withSpring(0.96, { damping: 18 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 14 }))}
      onPress={press}
      disabled={disabled || loading}
      style={[
        anim,
        {
          height,
          borderRadius: radius.lg,
          opacity: disabled ? 0.45 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        isSolid && elevation('card'),
        style,
      ]}>
      {isSolid ? (
        <LinearGradient
          colors={
            variant === 'success'
              ? [c.success, c.success]
              : variant === 'green'
                ? GREEN_GRADIENT
                : gradient.primary
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fill, { borderRadius: radius.lg, paddingHorizontal: 22 }]}>
          {inner}
        </LinearGradient>
      ) : (
        <View style={[styles.fill, surface, { borderRadius: radius.lg, paddingHorizontal: 22 }]}>
          {inner}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
