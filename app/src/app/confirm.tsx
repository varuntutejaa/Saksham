import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { reprioritise } from '@/lib/api';
import { UI_STRINGS } from '@/constants/languages';
import { resolveDeviceLocation } from '@/lib/location';
import { getLastResult, setLastResult } from '@/lib/session';
import type { Intent } from '@/lib/session';
import { setIntent } from '@/lib/session';
import { speak, stopSpeaking } from '@/lib/speech';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { BrandMark, Card, Screen, Txt } from '@/ui';

const OPTIONS: { intent: Intent; icon: keyof typeof Ionicons.glyphMap }[] = [
  { intent: 'jobs', icon: 'briefcase' },
  { intent: 'training', icon: 'school' },
  { intent: 'certificate', icon: 'ribbon' },
];

export default function ConfirmScreen() {
  const { language, state, district, setLocation } = useStore();
  const { c, radius, elevation } = useTheme();
  const result = getLastResult();
  const [busy, setBusy] = useState<Intent | null>(null);

  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;
  const known = (result?.mappings ?? [])
    .filter((m) => m.title)
    .filter((m, i, arr) => arr.findIndex((x) => x.qpCode === m.qpCode) === i);
  const skillLabel = known.map((m) => m.title).join(', ');
  const confirmation = skillLabel
    ? t.confirmUnderstood.replace('{skill}', skillLabel)
    : t.noMatch;

  useEffect(() => {
    if (language && confirmation) {
      // Voice-first: read the confirmation, then the question itself — a
      // beneficiary who cannot read the option labels still learns what is
      // being asked. speak() stops any in-flight utterance, so the question
      // has to wait for onDone rather than being fired alongside it.
      const timer = setTimeout(
        () => speak(confirmation, language, { onDone: () => speak(t.whatNext, language) }),
        350,
      );
      return () => {
        clearTimeout(timer);
        stopSpeaking();
      };
    }
  }, []);

  if (!language) return <Redirect href="/" />;
  if (!result) return <Redirect href="/main/speak" />;

  async function choose(intent: Intent) {
    if (busy) return;
    setIntent(intent);
    setBusy(intent);
    stopSpeaking();
    // Re-rank server-side for what they actually asked for. Best-effort: if
    // the network is down reprioritise() returns null and we simply keep the
    // ordering we already have, so the flow never blocks on it.
    const current = getLastResult();
    let effectiveState = state ?? undefined;
    let effectiveDistrict = district ?? undefined;
    if (!effectiveState && !effectiveDistrict) {
      const loc = await resolveDeviceLocation();
      if (loc?.state || loc?.district) {
        effectiveState = loc.state;
        effectiveDistrict = loc.district;
        await setLocation(effectiveState, effectiveDistrict);
      }
    }
    if (current?.sessionId) {
      const ranked = await reprioritise(current.sessionId, intent, {
        state: effectiveState,
        district: effectiveDistrict,
      });
      if (ranked?.recommendations?.length) {
        setLastResult({
          ...current,
          recommendations: ranked.recommendations,
          jobs: ranked.jobs ?? current.jobs,
        });
      }
    }
    setBusy(null);
    router.push('/results');
  }

  const optionLabel: Record<Intent, string> = {
    jobs: t.optionJobs,
    training: t.optionTraining,
    certificate: t.optionCertificate,
    guidance: t.optionGuidance,
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace('/main/speak')}
          hitSlop={12}
          style={[styles.iconBtn, { backgroundColor: c.surfaceAlt }]}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* user bubble */}
        <Animated.View entering={FadeInUp.duration(350)} style={styles.bubbleRow}>
          <View style={[styles.avatarBadge, { backgroundColor: c.primarySoft }]}>
            <Ionicons name="mic" size={18} color={c.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="overline" tone="faint">
              {t.youSaid}
            </Txt>
            <View style={[styles.bubble, styles.userBubble, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              <Txt variant="bodyLg" style={{ fontStyle: 'italic' }}>
                {result.transcript}
              </Txt>
            </View>
          </View>
        </Animated.View>

        {/* assistant bubble */}
        <Animated.View entering={FadeInUp.delay(150).duration(350)} style={styles.bubbleRow}>
          <View style={[styles.avatarBadge, { backgroundColor: c.surfaceAlt }]}>
            <BrandMark size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="overline" tone="faint">
              SAKSHAM
            </Txt>
            <View style={[styles.bubble, { backgroundColor: c.primarySoft, borderColor: c.primarySoft }]}>
              <Txt variant="bodyLg" style={{ color: c.text }}>
                {confirmation}
              </Txt>
            </View>
          </View>
        </Animated.View>

        {/* options */}
        <Animated.View entering={FadeInDown.delay(300).duration(350)} style={{ marginTop: 8 }}>
          <Txt variant="h2" center style={{ marginBottom: 14 }}>
            {t.whatNext}
          </Txt>
          <View style={{ gap: 12 }}>
            {OPTIONS.map((o, i) => (
              <Animated.View key={o.intent} entering={FadeInDown.delay(360 + i * 70).duration(300)}>
                <Pressable
                  onPress={() => choose(o.intent)}
                  disabled={busy !== null}
                  style={({ pressed }) => [
                    styles.option,
                    { borderRadius: radius.lg, borderColor: pressed ? c.primary : c.border, backgroundColor: c.surface },
                    // dim the options not being loaded, so the tap clearly registered
                    busy !== null && busy !== o.intent && { opacity: 0.45 },
                    elevation('card'),
                  ]}>
                  <View style={[styles.optionIconBadge, { backgroundColor: c.primarySoft }]}>
                    <Ionicons name={o.icon} size={20} color={c.primary} />
                  </View>
                  <Txt variant="bodyLg" style={{ flex: 1, fontWeight: '500' }}>
                    {optionLabel[o.intent]}
                  </Txt>
                  {busy === o.intent ? (
                    <ActivityIndicator size="small" color={c.primary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={c.textFaint} />
                  )}
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, gap: 18 },
  bubbleRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  avatarBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bubble: { borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 4 },
  userBubble: { borderTopLeftRadius: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  optionIconBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
