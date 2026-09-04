import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { setRecommendationStatus, type ProgramRecommendation } from '@/lib/api';
import { UI_STRINGS } from '@/constants/languages';
import { getLastResult } from '@/lib/session';
import { speak, stopSpeaking } from '@/lib/speech';
import { useStore } from '@/lib/store';
import { BigButton, Card, Title, useColors } from '@/components/ui';

export default function ResultsScreen() {
  const { language } = useStore();
  const c = useColors();
  const result = getLastResult();
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;

  useEffect(() => {
    if (result?.reply.text && language) speak(result.reply.text, language);
    return stopSpeaking;
  }, []);

  if (!language) return <Redirect href="/" />;
  if (!result) return <Redirect href="/home" />;

  const known = result.mappings.filter((m) => m.title);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t.yourSkill}</Text>
          <Text style={[styles.transcript, { color: c.text }]}>“{result.transcript}”</Text>
        </Card>

        {known.length > 0 && (
          <Card>
            <Text style={[styles.label, { color: c.textSecondary }]}>{t.nsqfMatch}</Text>
            {known.map((m) => (
              <View key={m.qpCode} style={styles.nsqfRow}>
                <View style={styles.flex}>
                  <Text style={[styles.nsqfTitle, { color: c.text }]}>{m.title}</Text>
                  <Text style={[styles.nsqfMeta, { color: c.textSecondary }]}>
                    {m.qpCode} · {m.sector} · NSQF {m.nsqfLevel}
                  </Text>
                </View>
                <Text style={styles.confidence}>{Math.round(m.confidence * 100)}%</Text>
              </View>
            ))}
          </Card>
        )}

        <Title>{t.recommended}</Title>
        {result.recommendations.map((r) => (
          <ProgramCard key={r.trainingProgramId} r={r} t={t} />
        ))}

        <BigButton
          label={t.speakAgain}
          variant="secondary"
          onPress={() => result.reply.text && speak(result.reply.text, language)}
        />
        <BigButton label={t.tryAgain} onPress={() => router.replace('/home')} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgramCard({
  r,
  t,
}: {
  r: ProgramRecommendation;
  t: (typeof UI_STRINGS)['hi'];
}) {
  const c = useColors();
  return (
    <Card style={styles.programCard}>
      <View style={styles.programHead}>
        <Text style={[styles.badge, { backgroundColor: '#208AEF22', color: '#208AEF' }]}>
          {r.scheme}
          {r.component ? ` · ${r.component}` : ''}
        </Text>
        <Text style={[styles.score, { color: c.textSecondary }]}>
          {Math.round(r.score * 100)}
        </Text>
      </View>
      <Text style={[styles.programName, { color: c.text }]}>{r.nameHindi ?? r.name}</Text>
      <Text style={[styles.rationale, { color: c.textSecondary }]}>{r.rationale}</Text>
      <View style={styles.metaRow}>
        {r.district && <Meta text={`📍 ${r.district}, ${r.state}`} />}
        {r.durationWeeks && <Meta text={`⏱ ${r.durationWeeks} ${t.weeks}`} />}
        {typeof r.seatsAvailable === 'number' && <Meta text={`🎟 ${r.seatsAvailable} ${t.seats}`} />}
        {r.stipend && <Meta text={`💰 ${t.stipendYes}`} />}
      </View>
      {r.contactPhone && (
        <Pressable
          onPress={() => {
            if (r.recommendationId) setRecommendationStatus(r.recommendationId, 'INTERESTED');
            Linking.openURL(`tel:${r.contactPhone}`);
          }}
          style={styles.callBtn}>
          <Text style={styles.callText}>📞 {t.call} — {r.contactPhone}</Text>
        </Pressable>
      )}
    </Card>
  );
}

function Meta({ text }: { text: string }) {
  const c = useColors();
  return <Text style={[styles.meta, { color: c.textSecondary, backgroundColor: c.backgroundSelected }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  transcript: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  nsqfRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  nsqfTitle: { fontSize: 17, fontWeight: '700' },
  nsqfMeta: { fontSize: 14, marginTop: 2 },
  confidence: { fontSize: 16, fontWeight: '700', color: '#2E9B57' },
  programCard: { gap: 10 },
  programHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  score: { fontSize: 14, fontWeight: '700' },
  programName: { fontSize: 19, fontWeight: '700', lineHeight: 26 },
  rationale: { fontSize: 15, lineHeight: 22 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  meta: { fontSize: 13, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden' },
  callBtn: { marginTop: 6, backgroundColor: '#2E9B57', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  callText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
