import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { UI_STRINGS } from '@/constants/languages';
import { getAnswers, setAnswer } from '@/lib/onboarding';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { OptionRow, Screen, StepProgress, Txt } from '@/ui';

// range label -> representative age sent to the backend
const RANGES: { label: string; value: number }[] = [
  { label: '18–25', value: 21 },
  { label: '26–35', value: 30 },
  { label: '36–45', value: 40 },
  { label: '46–60', value: 52 },
  { label: '60+', value: 65 },
];

export default function AgeStep() {
  const { language } = useStore();
  const { c } = useTheme();
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;
  const [selected, setSelected] = useState<number | undefined>(getAnswers().age);

  function choose(value: number) {
    setSelected(value);
    setAnswer('age', value);
    setTimeout(() => router.push('/onboarding/education'), 260);
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
          <StepProgress step={2} total={3} />
        </View>
      </View>

      <View style={styles.body}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Txt variant="overline" tone="primary">
            {t.stepLabel.replace('{n}', '2')}
          </Txt>
          <Txt variant="title" style={{ marginTop: 6, marginBottom: 26 }}>
            {t.ageQuestion}
          </Txt>
        </Animated.View>

        <View style={{ gap: 12 }}>
          {RANGES.map((r, i) => (
            <OptionRow
              key={r.value}
              label={`${r.label} ${t.yearsSuffix}`}
              selected={selected === r.value}
              onPress={() => choose(r.value)}
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
