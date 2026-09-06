"use client";

import { useRouter } from "next/navigation";
import { useBeneficiaryAuth } from "@/lib/beneficiary-auth";
import { useSiteStore } from "@/lib/site-store";
import { LANGUAGES, type LanguageCode } from "@/lib/languages";
import { speak } from "@/lib/speech";

export default function LanguageScreen() {
  const router = useRouter();
  const { ready, setLanguage } = useSiteStore();
  const { ready: authReady, token } = useBeneficiaryAuth();

  if (!ready || !authReady) return null;

  function choose(code: LanguageCode) {
    setLanguage(code);
    router.replace(token ? "/app" : "/auth");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-gradient-to-b from-accent via-accent-strong to-[#06231d]">
      <div className="flex flex-col items-center gap-1 px-6 pb-6 pt-10">
        <h1 className="text-center text-2xl font-bold text-white">
          Choose your language
        </h1>
        <p className="text-center text-white/90">अपनी भाषा चुनें</p>
      </div>

      <div className="flex-1 rounded-t-[30px] border border-border bg-background p-5 pt-6">
        <div className="grid grid-cols-2 gap-3 pb-10">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onMouseEnter={() => speak(l.native, l.code)}
              onClick={() => choose(l.code)}
              className="flex min-h-[92px] flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] border-border bg-surface px-2 py-4 transition hover:border-brand"
            >
              <span className="text-xs text-foreground-faint">{l.english}</span>
              <span className="text-xl font-semibold">{l.native}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
