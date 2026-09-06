"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, KeyRound, Info } from "lucide-react";
import { forgotPassword } from "@/lib/site-api";
import { useBeneficiaryAuth } from "@/lib/beneficiary-auth";
import { useSiteStore } from "@/lib/site-store";
import { UI_STRINGS } from "@/lib/languages";
import { Button, Card, Screen } from "@/components/ui";

type Step = "phone" | "reset";

function ForgotPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { language } = useSiteStore();
  const { token, resetPassword } = useBeneficiaryAuth();
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState(params.get("phone") ?? "");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!language) router.replace("/language");
    else if (token) router.replace("/app");
  }, [language, token, router]);

  if (!language || token) return null;

  async function sendCode() {
    setError(null);
    if (phone.trim().length < 6) {
      setError(t.authError);
      return;
    }
    setBusy(true);
    try {
      const res = await forgotPassword(phone.trim());
      setDevOtp(res.devOtp ?? null);
      setStep("reset");
    } catch (e) {
      setError(e instanceof Error ? e.message : t.authError);
    } finally {
      setBusy(false);
    }
  }

  async function submitReset() {
    setError(null);
    if (otp.trim().length !== 6) {
      setError(t.invalidOtp);
      return;
    }
    if (newPassword.length < 8) {
      setError(language === "hi" ? "पासवर्ड कम से कम 8 अक्षर का होना चाहिए" : "Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }
    setBusy(true);
    try {
      await resetPassword(phone.trim(), otp.trim(), newPassword);
      router.replace("/app");
    } catch (e) {
      setError(e instanceof Error ? e.message : t.authError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <div className="px-5 pt-4">
        <button
          onClick={() => (step === "reset" ? setStep("phone") : router.back())}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-surface-alt"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center px-6 pt-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-brand/10">
          <KeyRound className="h-7 w-7 text-brand" />
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold">
          {t.forgotPasswordTitle}
        </h1>
        <p className="mt-2 text-center text-foreground-dim">
          {step === "phone" ? t.forgotPasswordBody : t.otpSentNotice}
        </p>

        <div className="mt-6 flex w-full flex-col gap-3">
          {step === "phone" ? (
            <>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.phonePlaceholder}
                autoFocus
                className="h-[54px] rounded-2xl border border-border bg-surface px-4 text-base outline-none focus:border-brand"
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button
                label={t.sendOtp}
                onPress={sendCode}
                loading={busy}
                variant="accent"
                className="mt-1"
              />
            </>
          ) : (
            <>
              {devOtp && (
                <Card className="flex items-center gap-2.5">
                  <Info className="h-5 w-5 shrink-0 text-warning" />
                  <p className="text-sm">
                    {t.devOtpNotice.replace("{otp}", devOtp)}
                  </p>
                </Card>
              )}
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder={t.otpPlaceholder}
                inputMode="numeric"
                maxLength={6}
                autoFocus
                className="h-[54px] rounded-2xl border border-border bg-surface px-4 text-base outline-none focus:border-brand"
              />
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t.newPasswordPlaceholder}
                type="password"
                className="h-[54px] rounded-2xl border border-border bg-surface px-4 text-base outline-none focus:border-brand"
              />
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.confirmPasswordPlaceholder}
                type="password"
                onKeyDown={(e) => e.key === "Enter" && submitReset()}
                className="h-[54px] rounded-2xl border border-border bg-surface px-4 text-base outline-none focus:border-brand"
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button
                label={t.resetPasswordBtn}
                onPress={submitReset}
                loading={busy}
                variant="accent"
                className="mt-1"
              />
              <Button
                label={t.sendOtp}
                onPress={sendCode}
                loading={busy}
                variant="ghost"
                size="md"
              />
            </>
          )}
        </div>
      </div>
    </Screen>
  );
}

export default function ForgotPasswordScreen() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordInner />
    </Suspense>
  );
}
