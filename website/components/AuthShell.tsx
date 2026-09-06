import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * Split-screen layout for the auth-family pages (welcome, auth,
 * forgot-password, onboarding): a branded panel on wide screens instead of
 * a phone-width column floating in empty space, single-column on mobile.
 * Rendered by the shared `Screen` component in components/ui.tsx — pages
 * keep using <Screen> and get this for free.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-accent via-accent-strong to-[#06231d] p-12 text-on-accent lg:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/icon.png" alt="Saksham" width={36} height={36} className="rounded-xl" />
          <span className="font-display text-lg font-semibold">सक्षम · Saksham</span>
        </Link>

        <div className="max-w-sm">
          <p className="font-display text-3xl font-semibold leading-tight">
            Speak your skill. <span className="italic">Get certified for it.</span>
          </p>
          <p className="mt-4 text-on-accent/80">
            A real NSQF qualification and matching PM-AJAY training, in the language you already speak.
          </p>
        </div>

        <p className="text-sm text-on-accent/60">Ministry of Social Justice &amp; Empowerment · PM-AJAY</p>

        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-black/10" />
      </div>

      {children}
    </div>
  );
}
