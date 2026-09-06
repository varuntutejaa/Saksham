"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Home, Mic, GraduationCap, User } from "lucide-react";
import { useSiteStore } from "@/lib/site-store";
import { useBeneficiaryAuth } from "@/lib/beneficiary-auth";
import { UI_STRINGS } from "@/lib/languages";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready: storeReady, language } = useSiteStore();
  const { ready: authReady, user } = useBeneficiaryAuth();

  useEffect(() => {
    if (storeReady && !language) router.replace("/welcome");
  }, [storeReady, language, router]);

  if (!storeReady || !authReady || !language) return null;
  const t = UI_STRINGS[language];

  const tabs = [
    { href: "/app", label: t.navHome, icon: Home },
    { href: "/app/speak", label: t.navSpeak, icon: Mic },
    { href: "/app/programs", label: t.navPrograms, icon: GraduationCap },
    { href: "/app/profile", label: t.navProfile, icon: User },
  ];

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Sidebar (desktop) — same nav as the mobile tab bar, website-shaped */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
        <Link href="/" className="flex items-center gap-2.5 px-2">
          <Image src="/icon.png" alt="Saksham" width={32} height={32} className="rounded-lg" />
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold">सक्षम · Saksham</p>
            <p className="text-[11px] text-foreground-faint">{user?.name?.trim() || t.guestLabel}</p>
          </div>
        </Link>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {tabs.map((tb) => {
            const active = pathname === tb.href;
            const Icon = tb.icon;
            return (
              <Link
                key={tb.href}
                href={tb.href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-brand text-on-brand shadow-[var(--shadow-soft)]" : "text-foreground-dim hover:bg-surface-alt"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tb.label}
              </Link>
            );
          })}
        </nav>

        <Link href="/" className="text-xs text-foreground-faint hover:text-foreground-dim">
          ← Back to saksham.in
        </Link>
      </aside>

      {/* Content */}
      <div className="min-h-screen flex-1 pb-[68px] lg:pb-0">
        <div className="mx-auto max-w-3xl lg:px-10 lg:py-10">{children}</div>
      </div>

      {/* Bottom tab bar (mobile only) */}
      <nav className="fixed bottom-0 left-0 flex h-[60px] w-full items-center justify-around border-t border-border bg-surface lg:hidden">
        {tabs.map((tb) => {
          const active = pathname === tb.href;
          const Icon = tb.icon;
          return (
            <Link key={tb.href} href={tb.href} className="flex flex-col items-center gap-0.5 px-2">
              <Icon className={`h-5 w-5 ${active ? "text-brand" : "text-foreground-faint"}`} />
              <span className={`text-[11px] font-medium ${active ? "text-brand" : "text-foreground-faint"}`}>{tb.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
