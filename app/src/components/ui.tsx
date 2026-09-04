import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Colors } from '@/constants/theme';

export function useColors() {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}

export function Title({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.title, { color: c.text }]}>{children}</Text>;
}

export function Subtitle({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.subtitle, { color: c.textSecondary }]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[styles.card, { backgroundColor: c.backgroundElement }, style]}>{children}</View>;
}

interface BigButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}

export function BigButton({ label, onPress, variant = 'primary', loading, disabled, icon }: BigButtonProps) {
  const c = useColors();
  const bg = variant === 'primary' ? '#208AEF' : c.backgroundSelected;
  const fg = variant === 'primary' ? '#ffffff' : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.bigButton,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.bigButtonRow}>
          {icon}
          <Text style={[styles.bigButtonText, { color: fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 18, textAlign: 'center', lineHeight: 26 },
  card: { borderRadius: 20, padding: 20, gap: 8 },
  bigButton: {
    minHeight: 64,
    borderRadius: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bigButtonText: { fontSize: 20, fontWeight: '700' },
});
