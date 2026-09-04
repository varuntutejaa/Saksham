import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LANGUAGES } from '@/constants/languages';
import { speak } from '@/lib/speech';
import { useStore } from '@/lib/store';
import { Subtitle, Title, useColors } from '@/components/ui';

export default function LanguageScreen() {
  const { ready, language, setLanguage } = useStore();
  const c = useColors();

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
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>सक्षम · Saksham</Text>
        <Title>अपनी भाषा चुनें</Title>
        <Subtitle>Choose your language</Subtitle>
      </View>
      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {LANGUAGES.map((l) => (
          <Pressable
            key={l.code}
            accessibilityRole="button"
            accessibilityLabel={`${l.english}, ${l.native}`}
            onPressIn={() => speak(l.native, l.code)}
            onPress={() => choose(l.code)}
            style={({ pressed }) => [
              styles.langCard,
              { backgroundColor: c.backgroundElement, opacity: pressed ? 0.8 : 1 },
            ]}>
            <Text style={[styles.langNative, { color: c.text }]}>{l.native}</Text>
            <Text style={[styles.langEnglish, { color: c.textSecondary }]}>{l.english}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, gap: 6 },
  brand: { fontSize: 16, fontWeight: '600', color: '#208AEF', textAlign: 'center', marginBottom: 8 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  langCard: {
    width: '47%',
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
  },
  langNative: { fontSize: 24, fontWeight: '700' },
  langEnglish: { fontSize: 14 },
});
