import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/theme';

type Variant = 'hero' | 'display' | 'title' | 'h2' | 'bodyLg' | 'body' | 'label' | 'caption' | 'overline';
type Tone = 'default' | 'dim' | 'faint' | 'primary' | 'onPrimary' | 'success' | 'danger';

interface Props extends TextProps {
  variant?: Variant;
  tone?: Tone;
  center?: boolean;
  style?: TextStyle | TextStyle[];
}

export function Txt({ variant = 'body', tone = 'default', center, style, children, ...rest }: Props) {
  const { c, type } = useTheme();
  const toneColor: Record<Tone, string> = {
    default: c.text,
    dim: c.textDim,
    faint: c.textFaint,
    primary: c.primary,
    onPrimary: c.onPrimary,
    success: c.success,
    danger: c.danger,
  };
  return (
    <Text
      {...rest}
      style={[
        type[variant],
        { color: toneColor[tone] },
        center && { textAlign: 'center' },
        style as TextStyle,
      ]}
    >
      {children}
    </Text>
  );
}
