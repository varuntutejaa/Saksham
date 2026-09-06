import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  MessageCircle,
  Mic,
  Volume2,
  Wifi,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { SkillTryout } from "./skill-tryout";
import { ProgramList } from "./program-list";
import { HeroOrb } from "./hero-orb";

const LANGUAGES = [
  { native: "हिन्दी", english: "Hindi" },
  { native: "English", english: "English" },
  { native: "বাংলা", english: "Bengali" },
  { native: "தமிழ்", english: "Tamil" },
  { native: "తెలుగు", english: "Telugu" },
  { native: "मराठी", english: "Marathi" },
  { native: "ಕನ್ನಡ", english: "Kannada" },
  { native: "ગુજરાતી", english: "Gujarati" },
  { native: "ਪੰਜਾਬੀ", english: "Punjabi" },
  { native: "ଓଡ଼ିଆ", english: "Odia" },
];

const STEPS = [
  {
    title: "Speak",
    body: 'A beneficiary describes their traditional skill out loud, in their own language — "main mitti ke bartan banata hoon".',
  },
  {
    title: "Map to NSQF",
    body: "A transparent, editable keyword lexicon maps the informal phrase to a normalized skill, then to a real NSQF qualification.",
  },
  {
    title: "Recommend",
    body: "NSQF level and location are scored against real PM-AJAY programmes — qualification match, sector, district, state, seats, stipend.",
  },
  {
    title: "Explain & speak back",
    body: 'A templated "why this" rationale is generated in the beneficiary\'s language and read aloud with on-device text-to-speech.',
  },
];

const FEATURES = [
  {
    icon: Mic,
    title: "Voice-first, 10 Indian languages",
    body: "Every screen is natively translated — zero fallback to another language anywhere in the app.",
  },
  {
    icon: Sparkles,
    title: "Transparent skill mapping",
    body: "An editable keyword lexicon, not a black-box model — every confidence score is a simple, inspectable formula.",
  },
  {
    icon: ShieldCheck,
    title: "RAG for policy questions",
    body: '"Will I get a certificate?" is answered strictly from real government PDF passages — never a guess.',
  },
  {
    icon: Volume2,
    title: "Voice-reactive UI",
    body: "The mic button is a swirling clay-and-teal orb whose pulse reacts to actual speaking volume in real time.",
  },
  {
    icon: Wifi,
    title: "Works on low bandwidth",
    body: "Speech-to-text falls back gracefully, and the whole pipeline still runs offline with zero API keys.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp channel",
    body: "A Twilio webhook wired to the same real pipeline — text or voice notes, no app download needed.",
  },
];

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
      {children}
    </p>
  );
}

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Saksham",
  alternateName: "सक्षम",
  applicationCategory: "GovernmentApplication",
  operatingSystem: "Web, Android",
  description:
    "AI-driven voice assistant for livelihood mapping and NSQF-aligned skilling recommendations for SC communities under PM-AJAY, Ministry of Social Justice & Empowerment.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  inLanguage: ["hi", "en", "bn", "ta", "te", "mr", "kn", "gu", "pa", "or"],
  publisher: {
    "@type": "GovernmentOrganization",
    name: "Ministry of Social Justice & Empowerment",
  },
};

export default function Home() {
  return (
    <div className="bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <Image src="/icon.png" alt="Saksham" width={34} height={34} className="rounded-xl" />
            <div className="leading-tight">
              <p className="font-display text-sm font-semibold">सक्षम · Saksham</p>
              <p className="text-[11px] text-foreground-faint">Ministry of Social Justice &amp; Empowerment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/auth"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground-dim transition hover:border-brand/40 hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              href="/welcome"
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-[var(--shadow-soft)] transition hover:bg-brand-strong"
            >
              Try the app
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* Hero */}
        <section className="grid gap-10 pb-4 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-8 lg:pt-20">
          <div>
            <Eyebrow>PM-AJAY · Ministry of Social Justice &amp; Empowerment</Eyebrow>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              Say your skill.
              <br />
              <span className="italic text-brand">Get certified for it.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-foreground-dim">
              Beneficiaries describe a traditional skill out loud, in their own language. Saksham maps it to a real{" "}
              <strong className="font-semibold text-foreground">NSQF qualification</strong> and matches nearby{" "}
              <strong className="font-semibold text-foreground">PM-AJAY</strong> training — voice-first, low-bandwidth,
              spoken back in the same language.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/welcome"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-on-brand shadow-[var(--shadow-float)] transition hover:bg-brand-strong active:scale-[0.98]"
              >
                Try the voice assistant
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#skill-mapper"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3.5 text-base font-medium text-foreground-dim transition hover:border-brand/40 hover:text-foreground"
              >
                See it map a skill
              </a>
            </div>
            <dl className="mt-9 flex flex-wrap gap-x-8 gap-y-4 border-t border-border pt-6">
              {[
                ["1,283", "real NSQF qualifications"],
                ["2,366", "PM-AJAY-eligible courses"],
                ["10", "natively spoken languages"],
              ].map(([n, label]) => (
                <div key={label}>
                  <dt className="font-display text-2xl font-semibold text-brand">{n}</dt>
                  <dd className="text-sm text-foreground-dim">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <HeroOrb />
        </section>

        {/* WhatsApp strip */}
        <section className="my-14 flex flex-wrap items-center gap-3 rounded-2xl border border-accent/20 bg-accent/10 px-5 py-4">
          <MessageCircle className="h-6 w-6 shrink-0 text-accent" />
          <p className="flex-1 text-sm text-accent">
            <strong className="font-semibold">Saksham AI is now on WhatsApp</strong> — chat or send a voice note, no app
            download needed.
          </p>
          <span className="shrink-0 rounded-full border border-accent/30 px-3 py-1 text-xs font-medium text-accent">
            Coming soon
          </span>
        </section>

        {/* Languages marquee */}
        <section className="mb-20">
          <Eyebrow>Natively supported</Eyebrow>
          <h2 className="mt-1.5 font-display text-2xl font-semibold">Ten languages, zero fallback</h2>
          <p className="mt-1 max-w-xl text-sm text-foreground-dim">
            Every UI string, every screen — natively translated, not machine-translated placeholders.
          </p>
          <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <div className="flex w-max gap-3 [animation:marquee_32s_linear_infinite] hover:[animation-play-state:paused]">
              {[...LANGUAGES, ...LANGUAGES].map((l, i) => (
                <span
                  key={`${l.english}-${i}`}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm shadow-[var(--shadow-soft)]"
                >
                  <span className="font-semibold">{l.native}</span>
                  <span className="text-foreground-faint">· {l.english}</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mb-20">
          <Eyebrow>The pipeline</Eyebrow>
          <h2 className="mt-1.5 font-display text-2xl font-semibold">How skill becomes programme</h2>
          <div className="relative mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-0 right-0 top-5 hidden h-px bg-border lg:block" />
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative">
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-brand font-display text-sm font-semibold text-on-brand shadow-[var(--shadow-soft)]">
                  {i + 1}
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-foreground-dim">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature grid */}
        <section className="mb-20">
          <Eyebrow>What actually works</Eyebrow>
          <h2 className="mt-1.5 font-display text-2xl font-semibold">Not a demo — a real pipeline</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-soft)] ${i % 2 === 0 ? "rounded-tr-[28px]" : "rounded-bl-[28px]"}`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${i % 2 === 0 ? "bg-brand/10 text-brand" : "bg-accent/10 text-accent"}`}
                >
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-foreground-dim">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Screenshots */}
        <section className="mb-20">
          <Eyebrow>The mobile app</Eyebrow>
          <h2 className="mt-1.5 font-display text-2xl font-semibold">Screens from the field app</h2>
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {[
              ["01-welcome.png", "Welcome"],
              ["02-language.png", "10 languages"],
              ["03-home.png", "Home dashboard"],
              ["04-speak-orb.png", "Voice orb"],
              ["05-confirm.png", "Skill confirmation"],
              ["06-profile.png", "Profile"],
              ["08-programs.png", "PM-AJAY programmes"],
              ["07-website.png", "Public website"],
            ].map(([src, label]) => (
              <figure key={src} className="group">
                <div className="overflow-hidden rounded-[22px] border-[6px] border-surface bg-surface shadow-[var(--shadow-float)] ring-1 ring-border transition-transform duration-200 group-hover:-translate-y-1">
                  <Image src={`/screenshots/${src}`} alt={label} width={200} height={430} className="w-full" />
                </div>
                <figcaption className="mt-2 text-center text-xs text-foreground-dim">{label}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Try it */}
        <section id="skill-mapper" className="mb-20 scroll-mt-24">
          <Eyebrow>Try it live</Eyebrow>
          <h2 className="mt-1.5 font-display text-2xl font-semibold">Try the skill mapper</h2>
          <p className="mt-1 max-w-xl text-sm text-foreground-dim">
            Type an informal skill the way someone would say it — e.g. <em>&ldquo;main mitti ke bartan banata hoon&rdquo;</em>{" "}
            or <em>&ldquo;silai ka kaam karti hoon&rdquo;</em>.
          </p>
          <div className="mt-5">
            <SkillTryout />
          </div>
        </section>

        <section className="mb-20">
          <Eyebrow>Live catalogue</Eyebrow>
          <h2 className="mt-1.5 font-display text-2xl font-semibold">PM-AJAY training programmes</h2>
          <div className="mt-5">
            <ProgramList />
          </div>
        </section>

        {/* Data honesty */}
        <section className="mb-20 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
          <Eyebrow>Data provenance</Eyebrow>
          <h2 className="mt-1.5 font-display text-2xl font-semibold">Real government data, honestly labelled</h2>
          <p className="mt-2 max-w-2xl text-sm text-foreground-dim">
            Not everything is real — and this project says so, loudly, in the same places the data lives.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-success">
                <CheckCircle2 className="h-4 w-4" />
                Real, scraped, traceable
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-foreground-dim">
                <li>1,283 NSQF qualifications (nqr.gov.in)</li>
                <li>2,366 PM-AJAY-eligible courses (pmajay.dosje.gov.in)</li>
                <li>177 RAG passages from 2 real government PDFs</li>
              </ul>
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-warning">
                <AlertTriangle className="h-4 w-4" />
                Illustrative sample data
              </p>
              <p className="mt-2 text-sm text-foreground-dim">
                Specific seats / contact-number / batch-date fields on training programmes — no government source
                publishes that centrally.
              </p>
            </div>
          </div>
        </section>

        {/* Tech stack */}
        <section className="mb-20">
          <Eyebrow>Under the hood</Eyebrow>
          <h2 className="mt-1.5 font-display text-2xl font-semibold">Tech stack</h2>
          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            {[
              ["Backend", "Express · TypeScript · Prisma · PostgreSQL"],
              ["Speech", "Sarvam AI → Groq Whisper → offline mock"],
              ["RAG / LLM", "Groq gpt-oss-120b · Postgres full-text search"],
              ["Mobile app", "Expo SDK 57 · React Native · Reanimated"],
              ["Website", "Next.js 15 · React 19 · Tailwind v4"],
              ["Messaging", "Twilio WhatsApp webhook"],
            ].map(([label, value]) => (
              <span key={label} className="rounded-full border border-border bg-surface px-4 py-2 shadow-[var(--shadow-soft)]">
                <span className="font-semibold">{label}</span>
                <span className="text-foreground-dim"> · {value}</span>
              </span>
            ))}
          </div>
        </section>

        <footer className="mb-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-foreground-faint">
          <p>Prototype for demonstration. Programme data is representative sample data.</p>
          <p>Built for SC communities under PM-AJAY, Ministry of Social Justice &amp; Empowerment.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground-dim hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground-dim hover:underline">
              Terms of Service
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
