import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { converse, checkHealth } from '@/lib/api';
import { UI_STRINGS, LANGUAGES } from '@/constants/languages';
import { setLastResult } from '@/lib/session';
import { speak } from '@/lib/speech';
import { useStore } from '@/lib/store';
import { BigButton, Subtitle, useColors } from '@/components/ui';

export default function HomeScreen() {
  const { language, state, district, reset } = useStore();
  const c = useColors();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState('');
  const [showType, setShowType] = useState(false);

  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;
  const langLabel = LANGUAGES.find((l) => l.code === language)?.native ?? '';

  useEffect(() => {
    if (language) speak(t.tapToSpeak, language);
  }, [language]);

  if (!language) return <Redirect href="/" />;

  async function submit(payload: { transcript?: string; audioUri?: string }) {
    setBusy(true);
    try {
      if (!(await checkHealth())) {
        Alert.alert(t.noConnection);
        speak(t.noConnection, language!);
        return;
      }
      const result = await converse({
        ...payload,
        language: language!,
        state,
        district,
      });
      setLastResult(result);
      router.push('/results');
    } catch (e) {
      Alert.alert(t.tryAgain, String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecord() {
    if (recState.isRecording) {
      await recorder.stop();
      await submit({ audioUri: recorder.uri ?? undefined });
      return;
    }
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      Alert.alert('Microphone permission required');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Text style={styles.brand}>सक्षम</Text>
          <Pressable onPress={reset} accessibilityLabel="Change language" hitSlop={12}>
            <Text style={[styles.langSwitch, { color: c.textSecondary }]}>{langLabel} ▾</Text>
          </Pressable>
        </View>

        <View style={styles.center}>
          <Subtitle>
            {busy ? t.thinking : recState.isRecording ? t.listening : t.tapToSpeak}
          </Subtitle>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.tapToSpeak}
            onPress={toggleRecord}
            disabled={busy}
            style={({ pressed }) => [
              styles.mic,
              {
                backgroundColor: recState.isRecording ? '#E5484D' : '#208AEF',
                transform: [{ scale: pressed ? 0.96 : recState.isRecording ? 1.06 : 1 }],
              },
            ]}>
            <Text style={styles.micIcon}>{recState.isRecording ? '■' : '🎤'}</Text>
          </Pressable>

          {recState.isRecording && (
            <Text style={[styles.hint, { color: c.textSecondary }]}>
              {Math.round((recState.durationMillis ?? 0) / 1000)}s — {t.speakAgain}
            </Text>
          )}
        </View>

        <View style={styles.bottom}>
          {showType ? (
            <View style={styles.typeRow}>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                placeholder={t.tapToSpeak}
                placeholderTextColor={c.textSecondary}
                style={[styles.input, { color: c.text, backgroundColor: c.backgroundElement }]}
                multiline
              />
              <BigButton
                label="OK"
                onPress={() => typed.trim() && submit({ transcript: typed.trim() })}
                loading={busy}
              />
            </View>
          ) : (
            <BigButton label={t.typeInstead} variant="secondary" onPress={() => setShowType(true)} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  brand: { fontSize: 20, fontWeight: '700', color: '#208AEF' },
  langSwitch: { fontSize: 16, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 24 },
  mic: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#208AEF',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  micIcon: { fontSize: 64 },
  hint: { fontSize: 16 },
  bottom: { padding: 24, gap: 12 },
  typeRow: { gap: 12 },
  input: { minHeight: 56, borderRadius: 14, padding: 16, fontSize: 18 },
});
