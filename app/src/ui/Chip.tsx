import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Txt } from './Txt';

type Tone = 'neutral' | 'primary' | 'accent' | 'success';

interface Props {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
}

export function Chip({ label, icon, tone = 'neutral' }: Props) {
  const { c, radius } = useTheme();
  const map = {
    neutral: { bg: c.surfaceAlt, fg: c.textDim },
    primary: { bg: c.primarySoft, fg: c.primary },
    accent: { bg: c.accentSoft, fg: c.warn },
    success: { bg: c.successSoft, fg: c.success },
  }[tone];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: map.bg,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radius.pill,
      }}>
      {icon && <Ionicons name={icon} size={13} color={map.fg} />}
      <Txt variant="caption" style={{ color: map.fg }}>
        {label}
      </Txt>
    </View>
  );
}
