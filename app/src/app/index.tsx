import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { UI_STRINGS } from '@/constants/languages';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { BrandMark, Button, Screen, Txt } from '@/ui';

const PILLS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'mic', label: 'Voice-first' },
  { icon: 'language', label: '10 भाषाएं' },
  { icon: 'ribbon', label: 'PM-AJAY' },
];

// Real example utterances (same ones shown on the Speak screen) typed out on
// loop — sells "just talk to it" before the user has touched anything.
const PHRASES = UI_STRINGS.en.examples;

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

/** Types a phrase out, holds, deletes it, then moves to the next — classic
 *  typewriter loop. Self-contained so the screen doesn't need extra state. */
function useTypewriter(phrases: readonly string[]) {
  const [idx, setIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'deleting'>('typing');

  useEffect(() => {
    const phrase = phrases[idx % phrases.length];
    let t: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      if (count < phrase.length) {
        t = setTimeout(() => setCount((c) => c + 1), 34 + Math.random() * 22);
      } else {
        t = setTimeout(() => setPhase('deleting'), 1700);
      }
    } else {
      if (count > 0) {
        t = setTimeout(() => setCount((c) => c - 1), 16);
      } else {
        t = setTimeout(() => {
          setIdx((i) => (i + 1) % phrases.length);
          setPhase('typing');
        }, 350);
      }
    }
    return () => clearTimeout(t);
  }, [count, phase, idx, phrases]);

  return phrases[idx % phrases.length].slice(0, count);
}

function FloatingPill({ icon, label, index }: { icon: keyof typeof Ionicons.glyphMap; label: string; index: number }) {
  const ty = useSharedValue(0);

  useEffect(() => {
    ty.value = withDelay(
      index * 180,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 1500 + index * 120, easing: Easing.inOut(Easing.sin) }),
          withTiming(6, { duration: 1500 + index * 120, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));

  return (
    <Animated.View style={[styles.pill, style]}>
      <Ionicons name={icon} size={14} color="#fff" />
      <Txt variant="caption" style={{ color: '#fff', fontWeight: '600' }}>
        {label}
      </Txt>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const { ready: storeReady, language } = useStore();
  const { ready: authReady, token } = useAuth();
  const { c, gradient, elevation } = useTheme();
  const ready = storeReady && authReady;

  const typed = useTypewriter(PHRASES);
  const [cursorOn, setCursorOn] = useState(true);

  const driftGradient = [...gradient.hero].reverse() as [string, string, ...string[]];
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);
  const driftStyle = useAnimatedStyle(() => ({ opacity: drift.value }));

  useEffect(() => {
    const id = setInterval(() => setCursorOn((v) => !v), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
    // returning, fully-onboarded user — skip straight to the assistant
    if (language && token) router.replace('/main');
  }, [ready, language, token]);

  if (!ready) return null;

  return (
    <Screen edges={['top']}>
      <View style={styles.hero}>
        <LinearGradient colors={gradient.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <AnimatedGradient
          colors={driftGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, driftStyle]}
        />
        <View pointerEvents="none" style={[styles.blob, styles.blobA]} />
        <View pointerEvents="none" style={[styles.blob, styles.blobB]} />

        <Animated.View entering={FadeIn.duration(600)} style={styles.brand}>
          <View style={[styles.markBadge, elevation('float')]}>
            <BrandMark size={110} />
          </View>

          <Txt variant="hero" tone="onPrimary" center style={{ marginTop: 6 }}>
            Saksham
          </Txt>
          <Txt variant="bodyLg" center style={{ color: 'rgba(255,255,255,0.92)', marginTop: 2, fontWeight: '600' }}>
            सक्षम
          </Txt>

          <View style={styles.typewriterBox}>
            <Ionicons name="mic" size={13} color="rgba(255,255,255,0.85)" />
            <Txt variant="bodyLg" style={{ color: '#fff', flexShrink: 1 }}>
              “{typed}
              <Txt style={{ color: '#fff', opacity: cursorOn ? 1 : 0 }}>▍</Txt>”
            </Txt>
          </View>

          <Animated.View entering={FadeInDown.delay(200).duration(450)} style={styles.pillRow}>
            {PILLS.map((p, i) => (
              <FloatingPill key={p.label} icon={p.icon} label={p.label} index={i} />
            ))}
          </Animated.View>
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeInDown.delay(150).duration(450).springify().damping(18)}
        style={[styles.sheet, { backgroundColor: c.bg }, elevation('float')]}>
        <View style={[styles.grip, { backgroundColor: c.borderStrong }]} />
        <Button
          label="Get Started · शुरू करें"
          icon="arrow-forward"
          variant="green"
          onPress={() => router.push('/language')}
        />
        <Txt variant="caption" tone="faint" center style={{ marginTop: 16 }}>
          Ministry of Social Justice & Empowerment · PM-AJAY
        </Txt>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999 },
  blobA: { width: 220, height: 220, top: -60, right: -70, backgroundColor: 'rgba(255,255,255,0.14)' },
  blobB: { width: 170, height: 170, bottom: -50, left: -60, backgroundColor: 'rgba(255,255,255,0.10)' },
  brand: { alignItems: 'center' },
  markBadge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typewriterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    minHeight: 52,
    maxWidth: 300,
    justifyContent: 'center',
  },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 14,
    paddingHorizontal: 28,
    paddingBottom: 28,
    alignItems: 'stretch',
  },
  grip: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 18, opacity: 0.6 },
});
