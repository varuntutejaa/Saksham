import { Text } from 'react-native';

interface Props {
  size?: number;
  color?: string;
  barColor?: string;
}

/**
 * The Saksham mark. Kept as a plain emoji rather than a custom SVG — simplest,
 * renders crisp at any size, and needs no asset pipeline.
 * `color`/`barColor` are accepted for call-site compatibility but unused.
 */
export function BrandMark({ size = 40 }: Props) {
  return <Text style={{ fontSize: size * 0.62, lineHeight: size }}>🎙️</Text>;
}
