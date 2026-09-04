import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { UI_STRINGS } from '@/constants/languages';
import { getLastResult } from '@/lib/session';
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
  const { language } = useStore();
  const { c, radius, elevation } = useTheme();
  const result = getLastResult();

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
      const timer = setTimeout(() => speak(confirmation, language), 350);
      return () => {
        clearTimeout(timer);
        stopSpeaking();
      };
    }
  }, []);

  if (!language) return <Redirect href="/" />;
  if (!result) return <Redirect href="/main/speak" />;

  function choose(intent: Intent) {
    setIntent(intent);
    router.push('/results');
  }

  const optionLabel: Record<Intent, string> = {
    jobs: t.optionJobs,
    training: t.optionTraining,
    certificate: t.optionCertificate,
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
                  style={({ pressed }) => [
                    styles.option,
                    { borderRadius: radius.lg, borderColor: pressed ? c.primary : c.border, backgroundColor: c.surface },
                    elevation('card'),
                  ]}>
                  <View style={[styles.optionIconBadge, { backgroundColor: c.primarySoft }]}>
                    <Ionicons name={o.icon} size={20} color={c.primary} />
                  </View>
                  <Txt variant="bodyLg" style={{ flex: 1, fontWeight: '500' }}>
                    {optionLabel[o.intent]}
                  </Txt>
                  <Ionicons name="chevron-forward" size={20} color={c.textFaint} />
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
