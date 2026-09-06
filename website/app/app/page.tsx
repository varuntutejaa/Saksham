"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mic,
  MapPin,
  Navigation,
  Loader2,
  GraduationCap,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import { useBeneficiaryAuth } from "@/lib/beneficiary-auth";
import { useSiteStore } from "@/lib/site-store";
import { resolveDeviceLocation } from "@/lib/location";
import { UI_STRINGS } from "@/lib/languages";
import { BrandMark, Card, Chip } from "@/components/ui";

function greetingKey(
  hour: number,
): "goodMorning" | "goodAfternoon" | "goodEvening" {
  if (hour < 12) return "goodMorning";
  if (hour < 17) return "goodAfternoon";
  return "goodEvening";
}

export default function DashboardScreen() {
  const { language, state, district, setLocation } = useSiteStore();
  const { user } = useBeneficiaryAuth();
  const [hour, setHour] = useState(new Date().getHours());
  const [locating, setLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!language) return null;
  const t = UI_STRINGS[language];
  const greeting = t[greetingKey(hour)];
  const name = user?.name?.trim() || t.guestLabel;

  async function enableLocation() {
    setLocating(true);
    setLocationDenied(false);
    const loc = await resolveDeviceLocation();
    setLocating(false);
    if (loc) setLocation(loc.state, loc.district);
    else setLocationDenied(true);
  }

  return (
    <div className="flex flex-col gap-4 p-5 pb-8">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-faint">
            {greeting}
          </p>
          <p className="mt-0.5 font-display text-xl font-semibold">{name}</p>
        </div>
        <div className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-brand/10">
          <BrandMark size={30} />
        </div>
      </div>

      <p className="text-foreground-dim">{t.homeSubtitle}</p>

      <Link
        href="/app/speak"
        className="group relative flex items-center gap-3.5 overflow-hidden rounded-2xl rounded-tr-[32px] bg-gradient-to-br from-brand to-brand-strong p-4 text-on-brand shadow-[var(--shadow-float)] transition active:scale-[0.99]"
      >
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="flex-1">
          <p className="font-display text-lg font-semibold">{t.speakCta}</p>
          <p className="text-sm opacity-85">{t.speakCtaHint}</p>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface transition-transform group-active:scale-95">
          <Mic className="h-6 w-6 text-brand" />
        </div>
      </Link>

      {state || district ? (
        <button
          onClick={enableLocation}
          className="flex items-center gap-2 self-start"
        >
          {district && (
            <Chip
              label={district}
              tone="primary"
              icon={<MapPin className="h-3 w-3" />}
            />
          )}
          {state && <Chip label={state} />}
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin text-brand" />
          ) : (
            <span className="text-xs text-foreground-faint">
              {t.changeLocation}
            </span>
          )}
        </button>
      ) : (
        <Card className="flex items-center gap-3">
          <MapPin className="h-5 w-5 shrink-0 text-brand" />
          <div className="flex-1">
            <p className="text-sm font-semibold">{t.enableLocation}</p>
            <p className="text-xs text-foreground-dim">
              {locationDenied ? t.locationDenied : t.enableLocationHint}
            </p>
          </div>
          {locating ? (
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
          ) : (
            <button
              onClick={enableLocation}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10"
            >
              <Navigation className="h-4 w-4 text-brand" />
            </button>
          )}
        </Card>
      )}

      <Card className="flex items-center gap-3 border-accent/20 bg-accent/10">
        <MessageCircle className="h-6 w-6 shrink-0 text-accent" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-accent">{t.whatsappTitle}</p>
          <p className="text-xs text-accent/80">{t.whatsappBody}</p>
        </div>
        <span className="shrink-0 rounded-full border border-accent/30 px-2.5 py-1 text-[11px] font-medium text-accent">
          {t.comingSoon}
        </span>
      </Card>

      <Card className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-brand" />
          <p className="flex-1 text-lg font-bold">{t.programsTitle}</p>
        </div>
        <p className="text-sm text-foreground-dim">{t.programsSubtitle}</p>
        <Link
          href="/app/programs"
          className="mt-1 flex h-11 items-center justify-center gap-2 rounded-2xl bg-surface-alt text-sm font-semibold hover:bg-surface-alt"
        >
          {t.browsePrograms}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>
    </div>
  );
}
