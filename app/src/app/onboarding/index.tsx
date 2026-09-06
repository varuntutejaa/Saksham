import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { UI_STRINGS } from '@/constants/languages';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Button, Screen, Txt } from '@/ui';

export default function OnboardingIntro() {
  const { language } = useStore();
  const { c } = useTheme();
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;

  function start() {
    router.push('/onboarding/voice-profile');
  }

  return (
    <Screen>
      <View style={styles.wrap}>
        <View style={styles.center}>
          <Animated.View entering={ZoomIn.duration(500).springify().damping(12)}>
            <View style={[styles.badge, { backgroundColor: c.primarySoft }]}>
              <Ionicons name="hand-right" size={46} color={c.primary} />
            </View>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(150).duration(450)}>
            <Txt variant="title" center style={{ marginTop: 24 }}>
              {t.onboardIntroTitle}
            </Txt>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(250).duration(450)}>
            <Txt variant="body" tone="dim" center style={{ marginTop: 10, maxWidth: 300 }}>
              {t.onboardIntroBody}
            </Txt>
          </Animated.View>
        </View>

        <Animated.View entering={FadeIn.delay(400).duration(400)} style={styles.bottom}>
          <Button label={t.onboardStart} icon="arrow-forward" variant="green" onPress={start} />
          <Button label={t.onboardSkip} variant="ghost" size="md" onPress={() => router.replace('/main/speak')} />
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingVertical: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  bottom: { gap: 4 },
});
