import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { setRecommendationStatus, type NsqfMapping, type CourseRecommendation } from '@/lib/api';
import { UI_STRINGS } from '@/constants/languages';
import { getIntent, getLastResult } from '@/lib/session';
import { speak, stopSpeaking } from '@/lib/speech';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Button, Card, Chip, Meter, Screen, Txt } from '@/ui';

export default function ResultsScreen() {
  const { language } = useStore();
  const { c, radius } = useTheme();
  const result = getLastResult();
  const intent = getIntent();
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;
  const sectionTitle = intent === 'jobs' ? t.jobsTitle : intent === 'certificate' ? t.certTitle : t.recommended;

  // the admin funnel is SUGGESTED -> VIEWED -> ... ; reaching this screen is
  // what "viewed" means, now that courses carry no call-to-action of their own
  useEffect(() => {
    for (const r of result?.recommendations ?? []) {
      if (r.recommendationId) setRecommendationStatus(r.recommendationId, 'VIEWED').catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (result?.reply.text && language) {
      const timer = setTimeout(() => speak(result.reply.text, language), 350);
      return () => {
        clearTimeout(timer);
        stopSpeaking();
      };
    }
  }, []);

  if (!language) return <Redirect href="/" />;
  if (!result) return <Redirect href="/main/speak" />;

  // multiple spoken phrases can map to the same NSQF qualification (e.g.
  // "tailoring" and "embroidery" both point at the Self Employed Tailor QP) —
  // dedupe so it isn't shown twice.
  const known = result.mappings
    .filter((m) => m.title)
    .filter((m, i, arr) => arr.findIndex((x) => x.qpCode === m.qpCode) === i);

  return (
    <Screen edges={['top']}>
      {/* header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/main/speak'))}
          hitSlop={12}
          style={[styles.iconBtn, { backgroundColor: c.surfaceAlt }]}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <Pressable
          onPress={() => result.reply.text && speak(result.reply.text, language)}
          hitSlop={12}
          style={[styles.iconBtn, { backgroundColor: c.primarySoft }]}>
          <Ionicons name="volume-high" size={20} color={c.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* transcript */}
        <Card index={0}>
          <Txt variant="overline" tone="faint">
            {t.yourSkill}
          </Txt>
          <View style={styles.quoteRow}>
            <View style={[styles.quoteBar, { backgroundColor: c.primary }]} />
            <Txt variant="bodyLg" style={{ flex: 1, fontStyle: 'italic' }}>
              {result.transcript}
            </Txt>
          </View>
        </Card>

        {/* nsqf */}
        {known.length > 0 ? (
          known.map((m, i) => <NsqfCard key={m.qpCode} m={m} label={t.nsqfMatch} matchLabel={t.matchLabel} index={i + 1} />)
        ) : (
          <Card index={1} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="help-circle-outline" size={26} color={c.warn} />
            <Txt variant="body" tone="dim" style={{ flex: 1 }}>
              {t.noMatch}
            </Txt>
          </Card>
        )}

        {/* recommendations */}
        {result.recommendations.length > 0 && (
          <View style={{ gap: 12, marginTop: 4 }}>
            <View style={styles.sectionHead}>
              <Ionicons name="school" size={18} color={c.primary} />
              <Txt variant="h2">{sectionTitle}</Txt>
              <View style={[styles.countPill, { backgroundColor: c.primarySoft }]}>
                <Txt variant="caption" style={{ color: c.primary }}>
                  {result.recommendations.length}
                </Txt>
              </View>
            </View>
            {result.recommendations.map((r, i) => (
              <CourseCard key={r.pmajayCourseId} r={r} t={t} index={i + 2} />
            ))}
          </View>
        )}

        <View style={{ height: 8 }} />
      </ScrollView>

      {/* sticky footer */}
      <View style={[styles.footer, { backgroundColor: c.bg, borderTopColor: c.border }]}>
        <View style={{ flex: 1 }}>
          <Button
            label={t.speakAgain}
            variant="secondary"
            size="md"
            icon="refresh"
            onPress={() => result.reply.text && speak(result.reply.text, language)}
          />
        </View>
        <View style={{ flex: 1.2 }}>
          <Button label={t.askAgain} size="md" icon="mic" onPress={() => router.replace('/main/speak')} />
        </View>
      </View>
    </Screen>
  );
}

function NsqfCard({
  m,
  label,
  matchLabel,
  index,
}: {
  m: NsqfMapping;
  label: string;
  matchLabel: string;
  index: number;
}) {
  return (
    <Card index={index}>
      <Txt variant="overline" tone="faint">
        {label}
      </Txt>
      <View style={styles.nsqfRow}>
        <View style={{ flex: 1, gap: 8 }}>
          <Txt variant="h2">{m.title}</Txt>
          <View style={styles.chipRow}>
            {m.qpCode && <Chip label={m.qpCode} tone="primary" icon="pricetag" />}
            {m.sector && <Chip label={m.sector} />}
            {m.nsqfLevel != null && <Chip label={`NSQF ${m.nsqfLevel}`} tone="accent" icon="layers" />}
          </View>
        </View>
        <Meter value={m.confidence} label={matchLabel} />
      </View>
    </Card>
  );
}

function CourseCard({
  r,
  t,
  index,
}: {
  r: CourseRecommendation;
  t: (typeof UI_STRINGS)['hi'];
  index: number;
}) {
  const { c, radius } = useTheme();
  return (
    <Card index={index} style={{ gap: 12 }}>
      <View style={styles.progHead}>
        <View style={[styles.schemeBadge, { backgroundColor: c.primary }]}>
          <Txt variant="caption" style={{ color: '#fff' }}>
            PM-AJAY · {r.subCourseCode}
          </Txt>
        </View>
        <Meter value={r.score} size={44} />
      </View>

      <Txt variant="h2" style={{ lineHeight: 26 }}>
        {r.subCourseName}
      </Txt>

      {!!r.rationale && (
        <View style={[styles.why, { backgroundColor: c.surfaceAlt, borderRadius: radius.md }]}>
          <Ionicons name="sparkles" size={14} color={c.accent} />
          <Txt variant="body" tone="dim" style={{ flex: 1 }}>
            {r.rationale}
          </Txt>
        </View>
      )}

      <View style={styles.chipRow}>
        <Chip label={r.sector} />
        {r.nsqfLevel != null && <Chip label={`NSQF ${r.nsqfLevel}`} icon="layers" tone="primary" />}
        <Chip label={r.courseLevel} icon="ribbon" />
      </View>

      {!!r.nsqfTitle && (
        <Txt variant="caption" tone="faint">
          {r.nsqfQpCode} · {r.nsqfTitle}
        </Txt>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  quoteRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  quoteBar: { width: 4, borderRadius: 2 },
  nsqfRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  countPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  progHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  schemeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  why: { flexDirection: 'row', gap: 8, padding: 12, alignItems: 'flex-start' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
});
