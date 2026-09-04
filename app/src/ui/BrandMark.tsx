import { Image, View } from 'react-native';

// The uploaded Saksham logo (tricolor mic + rising figure + leaves, with the
// SAKSHAM wordmark). Used as-is — nothing redrawn.
const SOURCE = require('../../assets/images/logo-full.png');
const SRC_W = 1536;
const SRC_H = 1024;
// Bounding box of just the circular mark (mic/figure/leaves, no wordmark)
// within the source image, found by inspection — lets compact UI slots (avatars,
// header icons) show a clean crop of the same file instead of the whole banner.
const MARK = { x: 38, y: 224, w: 556, h: 556 };

interface Props {
  size?: number;
}

// Note: the source file's right side (the "SAKSHAM" wordmark) sits on an
// opaque dark-green backdrop baked into the PNG, which clashes with this
// app's white theme — so every call site uses this cropped, transparent
// circular mark rather than the full banner. Set text ("Saksham"/"सक्षम")
// is rendered separately alongside it wherever it's needed.
export function BrandMark({ size = 40 }: Props) {
  const scale = size / MARK.w;
  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <Image
        source={SOURCE}
        resizeMode="stretch"
        style={{
          width: SRC_W * scale,
          height: SRC_H * scale,
          marginLeft: -MARK.x * scale,
          marginTop: -MARK.y * scale,
        }}
      />
    </View>
  );
}
