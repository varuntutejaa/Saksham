import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { Gender } from '@/lib/api';
import { UI_STRINGS } from '@/constants/languages';
import { getAnswers, setAnswer } from '@/lib/onboarding';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { OptionRow, Screen, StepProgress, Txt } from '@/ui';

export default function GenderStep() {
  const { language } = useStore();
  const { c } = useTheme();
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;
  const [selected, setSelected] = useState<Gender | undefined>(getAnswers().gender);

  const options: { value: Gender; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'male', label: t.genderMale, icon: 'male' },
    { value: 'female', label: t.genderFemale, icon: 'female' },
    { value: 'other', label: t.genderOther, icon: 'person' },
  ];

  function choose(value: Gender) {
    setSelected(value);
    setAnswer('gender', value);
    setTimeout(() => router.push('/onboarding/age'), 260);
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
          <StepProgress step={1} total={3} />
        </View>
      </View>

      <View style={styles.body}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Txt variant="overline" tone="primary">
            {t.stepLabel.replace('{n}', '1')}
          </Txt>
          <Txt variant="title" style={{ marginTop: 6, marginBottom: 26 }}>
            {t.genderQuestion}
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
