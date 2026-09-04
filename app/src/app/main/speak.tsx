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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { converse } from '@/lib/api';
import { LANGUAGES, UI_STRINGS } from '@/constants/languages';
import { setLastResult } from '@/lib/session';
import { speak, stopSpeaking } from '@/lib/speech';
import { transcribeWithSarvam } from '@/lib/transcription';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Button, MicOrb, Screen, Txt, type MicState } from '@/ui';

type AgentMessage = {
  role: 'user' | 'assistant';
  text: string;
};

export default function SpeakScreen() {
  const { language, state, district } = useStore();
  const { user } = useAuth();
  const { c, radius, elevation } = useTheme();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);
  const [busy, setBusy] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [agentMode, setAgentMode] = useState(false);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
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

  const micState: MicState = busy || transcribing ? 'thinking' : recState.isRecording ? 'listening' : 'idle';
  const status = busy
    ? agentMode ? t.agentThinking : t.thinking
    : transcribing
      ? t.transcribing
      : recState.isRecording
        ? t.listening
        : agentMode
          ? t.agentTapToTalk
          : t.tapToSpeak;

  async function submit(payload: { transcript?: string; audioUri?: string }) {
    setBusy(true);
    try {
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
      router.push('/confirm');
    } catch (e) {
      Alert.alert(t.tryAgain, String(e));
    } finally {
      setBusy(false);
    }
  }

  async function sendTranscript(text = transcript) {
    const clean = text.trim();
    if (!clean) {
      Alert.alert(t.noSpeechDetected);
      return;
    }
    if (agentMode) {
      await runAgentTurn(clean);
      return;
    }
    await submit({ transcript: clean });
  }

  async function runAgentTurn(text: string) {
    const clean = text.trim();
    if (!clean) return;

    setBusy(true);
    setTranscript('');
    setShowType(false);
    setTyped('');
    setAgentMessages((messages) => messages.concat({ role: 'user', text: clean }));
    try {
      const result = await converse({
        transcript: clean,
        language: language!,
        state,
        district,
        channel: 'APP',
        userId: user?.id,
      });
      setLastResult(result);
      const replyText = result.reply.text || t.agentFallbackReply;
      setAgentMessages((messages) => messages.concat({ role: 'assistant', text: replyText }));
      speak(replyText, language!);
    } catch (e) {
      Alert.alert(t.tryAgain, String(e));
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
        const result = await transcribeWithSarvam(audioUri, language!);
        if (agentMode) await runAgentTurn(result.transcript);
        else {
          setTranscript(result.transcript);
          setShowType(false);
        }
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
    setTranscript('');
    setShowType(false);
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
        <View style={styles.topBar}>
          <Txt variant="h2">{t.navSpeak}</Txt>
          <View style={styles.topActions}>
            <Pressable
              onPress={() => {
                stopSpeaking();
                setAgentMode((v) => !v);
                setTranscript('');
                setShowType(false);
              }}
              style={[
                styles.modeChip,
                {
                  backgroundColor: agentMode ? c.primary : c.surfaceAlt,
                  borderColor: agentMode ? c.primary : c.border,
                },
              ]}>
              <Ionicons name="sparkles" size={14} color={agentMode ? c.onPrimary : c.primary} />
              <Txt variant="caption" style={{ color: agentMode ? c.onPrimary : c.textDim }}>
                {t.voiceAgent}
              </Txt>
            </Pressable>
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
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.micWrap}>
            <MicOrb state={micState} onPress={toggleRecord} />
            <View key={status}>
              <Txt variant="title" center style={{ marginTop: 4 }}>
                {status}
              </Txt>
            </View>
            {micState === 'idle' && (
              <Txt variant="body" tone="dim" center style={{ maxWidth: 280 }}>
                {agentMode ? t.agentHint : t.tapHint}
              </Txt>
            )}
            {recState.isRecording && (
              <View style={[styles.recPill, { backgroundColor: c.dangerSoft }]}>
                <View style={[styles.recDot, { backgroundColor: c.danger }]} />
                <Txt variant="caption" style={{ color: c.danger }}>
                  {`${Math.round((recState.durationMillis ?? 0) / 1000)}s`}
                </Txt>
              </View>
            )}
          </Animated.View>

          {agentMode && agentMessages.length > 0 && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.agentThread}>
              {agentMessages.map((message, index) => (
                <View
                  key={`${message.role}-${index}`}
                  style={[
                    styles.agentBubble,
                    {
                      alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                      backgroundColor: message.role === 'user' ? c.surfaceAlt : c.primarySoft,
                      borderColor: message.role === 'user' ? c.border : c.primarySoft,
                    },
                  ]}>
                  <View style={styles.agentBubbleHeader}>
                    <Ionicons
                      name={message.role === 'user' ? 'person-circle-outline' : 'sparkles'}
                      size={15}
                      color={message.role === 'user' ? c.textDim : c.primary}
                    />
                    <Txt variant="overline" tone="faint">
                      {message.role === 'user' ? t.youSaid : t.agentName}
                    </Txt>
                  </View>
                  <Txt variant="body">{message.text}</Txt>
                </View>
              ))}
              <View style={styles.actionRow}>
                <Button
                  label={t.clearAgent}
                  variant="secondary"
                  size="md"
                  icon="trash-outline"
                  fullWidth={false}
                  onPress={() => {
                    stopSpeaking();
                    setAgentMessages([]);
                  }}
                />
                <Button
                  label={t.viewResults}
                  size="md"
                  icon="school-outline"
                  fullWidth={false}
                  onPress={() => router.push('/results')}
                />
              </View>
            </Animated.View>
          )}

          {transcript && !showType && (
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={[styles.transcriptBox, { backgroundColor: c.surface, borderColor: c.border }, elevation('card')]}>
              <View style={styles.transcriptHeader}>
                <Ionicons name="document-text-outline" size={18} color={c.primary} />
                <Txt variant="overline" tone="faint" style={{ flex: 1 }}>
                  {t.transcriptTitle}
                </Txt>
              </View>
              <Txt variant="bodyLg">{transcript}</Txt>
              <View style={styles.actionRow}>
                <Button
                  label={t.editTranscript}
                  variant="secondary"
                  size="md"
                  icon="create-outline"
                  fullWidth={false}
                  onPress={() => {
                    setTyped(transcript);
                    setShowType(true);
                  }}
                />
                <Button
                  label={t.send}
                  size="md"
                  icon="send"
                  fullWidth={false}
                  loading={busy}
                  onPress={() => sendTranscript()}
                />
              </View>
            </Animated.View>
          )}

          {micState === 'idle' && !showType && !transcript && (
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
                onPress={() => sendTranscript(typed)}
                loading={busy}
                disabled={!typed.trim()}
              />
            </Animated.View>
          )}
        </ScrollView>

        <View style={styles.bottom}>
          <Button
            label={showType ? (agentMode ? t.agentTapToTalk : t.tapToSpeak) : t.typeInstead}
            variant="secondary"
            size="md"
            icon={showType ? 'mic-outline' : 'create-outline'}
            onPress={() => {
              if (!showType && transcript) setTyped(transcript);
              setShowType((v) => !v);
            }}
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
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
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
  transcriptBox: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 12 },
  transcriptHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' },
  agentThread: { gap: 10 },
  agentBubble: { maxWidth: '92%', borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  agentBubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
