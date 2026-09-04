import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { checkHealth, converse } from '@/lib/api';
import { LANGUAGES, UI_STRINGS } from '@/constants/languages';
import { setLastResult } from '@/lib/session';
import { speak } from '@/lib/speech';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Button, MicOrb, Screen, Txt, type MicState } from '@/ui';

export default function SpeakScreen() {
  const { language, state, district } = useStore();
  const { user } = useAuth();
  const { c, radius, elevation } = useTheme();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState('');
  const [showType, setShowType] = useState(false);
  const spoke = useRef(false);

  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;
  const langNative = LANGUAGES.find((l) => l.code === language)?.native ?? '';

  useEffect(() => {
    if (language && !spoke.current) {
      spoke.current = true;
      const timer = setTimeout(() => speak(t.tapHint, language), 400);
      return () => clearTimeout(timer);
    }
  }, [language]);

  if (!language) return null;

  const micState: MicState = busy ? 'thinking' : recState.isRecording ? 'listening' : 'idle';
  const status = busy ? t.thinking : recState.isRecording ? t.listening : t.tapToSpeak;

  async function submit(payload: { transcript?: string; audioUri?: string }) {
    setBusy(true);
    try {
      if (!(await checkHealth())) {
        speak(t.noConnection, language!);
        Alert.alert(t.noConnection);
        return;
      }
      const result = await converse({
        ...payload,
        language: language!,
        state,
        district,
        channel: 'APP',
        userId: user?.id,
      });
      setLastResult(result);
      setShowType(false);
      setTyped('');
      router.push('/results');
    } catch (e) {
      Alert.alert(t.tryAgain, String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecord() {
    if (busy) return;
    if (recState.isRecording) {
      await recorder.stop();
      await submit({ audioUri: recorder.uri ?? undefined });
      return;
    }
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      Alert.alert('Microphone permission needed', undefined);
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  function changeLanguage() {
    router.push('/language');
  }

  return (
    <Screen edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* top bar */}
        <View style={styles.topBar}>
          <Txt variant="h2">{t.navSpeak}</Txt>
          <Pressable
            onPress={changeLanguage}
            style={[styles.langChip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Ionicons name="language" size={14} color={c.textDim} />
            <Txt variant="caption" tone="dim">
              {langNative}
            </Txt>
            <Ionicons name="chevron-down" size={13} color={c.textDim} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* mic */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.micWrap}>
            <MicOrb state={micState} onPress={toggleRecord} />
            <Animated.View entering={FadeInUp.duration(300)} key={status}>
              <Txt variant="title" center style={{ marginTop: 4 }}>
                {status}
              </Txt>
            </Animated.View>
            {micState === 'idle' && (
              <Txt variant="body" tone="dim" center style={{ maxWidth: 280 }}>
                {t.tapHint}
              </Txt>
            )}
            {recState.isRecording && (
              <View style={[styles.recPill, { backgroundColor: c.dangerSoft }]}>
                <View style={[styles.recDot, { backgroundColor: c.danger }]} />
                <Txt variant="caption" style={{ color: c.danger }}>
                  {Math.round((recState.durationMillis ?? 0) / 1000)}s
                </Txt>
              </View>
            )}
          </Animated.View>

          {/* examples */}
          {micState === 'idle' && !showType && (
            <Animated.View
              entering={FadeInDown.delay(150).duration(400)}
              style={[styles.examples, { backgroundColor: c.surface, borderColor: c.border }, elevation('card')]}>
              <Txt variant="overline" tone="faint" style={{ marginBottom: 4 }}>
                {t.examplesTitle}
              </Txt>
              {t.examples.map((ex) => (
                <Pressable
                  key={ex}
                  onPress={() => submit({ transcript: ex })}
                  style={({ pressed }) => [
                    styles.exampleRow,
                    { borderColor: c.border, backgroundColor: pressed ? c.surfaceAlt : 'transparent' },
                  ]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={c.primary} />
                  <Txt variant="body" style={{ flex: 1 }}>
                    {ex}
                  </Txt>
                  <Ionicons name="arrow-forward" size={15} color={c.textFaint} />
                </Pressable>
              ))}
            </Animated.View>
          )}

          {/* type mode */}
          {showType && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.typeBox}>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                placeholder={t.typePlaceholder}
                placeholderTextColor={c.textFaint}
                multiline
                autoFocus
                style={[
                  styles.input,
                  { color: c.text, backgroundColor: c.surface, borderColor: c.border, borderRadius: radius.md },
                ]}
              />
              <Button
                label={t.send}
                icon="send"
                onPress={() => typed.trim() && submit({ transcript: typed.trim() })}
                loading={busy}
                disabled={!typed.trim()}
              />
            </Animated.View>
          )}
        </ScrollView>

        {/* bottom action */}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 24 },
  micWrap: { alignItems: 'center', gap: 10 },
  recPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 2,
  },
  recDot: { width: 8, height: 8, borderRadius: 4 },
  examples: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 6 },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeBox: { gap: 12 },
  input: { minHeight: 64, borderWidth: 1, padding: 14, fontSize: 16, lineHeight: 22 },
  bottom: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
});
