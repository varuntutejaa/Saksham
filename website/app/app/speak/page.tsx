"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Sparkles,
  Languages,
  ChevronDown,
  FileText,
  Pencil,
  Send,
  Trash2,
  GraduationCap,
  MessageCircle,
  User,
  ChevronRight,
  ArrowRight,
  Keyboard,
} from "lucide-react";
import { understandSkill, type ConverseResponse } from "@/lib/site-api";
import { LANGUAGES, UI_STRINGS, type LanguageCode } from "@/lib/languages";
import {
  loadHistory,
  saveConversation,
  type ConversationRecord,
} from "@/lib/conversation-history";
import { setLastResult } from "@/lib/session-state";
import { speak, stopSpeaking } from "@/lib/speech";
import { useSlowRequestNotice } from "@/lib/use-slow-request-notice";
import { useBeneficiaryAuth } from "@/lib/beneficiary-auth";
import { useSiteStore } from "@/lib/site-store";
import { useVoiceRecorder } from "@/lib/use-voice-recorder";
import { MicOrb, type MicState } from "@/components/MicOrb";
import { Button } from "@/components/ui";

type AgentMessage = { role: "user" | "assistant"; text: string };

export default function SpeakScreen() {
  const router = useRouter();
  const { language, state, district } = useSiteStore();
  const { user } = useBeneficiaryAuth();
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [agentMode, setAgentMode] = useState(false);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [typed, setTyped] = useState("");
  const [showType, setShowType] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ConversationRecord[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const slow = useSlowRequestNotice(busy);
  const spoke = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const recorder = useVoiceRecorder(language ?? "hi");

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  function ensureSessionId(): string {
    if (!sessionIdRef.current)
      sessionIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return sessionIdRef.current;
  }

  function openHistoryItem(record: ConversationRecord) {
    stopSpeaking();
    setAgentMode(true);
    setAgentMessages(record.messages);
    sessionIdRef.current = record.id;
    setHistoryOpen(false);
    setTranscript("");
    setShowType(false);
  }

  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;
  const langNative = LANGUAGES.find((l) => l.code === language)?.native ?? "";

  useEffect(() => {
    if (language && !spoke.current) {
      spoke.current = true;
      const timer = setTimeout(() => speak(t.tapHint, language), 400);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  if (!language) return null;

  const micState: MicState = busy
    ? "thinking"
    : recorder.isRecording
      ? "listening"
      : "idle";
  const status = busy
    ? agentMode
      ? t.agentThinking
      : t.thinking
    : recorder.isRecording
      ? t.listening
      : agentMode
        ? t.agentTapToTalk
        : t.tapToSpeak;

  async function submit(payload: { transcript: string }) {
    setBusy(true);
    try {
      const result = await understandSkill({
        ...payload,
        language: language!,
        state,
        district,
        userId: user?.id,
        history: agentMessages,
      });
      setLastResult(result);
      setShowType(false);
      setTyped("");
      if (payload.transcript) {
        const updated = saveConversation(
          `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          [
            { role: "user", text: payload.transcript },
            { role: "assistant", text: result.reply.text },
          ],
        );
        setHistory(updated);
      }
      router.push("/app/confirm");
    } catch (e) {
      setMicError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  async function sendTranscript(text = transcript) {
    const clean = text.trim();
    if (!clean) {
      setMicError(t.noSpeechDetected);
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
    setTranscript("");
    setShowType(false);
    setTyped("");
    setMicError(null);
    const withUser = agentMessages.concat({
      role: "user" as const,
      text: clean,
    });
    setAgentMessages(withUser);
    try {
      const result: ConverseResponse = await understandSkill({
        transcript: clean,
        language: language!,
        state,
        district,
        userId: user?.id,
        history: agentMessages,
      });
      setLastResult(result);
      const replyText = result.reply.text || t.agentFallbackReply;
      const withReply = withUser.concat({
        role: "assistant" as const,
        text: replyText,
      });
      setAgentMessages(withReply);
      speak(replyText, language!);
      const updated = saveConversation(ensureSessionId(), withReply);
      setHistory(updated);
    } catch (e) {
      setMicError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  function toggleRecord() {
    setMicError(null);
    if (recorder.isRecording) {
      recorder.stop();
      return;
    }
    stopSpeaking();
    setTranscript("");
    setShowType(false);
    recorder.start(
      (result) => {
        if (agentMode) runAgentTurn(result);
        else {
          setTranscript(result);
          setShowType(false);
        }
      },
      (err) => setMicError(err),
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between gap-2.5 px-5 pb-2 pt-1">
        <h1 className="text-xl font-bold">{t.navSpeak}</h1>
        <div className="flex flex-shrink items-center gap-2">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            aria-label={t.historyTitle}
            className={`flex h-8 w-8 items-center justify-center rounded-full border ${
              historyOpen
                ? "border-brand bg-brand text-white"
                : "border-border bg-surface-alt text-foreground-dim"
            }`}
          >
            <Clock className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              stopSpeaking();
              setAgentMode((v) => !v);
              setTranscript("");
              setShowType(false);
            }}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium ${
              agentMode
                ? "border-brand bg-brand text-white"
                : "border-border bg-surface-alt text-brand"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t.voiceAgent}
          </button>
          <button
            onClick={() => router.push("/language")}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface-alt px-3 py-2 text-xs text-foreground-dim"
          >
            <Languages className="h-3.5 w-3.5" />
            {langNative}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 px-5 py-4">
        {historyOpen && (
          <div className="rounded-2xl border border-border bg-surface p-3.5">
            <p className="mb-1.5 text-xs uppercase tracking-wide text-foreground-faint">
              {t.historyTitle}
            </p>
            {history.length === 0 ? (
              <p className="text-sm text-foreground-dim">{t.noHistoryYet}</p>
            ) : (
              history.slice(0, 3).map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => openHistoryItem(rec)}
                  className="flex w-full items-center gap-2.5 border-t border-border py-2.5 text-left first:border-t-0"
                >
                  <MessageCircle className="h-4 w-4 shrink-0 text-brand" />
                  <span className="flex-1 truncate text-sm">{rec.title}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-foreground-faint" />
                </button>
              ))
            )}
          </div>
        )}

        <div className="flex flex-col items-center gap-2.5">
          <MicOrb
            state={micState}
            onPress={toggleRecord}
            level={recorder.level}
          />
          <p className="mt-1 text-center text-lg font-semibold">{status}</p>
          {slow && busy && (
            <p className="max-w-[280px] text-center text-xs text-foreground-faint">
              {language === "hi"
                ? "सर्वर अभी शुरू हो रहा है, इसमें 30 सेकंड तक लग सकते हैं…"
                : "The server is waking up — this can take up to 30 seconds…"}
            </p>
          )}
          {micState === "idle" && (
            <p className="max-w-[280px] text-center text-sm text-foreground-dim">
              {agentMode ? t.agentHint : t.tapHint}
            </p>
          )}
          {!recorder.supported && micState === "idle" && (
            <p className="max-w-[280px] text-center text-xs text-foreground-faint">
              Voice recognition isn&apos;t supported in this browser — use
              &quot;{t.typeInstead}&quot; below.
            </p>
          )}
          {micError && (
            <p className="text-center text-sm text-danger">{micError}</p>
          )}
        </div>

        {agentMode && agentMessages.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {agentMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[92%] rounded-2xl border p-3.5 ${
                  message.role === "user"
                    ? "self-end rounded-tr-sm border-border bg-surface-alt"
                    : "self-start rounded-tl-sm border-brand/15 bg-brand/10"
                }`}
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  {message.role === "user" ? (
                    <User className="h-3.5 w-3.5 text-foreground-faint" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-brand" />
                  )}
                  <span className="text-[11px] uppercase tracking-wide text-foreground-faint">
                    {message.role === "user" ? t.youSaid : t.agentName}
                  </span>
                </div>
                <p className="text-sm">{message.text}</p>
              </div>
            ))}
            <div className="flex justify-end gap-2.5">
              <Button
                label={t.clearAgent}
                variant="secondary"
                size="md"
                fullWidth={false}
                icon={<Trash2 className="h-4 w-4" />}
                onPress={() => {
                  stopSpeaking();
                  setAgentMessages([]);
                  sessionIdRef.current = null;
                }}
              />
              <Button
                label={t.viewResults}
                size="md"
                fullWidth={false}
                icon={<GraduationCap className="h-4 w-4" />}
                onPress={() => router.push("/app/results")}
              />
            </div>
          </div>
        )}

        {transcript.length > 0 && !showType && (
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-[18px] w-[18px] text-brand" />
              <span className="flex-1 text-xs uppercase tracking-wide text-foreground-faint">
                {t.transcriptTitle}
              </span>
            </div>
            <p className="text-lg">{transcript}</p>
            <div className="flex justify-end gap-2.5">
              <Button
                label={t.editTranscript}
                variant="secondary"
                size="md"
                fullWidth={false}
                icon={<Pencil className="h-4 w-4" />}
                onPress={() => {
                  setTyped(transcript);
                  setShowType(true);
                }}
              />
              <Button
                label={t.send}
                size="md"
                fullWidth={false}
                icon={<Send className="h-4 w-4" />}
                loading={busy}
                onPress={() => sendTranscript()}
              />
            </div>
          </div>
        )}

        {micState === "idle" && !showType && !transcript && (
          <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-surface p-3.5">
            <p className="mb-1 text-xs uppercase tracking-wide text-foreground-faint">
              {t.examplesTitle}
            </p>
            {t.examples.map((ex) => (
              <button
                key={ex}
                onClick={() => submit({ transcript: ex })}
                className="flex items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-3 text-left hover:bg-surface-alt"
              >
                <MessageCircle className="h-4 w-4 shrink-0 text-brand" />
                <span className="flex-1 text-sm">{ex}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-foreground-faint" />
              </button>
            ))}
          </div>
        )}

        {showType && (
          <div className="flex flex-col gap-3">
            <textarea
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={t.typePlaceholder}
              autoFocus
              rows={3}
              className="rounded-2xl border border-border bg-surface p-3.5 text-base outline-none focus:border-brand"
            />
            <Button
              label={t.send}
              icon={<Send className="h-4 w-4" />}
              onPress={() => sendTranscript(typed)}
              loading={busy}
              disabled={!typed.trim()}
            />
          </div>
        )}
      </div>

      <div className="px-5 pb-3 pt-1">
        <Button
          label={
            showType
              ? agentMode
                ? t.agentTapToTalk
                : t.tapToSpeak
              : t.typeInstead
          }
          variant="secondary"
          size="md"
          icon={showType ? undefined : <Keyboard className="h-4 w-4" />}
          onPress={() => {
            if (!showType && transcript) setTyped(transcript);
            setShowType((v) => !v);
          }}
        />
      </div>
    </div>
  );
}
