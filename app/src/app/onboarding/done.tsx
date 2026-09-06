import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { UI_STRINGS } from '@/constants/languages';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Button, Screen, Txt } from '@/ui';

export default function OnboardingDone() {
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const { language } = useStore();
  const { c } = useTheme();
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;
  const nextRoute = params.returnTo === '/confirm' ? '/confirm' : '/main/speak';

  const ring = useSharedValue(0);
  const check = useSharedValue(0);

  useEffect(() => {
    ring.value = withSpring(1, { damping: 9, stiffness: 90 });
    check.value = withDelay(200, withSequence(withSpring(1.2, { damping: 8 }), withSpring(1, { damping: 10 })));
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring.value }],
    opacity: ring.value,
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: check.value }],
    opacity: check.value,
  }));

  return (
    <Screen>
      <View style={styles.wrap}>
        <View style={styles.center}>
          <Animated.View style={[styles.ring, { backgroundColor: c.successSoft }, ringStyle]}>
            <Animated.View style={checkStyle}>
              <Ionicons name="checkmark-circle" size={72} color={c.success} />
            </Animated.View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(350).duration(450)}>
            <Txt variant="title" center style={{ marginTop: 28 }}>
              {t.onboardDoneTitle}
            </Txt>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(450).duration(450)}>
            <Txt variant="body" tone="dim" center style={{ marginTop: 10, maxWidth: 280 }}>
              {t.onboardDoneBody}
            </Txt>
          </Animated.View>
        </View>

        <Animated.View entering={FadeIn.delay(600).duration(400)}>
          <Button label={t.onboardContinue} icon="arrow-forward" variant="green" onPress={() => router.replace(nextRoute)} />
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingVertical: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
});
