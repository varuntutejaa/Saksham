import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { extractProfileAnswer, type ProfileField } from '@/lib/api';
import { UI_STRINGS } from '@/constants/languages';
import { useAuth } from '@/lib/auth';
import { speak, stopSpeaking } from '@/lib/speech';
import { transcribeWithSarvam } from '@/lib/transcription';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Button, MicOrb, Screen, StepProgress, Txt, type MicState } from '@/ui';

type ProfileMessage = { role: 'user' | 'assistant'; text: string };

export default function VoiceProfileStep() {
  const { language } = useStore();
  const { updateProfile } = useAuth();
  const { c, radius, elevation } = useTheme();
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recState = useAudioRecorderState(recorder, 100);
  const micLevel = recState.isRecording
    ? Math.min(1, Math.max(0, ((recState.metering ?? -50) + 50) / 50))
    : 0;

  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;
  const effectiveLanguage = language ?? 'hi';

  const STEPS: { field: ProfileField; question: string }[] = [
    { field: 'gender', question: t.genderQuestion },
    { field: 'age', question: t.ageQuestion },
    { field: 'education', question: t.eduQuestion },
  ];

  const genderLabel: Record<string, string> = { male: t.genderMale, female: t.genderFemale, other: t.genderOther };
  const eduLabel: Record<string, string> = {
    below_10th: t.eduBelow10th,
    '10th': t.edu10th,
    '12th': t.edu12th,
    iti_diploma: t.eduIti,
    undergrad: t.eduUndergrad,
    postgrad: t.eduPostgrad,
  };

  const [stepIndex, setStepIndex] = useState(0);
  const [messages, setMessages] = useState<ProfileMessage[]>([]);
  const [collected, setCollected] = useState<Record<string, string | number>>({});
  const [typed, setTyped] = useState('');
  const [showType, setShowType] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const askedStepRef = useRef(-1);

  const currentStep = STEPS[stepIndex];

  useEffect(() => {
    if (askedStepRef.current === stepIndex) return;
    askedStepRef.current = stepIndex;
    setMessages((m) => m.concat({ role: 'assistant', text: currentStep.question }));
    const timer = setTimeout(() => speak(currentStep.question, effectiveLanguage), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  function labelFor(field: ProfileField, value: string | number): string {
    if (field === 'age') return `${value} ${t.yearsSuffix}`;
    if (field === 'gender') return genderLabel[value as string] ?? String(value);
    return eduLabel[value as string] ?? String(value);
  }

  async function submitAnswer(rawText: string) {
    const clean = rawText.trim();
    if (!clean) return;
    setBusy(true);
    setTyped('');
    setShowType(false);
    setMessages((m) => m.concat({ role: 'user', text: clean }));
    try {
      const { value } = await extractProfileAnswer(currentStep.field, clean, effectiveLanguage);
      if (value === null) {
        setMessages((m) => m.concat({ role: 'assistant', text: t.profileAnswerUnclear }));
        speak(t.profileAnswerUnclear, effectiveLanguage);
        return;
      }

      const label = labelFor(currentStep.field, value);
      setMessages((m) => m.concat({ role: 'assistant', text: label }));
      speak(label, effectiveLanguage);

      const nextCollected = { ...collected, [currentStep.field]: value };
      setCollected(nextCollected);

      if (stepIndex < STEPS.length - 1) {
        setTimeout(() => setStepIndex((i) => i + 1), 700);
      } else {
        await updateProfile({ ...nextCollected, onboarded: true } as Parameters<typeof updateProfile>[0]);
        setTimeout(() => router.replace('/onboarding/done'), 700);
      }
    } catch (e) {
      Alert.alert(t.tryAgain, e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecord() {
    if (busy || transcribing) return;
    if (recState.isRecording) {
      await recorder.stop();
      const audioUri = recorder.uri;
      if (!audioUri) {
        Alert.alert(t.noSpeechDetected);
        return;
      }
      setTranscribing(true);
      try {
        const result = await transcribeWithSarvam(audioUri, effectiveLanguage);
        await submitAnswer(result.transcript);
      } catch (e) {
        Alert.alert(t.transcriptionError, e instanceof Error ? e.message : String(e));
      } finally {
        setTranscribing(false);
      }
      return;
    }
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      Alert.alert('Microphone permission needed', undefined);
      return;
    }
    stopSpeaking();
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  const micState: MicState = busy || transcribing ? 'thinking' : recState.isRecording ? 'listening' : 'idle';
  const status = busy
    ? t.agentThinking
    : transcribing
      ? t.transcribing
      : recState.isRecording
        ? t.listening
        : t.voiceProfileIntro;

  return (
    <Screen edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={[styles.iconBtn, { backgroundColor: c.surfaceAlt }]}>
            <Ionicons name="arrow-back" size={20} color={c.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <StepProgress step={stepIndex + 1} total={STEPS.length} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.thread}>
            {messages.map((m, i) => (
              <Animated.View
                key={i}
                entering={FadeInDown.duration(250)}
                style={[
                  styles.bubble,
                  {
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    backgroundColor: m.role === 'user' ? c.surfaceAlt : c.primarySoft,
                    borderColor: m.role === 'user' ? c.border : c.primarySoft,
                  },
                ]}>
                <Txt variant="body">{m.text}</Txt>
              </Animated.View>
            ))}
          </View>

          <View style={styles.micWrap}>
            <MicOrb state={micState} onPress={toggleRecord} level={micLevel} size={120} />
            <Txt variant="title" center style={{ marginTop: 8 }}>
              {status}
            </Txt>
          </View>

          {showType && (
            <Animated.View entering={FadeInDown.duration(250)} style={styles.typeBox}>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                placeholder={t.typePlaceholder}
                placeholderTextColor={c.textFaint}
                autoFocus
                style={[
                  styles.input,
                  { color: c.text, backgroundColor: c.surface, borderColor: c.border, borderRadius: radius.md },
                ]}
              />
              <Button
                label={t.send}
                icon="send"
                onPress={() => submitAnswer(typed)}
                loading={busy}
                disabled={!typed.trim()}
              />
            </Animated.View>
          )}
        </ScrollView>

        <View style={styles.bottom}>
          <Button
            label={showType ? t.tapToSpeak : t.typeInstead}
            variant="secondary"
            size="md"
            icon={showType ? 'mic-outline' : 'create-outline'}
            onPress={() => setShowType((v) => !v)}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 24, gap: 20 },
  thread: { gap: 10 },
  bubble: { maxWidth: '88%', borderRadius: 16, borderWidth: 1, padding: 12 },
  micWrap: { alignItems: 'center', paddingTop: 8 },
  typeBox: { gap: 12 },
  input: { height: 54, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  bottom: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
});
