import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { LANGUAGES, UI_STRINGS } from '@/constants/languages';
import { speak } from '@/lib/speech';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { BrandMark, Screen, Txt } from '@/ui';

export default function LanguageScreen() {
  const { ready, language, setLanguage } = useStore();
  const { c, radius, elevation } = useTheme();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;
  if (language) return <Redirect href="/home" />;

  async function choose(code: (typeof LANGUAGES)[number]['code']) {
    await setLanguage(code);
    router.replace('/home');
  }

  return (
    <Screen variant="hero" edges={['top']}>
      <Animated.View entering={FadeIn.duration(500)} style={styles.hero}>
        <View style={[styles.logoBadge, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
          <BrandMark size={34} color="#fff" barColor="#2E8BFF" />
        </View>
        <Txt variant="display" tone="onPrimary" center>
          सक्षम
        </Txt>
        <Txt variant="label" style={{ color: 'rgba(255,255,255,0.85)' }} center>
          SAKSHAM · PM-AJAY
        </Txt>
        <Txt variant="body" style={{ color: 'rgba(255,255,255,0.9)', marginTop: 6 }} center>
          अपनी भाषा चुनें · Choose your language
        </Txt>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(450).springify().damping(18)}
        style={[
          styles.sheet,
          { backgroundColor: c.bg, borderColor: c.border },
          elevation('float'),
        ]}>
        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}>
          {LANGUAGES.map((l, i) => (
            <Animated.View
              key={l.code}
              entering={FadeInDown.delay(120 + i * 45).duration(320)}
              style={styles.cell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${l.english}, ${l.native}`}
                onPressIn={() => speak(l.native, l.code)}
                onPress={() => choose(l.code)}
                style={({ pressed }) => [
                  styles.langCard,
                  {
                    backgroundColor: c.surface,
                    borderColor: pressed ? c.primary : c.border,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                  elevation('card'),
                ]}>
                <Txt
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ fontSize: 25, fontWeight: '800', color: c.text }}>
                  {l.native}
                </Txt>
                <Txt variant="caption" tone="faint" numberOfLines={1}>
                  {l.english}
                </Txt>
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 24, paddingBottom: 28, gap: 4 },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    paddingTop: 22,
    paddingHorizontal: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 40,
  },
  cell: { flexBasis: '47%', flexGrow: 1, minWidth: 0 },
  langCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 3,
  },
});
