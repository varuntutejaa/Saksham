import Link from "next/link";
import { SkillTryout } from "./skill-tryout";
import { ProgramList } from "./program-list";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-brand">सक्षम · Saksham</p>
          <p className="text-xs text-neutral-500">Ministry of Social Justice &amp; Empowerment</p>
        </div>
        <Link
          href="/admin"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Admin dashboard
        </Link>
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
