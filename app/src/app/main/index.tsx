import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { UI_STRINGS } from '@/constants/languages';
import { getPmajayCourses } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { resolveDeviceLocation } from '@/lib/location';
import { getLastResult } from '@/lib/session';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { BrandMark, Button, Card, Chip, Screen, Txt } from '@/ui';

const SPEAK_GRADIENT = ['#8B5CF6', '#5B3FE0'] as const;
// Colour-rotate recommendation cards so the list reads as lively, not a wall
// of identical white boxes — a Duolingo/Cred touch, not semantically meaningful.
const CARD_TINTS = ['violet', 'accent', 'info'] as const;

/** The mic on the Speak card, breathing with expanding rings — signals "this
 *  is listening-ready" at a glance instead of sitting there as a dead icon. */
function PulsingMic() {
  const pulse = useSharedValue(0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.ease) }), -1, false);
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const ringOne = useAnimatedStyle(() => ({
    opacity: 0.45 - pulse.value * 0.45,
    transform: [{ scale: 1 + pulse.value * 0.75 }],
  }));
  const ringTwo = useAnimatedStyle(() => {
    const offset = (pulse.value + 0.5) % 1;
    return { opacity: 0.35 - offset * 0.35, transform: [{ scale: 1 + offset * 0.75 }] };
  });
  const core = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breathe.value * 0.06 }] }));

  return (
    <View style={styles.micWrap}>
      <Animated.View style={[styles.micRing, ringOne]} />
      <Animated.View style={[styles.micRing, ringTwo]} />
      <Animated.View style={[styles.speakBtn, { backgroundColor: 'rgba(255,255,255,0.96)' }, core]}>
        <Ionicons name="mic" size={26} color="#5B3FE0" />
      </Animated.View>
    </View>
  );
}

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

function greetingIcon(hour: number): keyof typeof Ionicons.glyphMap {
  if (hour < 12) return 'sunny';
  if (hour < 17) return 'partly-sunny';
  return 'moon';
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
  const greetIcon = greetingIcon(hour);
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
          <View style={styles.headerText}>
            <View style={styles.greetRow}>
              <Ionicons name={greetIcon} size={13} color={c.accentDark} />
              <Txt variant="overline" tone="faint" numberOfLines={1}>
                {greeting}
              </Txt>
            </View>
            <Txt variant="title" numberOfLines={1} style={{ marginTop: 3 }}>
              {name}
            </Txt>
            <Txt variant="body" tone="dim" numberOfLines={2} style={{ marginTop: 6 }}>
              {t.homeSubtitle}
            </Txt>
          </View>
          <View style={[styles.avatar, { backgroundColor: c.primarySoft, borderColor: c.surface }]}>
            <BrandMark size={32} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Pressable
            onPress={() => router.push('/main/speak')}
            accessibilityRole="button"
            style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
            <LinearGradient
              colors={SPEAK_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.speakCard}>
              <View pointerEvents="none" style={styles.speakBlob} />
              <View style={{ flex: 1, gap: 4 }}>
                <Txt variant="h2" style={{ color: '#fff' }}>
                  {t.speakCta}
                </Txt>
                <Txt variant="body" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {t.speakCtaHint}
                </Txt>
              </View>
              <PulsingMic />
            </LinearGradient>
          </Pressable>
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
              <Card key={item.id} index={i} tint={CARD_TINTS[i % CARD_TINTS.length]} style={{ gap: 8 }}>
                <Txt variant="overline" tone="faint">
                  {item.code}
                </Txt>
                <Txt variant="label">{item.title}</Txt>
                <View style={styles.chipRow}>
                  <Chip label={item.sector} />
                  {item.nsqfLevel != null && <Chip label={`NSQF ${item.nsqfLevel}`} icon="layers" tone="primary" />}
                  <Chip label={item.courseLevel} icon="ribbon" tone="sun" />
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
          <Card tint="success" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="logo-whatsapp" size={26} color={c.successDark} />
            <View style={{ flex: 1 }}>
              <Txt variant="label" style={{ color: c.successDark }}>
                {t.whatsappTitle}
              </Txt>
              <Txt variant="caption" style={{ color: c.successDark, opacity: 0.85 }}>
                {t.whatsappBody}
              </Txt>
            </View>
            <View style={[styles.comingSoonPill, { borderColor: c.success }]}>
              <Txt variant="caption" style={{ color: c.successDark }}>
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
  // Avatar pins to the top of the text block so it lines up with the greeting
  // line, not the vertical middle of a three-line column.
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  headerText: { flex: 1, minWidth: 0 },
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  micWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  micRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  speakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 24,
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#5B3FE0',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  speakBlob: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -50,
    right: -30,
    backgroundColor: 'rgba(255,255,255,0.12)',
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
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
