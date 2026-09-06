"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useBeneficiaryAuth } from "@/lib/beneficiary-auth";
import { useSiteStore } from "@/lib/site-store";
import { UI_STRINGS } from "@/lib/languages";
import { useSlowRequestNotice } from "@/lib/use-slow-request-notice";
import { BrandMark, Button, Screen } from "@/components/ui";

type Tab = "login" | "signup";

export default function AuthScreen() {
  const router = useRouter();
  const { language } = useSiteStore();
  const { token, user, login, register } = useBeneficiaryAuth();
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;

  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slow = useSlowRequestNotice(busy);

  useEffect(() => {
    if (!language) router.replace("/language");
  }, [language, router]);

  useEffect(() => {
    if (token) router.replace(user?.onboarded ? "/app" : "/onboarding");
  }, [token, user, router]);

  if (!language || token) return null;

  function switchTab(next: Tab) {
    setTab(next);
    setError(null);
  }

  async function submit() {
    setError(null);
    if (phone.trim().length < 6) {
      setError(language === "hi" ? "मोबाइल नंबर बहुत छोटा है" : "That phone number looks too short");
      return;
    }
    // New accounts are held to a stronger minimum than the backend enforces
    // (4 chars) — existing accounts with a shorter password can still log in.
    const minLength = tab === "signup" ? 8 : 4;
    if (password.length < minLength) {
      setError(
        language === "hi"
          ? `पासवर्ड कम से कम ${minLength} अक्षर का होना चाहिए`
          : `Password must be at least ${minLength} characters`,
      );
      return;
    }
    setBusy(true);
    try {
      if (tab === "login") {
        await login(phone.trim(), password);
      } else {
        await register({
          phone: phone.trim(),
          password,
          name: name.trim() || undefined,
          language: language!,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t.authError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <div className="flex items-center justify-between px-5 pt-4">
        <Link
          href="/language"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-surface-alt"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Link href="/app" className="text-sm font-semibold text-brand">
          {t.continueGuest}
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center px-6 pt-5">
        <BrandMark size={64} />
        <h1 className="mt-3 text-2xl font-bold">{t.welcomeTitle}</h1>

        <div className="relative mt-6 flex w-full rounded-2xl bg-surface-alt p-1">
          <div
            className="absolute inset-y-1 w-[calc(50%-4px)] rounded-xl bg-surface shadow transition-transform duration-300 ease-out"
            style={{ transform: tab === "login" ? "translateX(0%)" : "translateX(calc(100% + 8px))" }}
          />
          {(["login", "signup"] as Tab[]).map((tb) => (
            <button
              key={tb}
              onClick={() => switchTab(tb)}
              className={`relative z-10 flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors duration-200 ${
                tab === tb ? "text-brand" : "text-foreground-dim"
              }`}
            >
              {tb === "login" ? t.loginTab : t.signupTab}
            </button>
          ))}
        </div>

        <div className="mt-6 flex w-full flex-col gap-3">
          <div
            className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${
              tab === "signup" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="min-h-0">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePlaceholder}
                className="h-[54px] w-full rounded-2xl border border-border bg-surface px-4 text-base outline-none focus:border-brand"
              />
            </div>
          </div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t.phonePlaceholder}
            inputMode="tel"
            className="h-[54px] rounded-2xl border border-border bg-surface px-4 text-base outline-none transition-colors focus:border-brand"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.passwordPlaceholder}
            type="password"
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="h-[54px] rounded-2xl border border-border bg-surface px-4 text-base outline-none transition-colors focus:border-brand"
          />

          {error && <p className="animate-[fade-in_0.15s_ease-out] text-sm text-danger">{error}</p>}
          {tab === "signup" && !error && !slow && (
            <p className="text-xs text-foreground-faint">{language === "hi" ? "पासवर्ड कम से कम 8 अक्षर का हो" : "At least 8 characters"}</p>
          )}
          {slow && (
            <p className="animate-[fade-in_0.15s_ease-out] text-xs text-foreground-faint">
              {language === "hi"
                ? "सर्वर अभी शुरू हो रहा है, इसमें 30 सेकंड तक लग सकते हैं…"
                : "The server is waking up — this can take up to 30 seconds…"}
            </p>
          )}

          <Button
            label={tab === "login" ? t.loginBtn : t.signupBtn}
            onPress={submit}
            loading={busy}
            variant="accent"
            className="mt-1"
          />

          {tab === "login" && (
            <Link
              href={`/forgot-password?phone=${encodeURIComponent(phone)}`}
              className="mt-1 self-center text-sm font-medium text-brand"
            >
              {t.forgotPassword}
            </Link>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Screen>
  );
}
