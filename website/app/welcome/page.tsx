"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBeneficiaryAuth } from "@/lib/beneficiary-auth";
import { useSiteStore } from "@/lib/site-store";
import { BrandMark, Button, Screen } from "@/components/ui";

export default function WelcomeScreen() {
  const router = useRouter();
  const { ready: storeReady, language } = useSiteStore();
  const { ready: authReady, token } = useBeneficiaryAuth();
  const ready = storeReady && authReady;

  useEffect(() => {
    if (!ready) return;
    if (language && token) router.replace("/app");
  }, [ready, language, token, router]);

  if (!ready) return null;

  return (
    <Screen>
      <div className="flex flex-1 flex-col justify-between px-7 py-8">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <BrandMark size={140} />
          <h1 className="mt-5 text-4xl font-bold">Saksham</h1>
          <p className="mt-1 text-lg font-semibold text-brand">सक्षम</p>
          <p className="mt-3 max-w-xs text-lg text-foreground-dim">
            Speak your skill, find PM-AJAY training
          </p>
          <p className="mt-1 max-w-xs text-sm text-foreground-faint">
            अपनी भाषा में अपना हुनर बताइए और सरकारी प्रशिक्षण पाइए
          </p>
        </div>
        <div>
          <Button
            label="Get Started · शुरू करें"
            href="/language"
            variant="accent"
          />
          <p className="mt-4 text-center text-xs text-foreground-faint">
            Ministry of Social Justice &amp; Empowerment · PM-AJAY
          </p>
        </div>
      </div>
    </Screen>
  );
}
