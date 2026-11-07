import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getDailyPrompt } from "@/lib/daily-prompts";

const LOOP = [
  { n: "1", title: "Learn a skill", body: "Short lessons with strong vs. weak examples, so you see exactly what good writing looks like." },
  { n: "2", title: "Plan & draft", body: "Brainstorm, outline, then write — with guiding questions at every step instead of a blank page." },
  { n: "3", title: "Get coached", body: "Your AI coach quotes your own sentences, shows what works, and gives 1–2 clear things to fix." },
  { n: "4", title: "See it improved", body: "See your own sentences made stronger, then make the changes in your own words and watch your scores climb." },
];

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-12 text-white sm:px-10">
        <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl">Become a confident writer, one draft at a time.</h1>
        <p className="mt-3 max-w-xl text-indigo-100">
          Lessons, guided practice and a personal writing coach for students in grade 5 and up.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/lessons" className="rounded-lg bg-white px-5 py-2.5 font-semibold text-indigo-700 hover:bg-indigo-50">
            Start a lesson
          </Link>
          <Link href="/write" className="rounded-lg border border-white/60 px-5 py-2.5 font-semibold hover:bg-white/10">
            Today&apos;s prompt
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LOOP.map((s) => (
            <div key={s.n} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                {s.n}
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <Suspense fallback={<div className="h-36 rounded-xl bg-amber-50" />}>
        <DailyPromptCard />
      </Suspense>
    </div>
  );
}

async function DailyPromptCard() {
  await connection(); // choose the prompt per request, not at build time
  const daily = getDailyPrompt();
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Today&apos;s writing prompt</p>
      <p className="mt-2 text-lg text-slate-900">{daily.prompt}</p>
      <Link href="/write" className="mt-4 inline-block font-semibold text-amber-800 hover:underline">
        Write now →
      </Link>
    </section>
  );
}
