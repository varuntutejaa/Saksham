import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Saksham collects, uses, and protects beneficiary data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-foreground-dim hover:text-brand">
        <ArrowLeft className="h-4 w-4" />
        Back to Saksham
      </Link>

      <h1 className="font-display text-3xl font-semibold">Privacy Policy</h1>
      <p className="mt-1 text-sm text-foreground-faint">Last updated: September 2026</p>

      <div className="mt-6 rounded-2xl border border-warning/25 bg-warning-soft p-4 text-sm text-warning">
        This is a good-faith draft written to accurately describe what this prototype actually does with data. It is
        <strong> not a substitute for review by a qualified legal advisor</strong> before this is used with real
        beneficiaries, particularly given the sensitive category of users (SC-community members under PM-AJAY) and
        obligations under India&apos;s Digital Personal Data Protection Act, 2023.
      </div>

      <div className="prose-content mt-8 space-y-8 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="font-display text-lg font-semibold">1. Who this covers</h2>
          <p className="mt-2 text-foreground-dim">
            This policy covers the Saksham website (saksham-website-five.vercel.app) and the beneficiary app
            experience it provides. Saksham is a voice-first assistant that maps a beneficiary&apos;s described skill
            to a formal NSQF qualification and PM-AJAY training programme, built for the Ministry of Social Justice
            &amp; Empowerment&apos;s PM-AJAY scheme.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">2. What we collect</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground-dim">
            <li><strong className="text-foreground">Account details</strong> — phone number, name, and a password (stored as a one-way hash, never in plain text, by the backend).</li>
            <li><strong className="text-foreground">Onboarding answers</strong> — gender, age range, and education level, if you choose to provide them.</li>
            <li><strong className="text-foreground">Profile photo</strong> — if you upload one, resized and stored as part of your profile.</li>
            <li><strong className="text-foreground">Voice/text transcripts</strong> — what you type or say when describing your skill, used to find a matching qualification and programme.</li>
            <li><strong className="text-foreground">Location</strong> — your state/district, either typed or (with your explicit browser permission) derived from your device&apos;s GPS, used only to rank nearby training programmes.</li>
            <li><strong className="text-foreground">Language preference</strong> — which of the 10 supported languages you use.</li>
            <li><strong className="text-foreground">Session metadata</strong> — timestamps, detected skills, and recommendation outcomes, used for the programme&apos;s own monitoring dashboard.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">3. Who else sees your data</h2>
          <p className="mt-2 text-foreground-dim">
            We use a small number of external services to make Saksham work. Each only receives what it strictly
            needs to do its job:
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground-dim">
            <li><strong className="text-foreground">Google (Gemini API)</strong> — receives your typed/spoken skill description (translated to English) to match it against the real NSQF qualification catalog and to translate the reply back into your language. Google&apos;s processing of this text is governed by their own API terms; we do not send your name, phone, or photo to Google.</li>
            <li><strong className="text-foreground">ElevenLabs</strong> — not currently active for any language, but the integration exists for future use; if enabled, only the reply text (not your original transcript) would be sent to generate speech.</li>
            <li><strong className="text-foreground">BigDataCloud</strong> — if you enable location, your device&apos;s GPS coordinates are sent to their free reverse-geocoding API to resolve a state/district name. No account or persistent identifier is sent alongside it.</li>
            <li><strong className="text-foreground">Vercel</strong> — hosts this website and processes standard web request logs (IP address, browser type) for operating the service.</li>
            <li><strong className="text-foreground">The Saksham backend</strong> (a separate government-facing service) — stores your account, sessions, and recommendation history, and is what powers the admin analytics dashboard used by programme administrators.</li>
          </ul>
          <p className="mt-2 text-foreground-dim">We do not sell any data to anyone, for any reason.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">4. Why we collect it</h2>
          <p className="mt-2 text-foreground-dim">
            Every field above exists to do one of three things: (a) match your described skill to a real, formal
            qualification, (b) find and rank training programmes actually near you, or (c) let programme
            administrators understand how well the assistant is serving beneficiaries in aggregate. We do not use
            your data for advertising, and there is no third-party analytics or ad tracking on this site.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">5. How long we keep it</h2>
          <p className="mt-2 text-foreground-dim">
            Account and session data is retained by the backend for as long as your account exists, to preserve your
            conversation history and recommendation status. Your device also stores some preferences locally
            (language, a resumable conversation history, and your login session) — clearing your browser&apos;s
            site data removes these immediately.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">6. Your choices</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground-dim">
            <li>You can use the assistant as a guest, without creating an account — onboarding, phone number, and profile photo are all optional.</li>
            <li>You can decline location access; programme ranking will simply not be personalised by distance.</li>
            <li>You can change your language at any time from the Profile screen.</li>
            <li>To request deletion of your account and associated data, see our <Link href="/terms#deletion" className="text-brand hover:underline">data deletion process</Link>.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">7. Contact</h2>
          <p className="mt-2 text-foreground-dim">
            This is a prototype built for demonstration under the PM-AJAY scheme. For a production deployment,
            replace this section with a real grievance-officer contact as required under the DPDP Act, 2023.
          </p>
        </section>
      </div>
    </main>
  );
}
