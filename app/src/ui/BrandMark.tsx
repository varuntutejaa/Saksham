import Svg, { Path, G, Rect } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
  barColor?: string;
}

/** The Saksham mark — a speech bubble holding four rising bars. */
export function BrandMark({ size = 40, color = '#FFFFFF', barColor = 'rgba(255,255,255,0.0)' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G>
        <Path
          d="M13 9 h74 a11 11 0 0 1 11 11 v40 a11 11 0 0 1 -11 11 h-42 l-14 13 v-13 h-8 a11 11 0 0 1 -11 -11 v-40 a11 11 0 0 1 11 -11 z"
          fill={color}
        />
        <G fill={barColor === 'rgba(255,255,255,0.0)' ? '#1F6FEB' : barColor}>
          <Rect x={25} y={40} width={10} height={16} rx={4} />
          <Rect x={38} y={30} width={10} height={26} rx={4} />
          <Rect x={51} y={20} width={10} height={36} rx={4} />
          <Rect x={64} y={10} width={10} height={46} rx={4} />
        </G>
      </G>
    </Svg>
  );
}
