import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { Education } from '@/lib/api';
import { UI_STRINGS } from '@/constants/languages';
import { useAuth } from '@/lib/auth';
import { getAnswers, setAnswer } from '@/lib/onboarding';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { OptionRow, Screen, StepProgress, Txt } from '@/ui';

export default function EducationStep() {
  const { language } = useStore();
  const { updateProfile } = useAuth();
  const { c } = useTheme();
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;
  const [selected, setSelected] = useState<Education | undefined>(getAnswers().education);
  const [saving, setSaving] = useState(false);

  const options: { value: Education; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'below_10th', label: t.eduBelow10th, icon: 'book-outline' },
    { value: '10th', label: t.edu10th, icon: 'book' },
    { value: '12th', label: t.edu12th, icon: 'library' },
    { value: 'iti_diploma', label: t.eduIti, icon: 'construct' },
    { value: 'undergrad', label: t.eduUndergrad, icon: 'school' },
    { value: 'postgrad', label: t.eduPostgrad, icon: 'ribbon' },
  ];

  async function choose(value: Education) {
    if (saving) return;
    setSelected(value);
    setAnswer('education', value);
    setSaving(true);
    const answers = getAnswers();
    try {
      await updateProfile({ ...answers, education: value, onboarded: true });
      router.replace('/onboarding/done');
    } catch (e) {
      setSaving(false);
      Alert.alert(t.tryAgain, e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.iconBtn, { backgroundColor: c.surfaceAlt }]}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <StepProgress step={3} total={3} />
        </View>
      </View>

      <View style={styles.body}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Txt variant="overline" tone="primary">
            {t.stepLabel.replace('{n}', '3')}
          </Txt>
          <Txt variant="title" style={{ marginTop: 6, marginBottom: 26 }}>
            {t.eduQuestion}
          </Txt>
        </Animated.View>

        <View style={{ gap: 12 }}>
          {options.map((o, i) => (
            <OptionRow
              key={o.value}
              label={o.label}
              icon={o.icon}
              selected={selected === o.value}
              onPress={() => choose(o.value)}
              index={i}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 18 },
});
