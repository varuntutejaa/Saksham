import { Redirect, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { LANGUAGES } from '@/constants/languages';
import { speak } from '@/lib/speech';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { BrandMark, Screen, Txt } from '@/ui';

export default function LanguageScreen() {
  const { ready, language, setLanguage } = useStore();
  const { ready: authReady, token } = useAuth();
  const { c, elevation } = useTheme();

  if (!ready || !authReady) return null;
  // already onboarded — this screen is only for first pick or "change language"
  if (language && token && !router.canGoBack()) return <Redirect href="/main" />;

  async function choose(code: (typeof LANGUAGES)[number]['code']) {
    await setLanguage(code);
    router.replace(token ? '/main' : '/auth');
  }

  return (
    <Screen variant="hero" edges={['top']}>
      <Animated.View entering={FadeIn.duration(450)} style={styles.hero}>
        {router.canGoBack() && (
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
        )}
        <View style={[styles.logoBadge, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
          <BrandMark size={30} />
        </View>
        <Txt variant="title" tone="onPrimary" center>
          Choose your language
        </Txt>
        <Txt variant="body" style={{ color: 'rgba(255,255,255,0.9)' }} center>
          अपनी भाषा चुनें
        </Txt>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(450).springify().damping(18)}
        style={[styles.sheet, { backgroundColor: c.bg, borderColor: c.border }, elevation('float')]}>
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {LANGUAGES.map((l, i) => (
            <Animated.View
              key={l.code}
              entering={FadeInDown.delay(100 + i * 40).duration(300)}
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
                    borderColor: pressed || language === l.code ? c.primary : c.border,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                  elevation('card'),
                ]}>
                <Txt variant="caption" tone="faint" numberOfLines={1}>
                  {l.english}
                </Txt>
                <Txt
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ fontSize: 24, fontWeight: '600', color: c.text }}>
                  {l.native}
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
  hero: { alignItems: 'center', paddingTop: 12, paddingBottom: 22, gap: 4 },
  backBtn: {
    position: 'absolute',
    left: 20,
    top: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    paddingTop: 22,
    paddingHorizontal: 18,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 40 },
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
