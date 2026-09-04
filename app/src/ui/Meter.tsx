import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme';
import { Txt } from './Txt';

interface Props {
  /** 0..1 */
  value: number;
  size?: number;
  label?: string;
  showPercent?: boolean;
}

export function Meter({ value, size = 56, label, showPercent }: Props) {
  const { c } = useTheme();
  const v = Math.max(0, Math.min(1, value));
  const stroke = Math.max(4, size * 0.09);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const tone = v >= 0.7 ? c.success : v >= 0.4 ? c.warn : c.textFaint;
  const pct = Math.round(v * 100);
  const usePercent = showPercent ?? size >= 52;

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.surfaceAlt} strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={tone}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circ * v} ${circ}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Txt
          style={{
            color: tone,
            fontWeight: '800',
            fontSize: size * (usePercent ? 0.24 : 0.34),
            includeFontPadding: false,
          }}>
          {pct}
          {usePercent ? '%' : ''}
        </Txt>
      </View>
      {label && (
        <Txt variant="overline" tone="faint">
          {label}
        </Txt>
      )}
    </View>
  );
}
