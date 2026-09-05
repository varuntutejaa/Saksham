import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Txt } from './Txt';

type Tone = 'neutral' | 'primary' | 'accent' | 'violet' | 'pink' | 'sun' | 'info' | 'success';

interface Props {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
}

export function Chip({ label, icon, tone = 'neutral' }: Props) {
  const { c, radius } = useTheme();
  const map = {
    neutral: { bg: c.surfaceAlt, fg: c.textDim },
    primary: { bg: c.primarySoft, fg: c.primaryDark },
    accent: { bg: c.accentSoft, fg: c.accentDark },
    violet: { bg: c.violetSoft, fg: c.violetDark },
    pink: { bg: c.pinkSoft, fg: c.pinkDark },
    sun: { bg: c.sunSoft, fg: c.sunDark },
    info: { bg: c.infoSoft, fg: c.infoDark },
    success: { bg: c.successSoft, fg: c.successDark },
  }[tone];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: map.bg,
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: radius.pill,
      }}>
      {icon && <Ionicons name={icon} size={13} color={map.fg} />}
      <Txt variant="caption" style={{ color: map.fg, fontWeight: '600' }}>
        {label}
      </Txt>
    </View>
  );
}
