import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

interface Props {
  children: ReactNode;
  /** 'plain' = flat background, 'hero' = gradient wash behind a curved header */
  variant?: 'plain' | 'hero';
  /** override the hero wash colours (defaults to the theme's brand gradient) */
  heroColors?: readonly [string, string, ...string[]];
  edges?: Edge[];
  style?: ViewStyle;
}

export function Screen({
  children,
  variant = 'plain',
  heroColors,
  edges = ['top', 'bottom'],
  style,
}: Props) {
  const { c, gradient } = useTheme();

  if (variant === 'hero') {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg }]}>
        <LinearGradient
          colors={heroColors ?? gradient.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroWash}
        />
        {/* soft floating colour blobs for depth — no blur lib needed, just
            oversized low-opacity circles bleeding off the edges */}
        <View pointerEvents="none" style={[styles.blob, styles.blobA]} />
        <View pointerEvents="none" style={[styles.blob, styles.blobB]} />
        <SafeAreaView style={[styles.flex, style]} edges={edges}>
          {children}
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.bg }, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heroWash: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },
  blob: { position: 'absolute', borderRadius: 999 },
  blobA: {
    width: 220,
    height: 220,
    top: -60,
    right: -70,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  blobB: {
    width: 160,
    height: 160,
    top: 140,
    left: -60,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
});
