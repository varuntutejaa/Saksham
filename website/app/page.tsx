import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { SkillTryout } from "./skill-tryout";
import { ProgramList } from "./program-list";

const APP_URL = "https://saksham-website-five.vercel.app/";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-brand">सक्षम · Saksham</p>
          <p className="text-xs text-neutral-500">Ministry of Social Justice &amp; Empowerment</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={APP_URL}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Try the app
          </Link>
          <Link
            href="/admin"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            Admin dashboard
          </Link>
        </div>
      </header>

      <section className="mt-14">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          AI-driven voice assistant for livelihood mapping and NSQF-aligned
          skilling recommendations for SC communities under PM-AJAY
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
          Beneficiaries describe their traditional skill in their own language.
          Saksham maps it to a formal NSQF qualification and recommends nearby
          PM-AJAY training programmes — with audio output and low-bandwidth
          operation.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          {[
            "Voice-first, 10 Indian languages",
            "NSQF qualification mapping",
            "PM-AJAY programme matching",
            "Works on low bandwidth",
            "Admin tracking dashboard",
          ].map((f) => (
            <span
              key={f}
              className="rounded-full border border-neutral-300 px-3 py-1 dark:border-neutral-700"
            >
              {f}
            </span>
          ))}
        </div>
        <div className="mt-8">
          <Link
            href={APP_URL}
            className="inline-flex rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Try the app
          </Link>
        </div>
      </section>

      <section className="mt-10 flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-900 dark:bg-emerald-950/30">
        <MessageCircle className="h-8 w-8 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="flex-1">
          <p className="font-semibold text-emerald-900 dark:text-emerald-200">
            Saksham AI is now on WhatsApp
          </p>
          <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80">
            Chat or send a voice note describing your skill — no app download needed.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
          Coming soon
        </span>
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-semibold">Try the skill mapper</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Type an informal skill the way someone would say it — e.g.{" "}
          <em>“main mitti ke bartan banata hoon”</em> or{" "}
          <em>“silai ka kaam karti hoon”</em>.
        </p>
        <SkillTryout />
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-semibold">PM-AJAY training programmes</h2>
        <ProgramList />
      </section>

      <footer className="mt-20 border-t border-neutral-200 pt-6 text-xs text-neutral-500 dark:border-neutral-800">
        Prototype for demonstration. Programme data is representative sample data.
      </footer>
    </main>
  );
}
