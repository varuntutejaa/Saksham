import { router } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { BrandMark, Button, Screen, Txt } from '@/ui';

export default function WelcomeScreen() {
  const { ready: storeReady, language } = useStore();
  const { ready: authReady, token } = useAuth();
  const { c, radius } = useTheme();
  const ready = storeReady && authReady;

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
    // returning, fully-onboarded user — skip straight to the assistant
    if (language && token) router.replace('/main');
  }, [ready, language, token]);

  if (!ready) return null;

  return (
    <Screen>
      <View style={styles.wrap}>
        <Animated.View entering={FadeIn.duration(600)} style={styles.brand}>
          <View style={[styles.logoRing, { backgroundColor: c.primarySoft }]}>
            <View style={[styles.logoBadge, { backgroundColor: c.primary }]}>
              <BrandMark size={40} color="#fff" barColor={c.primary} />
            </View>
          </View>
          <Txt variant="display" center style={{ marginTop: 22 }}>
            Saksham
          </Txt>
          <Txt variant="label" tone="primary" center style={{ marginTop: 2 }}>
            सक्षम
          </Txt>
          <Txt variant="bodyLg" tone="dim" center style={{ marginTop: 14, maxWidth: 300 }}>
            Speak your skill, find PM-AJAY training
          </Txt>
          <Txt variant="body" tone="faint" center style={{ marginTop: 4 }}>
            अपनी भाषा में अपना हुनर बताइए और सरकारी प्रशिक्षण पाइए
          </Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).duration(450)} style={styles.bottom}>
          <Button label="Get Started · शुरू करें" icon="arrow-forward" onPress={() => router.push('/language')} />
          <Txt variant="caption" tone="faint" center style={{ marginTop: 18 }}>
            Ministry of Social Justice & Empowerment · PM-AJAY
          </Txt>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingVertical: 32 },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoRing: { width: 128, height: 128, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  logoBadge: {
    width: 92,
    height: 92,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { gap: 8 },
});
