import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, StyleSheet, View } from 'react-native';

import { getPrograms, type Program } from '@/lib/api';
import { UI_STRINGS } from '@/constants/languages';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Button, Card, Chip, Screen, Txt } from '@/ui';

export default function ProgramsScreen() {
  const { language, state, district } = useStore();
  const { c } = useTheme();
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    setPrograms(null);
    getPrograms({ state, district })
      // if a location filter returns nothing, fall back to the full list
      .then(async (rows) => (rows.length > 0 ? rows : getPrograms()))
      .then(setPrograms)
      .catch(() => setError(true));
  }, [state, district]);

  useEffect(load, [load]);

  if (!language) return null;
  const t = UI_STRINGS[language];

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Txt variant="title">{t.programsTitle}</Txt>
        <Txt variant="body" tone="dim">
          {t.programsSubtitle}
        </Txt>
      </View>

      {error && (
        <View style={styles.center}>
          <Txt variant="body" tone="danger" center>
            {t.noConnection}
          </Txt>
          <Button label={t.tryAgain} variant="secondary" size="md" onPress={load} style={{ marginTop: 12 }} />
        </View>
      )}

      {!error && programs === null && (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
          <Txt variant="body" tone="dim" style={{ marginTop: 8 }}>
            {t.loadingPrograms}
          </Txt>
        </View>
      )}

      {!error && programs && (
        <FlatList
          data={programs}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Card index={index} style={{ gap: 10 }}>
              <View style={styles.badgeRow}>
                <View style={[styles.schemeBadge, { backgroundColor: c.primary }]}>
                  <Txt variant="caption" style={{ color: '#fff' }}>
                    {item.scheme}
                    {item.component ? ` · ${item.component}` : ''}
                  </Txt>
                </View>
                {item.stipend && <Chip label={t.stipendYes} icon="cash" tone="accent" />}
              </View>
              <Txt variant="h2">{language === 'hi' ? item.nameHindi ?? item.name : item.name}</Txt>
              <View style={styles.chipRow}>
                {item.sector && <Chip label={item.sector} />}
                {item.nsqfLevel != null && <Chip label={`NSQF ${item.nsqfLevel}`} icon="layers" />}
                {item.durationWeeks != null && <Chip label={`${item.durationWeeks} ${t.weeks}`} icon="time" />}
                {typeof item.seatsAvailable === 'number' && (
                  <Chip label={`${item.seatsAvailable} ${t.seats}`} icon="people" tone="success" />
                )}
              </View>
              {(item.district || item.state) && (
                <Txt variant="caption" tone="faint">
                  📍 {[item.district, item.state].filter(Boolean).join(', ')}
                </Txt>
              )}
              {item.contactPhone && (
                <Button
                  label={`${t.call} · ${item.contactPhone}`}
                  variant="success"
                  size="md"
                  icon="call"
                  onPress={() => Linking.openURL(`tel:${item.contactPhone}`).catch(() => {})}
                />
              )}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, gap: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  list: { padding: 20, paddingTop: 12, gap: 12 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  schemeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
});
