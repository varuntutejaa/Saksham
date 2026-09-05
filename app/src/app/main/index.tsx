import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { UI_STRINGS } from '@/constants/languages';
import { getPmajayCourses } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { resolveDeviceLocation } from '@/lib/location';
import { getLastResult } from '@/lib/session';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { BrandMark, Button, Card, Chip, Screen, Txt } from '@/ui';

/** A real PM-AJAY course card on the home screen — either scored against what
 *  the beneficiary just said, or a nationally available course if they haven't
 *  spoken yet. */
interface RecommendedItem {
  id: string;
  title: string;
  code: string;
  sector: string;
  courseLevel: string;
  nsqfLevel: number | null;
  rationale?: string;
}

function greetingKey(hour: number): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  if (hour < 12) return 'goodMorning';
  if (hour < 17) return 'goodAfternoon';
  return 'goodEvening';
}

export default function DashboardScreen() {
  const { language, state, district, setLocation, guestProfile } = useStore();
  const { user } = useAuth();
  const { c } = useTheme();
  const [hour, setHour] = useState(new Date().getHours());
  const [locating, setLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [recommended, setRecommended] = useState<RecommendedItem[] | null>(null);

  // Refetched on focus so a programme scored against the conversation the
  // beneficiary just had replaces the generic nearby list.
  useFocusEffect(
    useCallback(() => {
      const scored = getLastResult()?.recommendations;
      if (scored?.length) {
        setRecommended(
          scored.slice(0, 3).map((r) => ({
            id: r.pmajayCourseId,
            title: r.subCourseName,
            code: r.subCourseCode,
            sector: r.sector,
            courseLevel: r.courseLevel,
            nsqfLevel: r.nsqfLevel,
            rationale: r.rationale,
          })),
        );
        return;
      }
      let cancelled = false;
      getPmajayCourses({ courseLevel: 'National', pageSize: 3 })
        .then((page) => {
          if (cancelled) return;
          setRecommended(
            page.items.map((course) => ({
              id: course.id,
              title: course.subCourseName,
              code: course.subCourseCode,
              sector: course.sector,
              courseLevel: course.courseLevel,
              nsqfLevel: null,
            })),
          );
        })
        .catch(() => {
          if (!cancelled) setRecommended([]);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  // keep the greeting correct if the app is left open across a time boundary
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!language) return null;
  const t = UI_STRINGS[language];
  const greeting = t[greetingKey(hour)];
  const name = user?.name?.trim() || guestProfile?.name?.trim() || t.guestLabel;

  async function enableLocation() {
    setLocating(true);
    setLocationDenied(false);
    const loc = await resolveDeviceLocation();
    setLocating(false);
    if (loc) await setLocation(loc.state, loc.district);
    else setLocationDenied(true);
  }

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(450)} style={styles.header}>
          <View style={{ flex: 1 }}>
            <Txt variant="overline" tone="faint">
              {greeting}
            </Txt>
            <Txt variant="title" style={{ marginTop: 2 }}>
              {name}
            </Txt>
          </View>
          <View style={[styles.avatar, { backgroundColor: c.primarySoft }]}>
            <BrandMark size={30} />
          </View>
        </Animated.View>

        <Txt variant="body" tone="dim" style={{ marginTop: 2 }}>
          {t.homeSubtitle}
        </Txt>

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Card style={styles.speakCard} index={1}>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="h2" style={{ color: '#fff' }}>
                {t.speakCta}
              </Txt>
              <Txt variant="body" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {t.speakCtaHint}
              </Txt>
            </View>
            <Pressable
              onPress={() => router.push('/main/speak')}
              accessibilityRole="button"
              style={[styles.speakBtn, { backgroundColor: '#fff' }]}>
              <Ionicons name="mic" size={26} color={c.primary} />
            </Pressable>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(400)}>
          {state || district ? (
            <Pressable onPress={enableLocation} style={styles.chipRow}>
              {district && <Chip label={district} icon="location" tone="primary" />}
              {state && <Chip label={state} />}
              {locating ? (
                <ActivityIndicator size="small" color={c.primary} />
              ) : (
                <Txt variant="caption" tone="faint">
                  {t.changeLocation}
                </Txt>
              )}
            </Pressable>
          ) : (
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} padded={false}>
              <View style={styles.locCardInner}>
                <Ionicons name="location-outline" size={20} color={c.primary} />
                <View style={{ flex: 1 }}>
                  <Txt variant="label">{t.enableLocation}</Txt>
                  <Txt variant="caption" tone="dim">
                    {locationDenied ? t.locationDenied : t.enableLocationHint}
                  </Txt>
                </View>
                {locating ? (
                  <ActivityIndicator color={c.primary} />
                ) : (
                  <Pressable
                    onPress={enableLocation}
                    hitSlop={8}
                    style={[styles.locBtn, { backgroundColor: c.primarySoft }]}>
                    <Ionicons name="navigate" size={16} color={c.primary} />
                  </Pressable>
                )}
              </View>
            </Card>
          )}
        </Animated.View>

        {recommended !== null && recommended.length > 0 && (
          <Animated.View entering={FadeInDown.delay(170).duration(400)} style={{ gap: 10 }}>
            <View style={styles.sectionHead}>
              <Ionicons name="sparkles" size={17} color={c.primary} />
              <Txt variant="h2" style={{ flex: 1 }}>
                {t.recommended}
              </Txt>
              <Pressable onPress={() => router.push('/main/programs')} hitSlop={8}>
                <Txt variant="label" tone="primary">
                  {t.seeAll}
                </Txt>
              </Pressable>
            </View>
            {recommended.map((item, i) => (
              <Card key={item.id} index={i} style={{ gap: 8 }}>
                <Txt variant="overline" tone="faint">
                  {item.code}
                </Txt>
                <Txt variant="label">{item.title}</Txt>
                <View style={styles.chipRow}>
                  <Chip label={item.sector} />
                  {item.nsqfLevel != null && <Chip label={`NSQF ${item.nsqfLevel}`} icon="layers" tone="primary" />}
                  <Chip label={item.courseLevel} icon="ribbon" />
                </View>
                {item.rationale && (
                  <Txt variant="caption" tone="dim">
                    {item.rationale}
                  </Txt>
                )}
              </Card>
            ))}
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(180).duration(400)}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: '#B7E4C7', backgroundColor: '#EAFBF1' }}>
            <Ionicons name="logo-whatsapp" size={26} color="#149B63" />
            <View style={{ flex: 1 }}>
              <Txt variant="label" style={{ color: '#0F6B47' }}>
                {t.whatsappTitle}
              </Txt>
              <Txt variant="caption" style={{ color: '#0F6B47', opacity: 0.85 }}>
                {t.whatsappBody}
              </Txt>
            </View>
            <View style={styles.comingSoonPill}>
              <Txt variant="caption" style={{ color: '#0F6B47' }}>
                {t.comingSoon}
              </Txt>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).duration(400)}>
          <Card index={2} style={{ gap: 10 }}>
            <View style={styles.row}>
              <Ionicons name="school-outline" size={20} color={c.primary} />
              <Txt variant="h2" style={{ flex: 1 }}>
                {t.programsTitle}
              </Txt>
            </View>
            <Txt variant="body" tone="dim">
              {t.programsSubtitle}
            </Txt>
            <Button
              label={t.browsePrograms}
              variant="secondary"
              size="md"
              icon="arrow-forward"
              onPress={() => router.push('/main/programs')}
            />
          </Card>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  speakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#1F6FEB',
    borderWidth: 0,
  },
  speakBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locCardInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, flex: 1 },
  locBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  comingSoonPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#B7E4C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
