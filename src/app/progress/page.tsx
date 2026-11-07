"use client";

import Link from "next/link";
import { DraftHistory } from "@/components/DraftHistory";
import { useState } from "react";
import { PerformanceSummary } from "@/components/PerformanceSummary";
import { ScoreTrendChart } from "@/components/ScoreTrendChart";
import { TraitProgress } from "@/components/TraitProgress";
import { scoredDrafts, series, summary, traitSummaries, type Metric } from "@/lib/performance";
import { TRAITS } from "@/lib/traits";
import { useAllWorkMap, useAuthStatus, useProfile, useWorksLoading } from "@/lib/storage";

export default function ProgressPage() {
  const status = useAuthStatus();
  const profile = useProfile();
  const worksLoading = useWorksLoading();
  const workMap = useAllWorkMap();
  const work = Object.values(workMap).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const [metric, setMetric] = useState<Metric>("overall");
  const allDrafts = work.flatMap((w) => w.drafts);
  const scored = scoredDrafts(work);
  const overall = summary(scored, "overall");
  const traits = traitSummaries(scored);
  const weakest = scored.length
    ? [...traits].sort((a, b) => (a.current ?? 9) - (b.current ?? 9))[0].trait
    : null;
  const metricLabel = metric === "overall" ? "Overall" : (TRAITS.find((t) => t.id === metric)?.name ?? "");
  const totalWords = work.reduce((n, w) => n + (w.text.trim() ? w.text.trim().split(/\s+/).length : 0), 0);
  const revisions = work.reduce((n, w) => n + Math.max(0, w.drafts.length - 1), 0);

  if (status === "loading" || worksLoading) return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;
  if (status !== "ready") {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-700">
        <Link href="/login" className="font-medium text-indigo-700 hover:underline">Log in</Link> to see progress.
      </p>
    );
  }
  if (!profile) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-700">
        <Link href="/profiles" className="font-medium text-indigo-700 hover:underline">Choose who&apos;s writing</Link>{" "}
        to see their progress.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">{profile.name}&apos;s progress</h1>
        <p className="text-slate-600">Grade {profile.grade}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Pieces written" value={work.filter((w) => w.text.trim()).length} />
        <Stat label="Words written" value={totalWords} />
        <Stat label="Revisions" value={revisions} />
      </section>

      {overall.current !== null ? (
        <>
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PerformanceSummary
                current={overall.current}
                delta={overall.delta}
                count={overall.count}
                grade={profile.grade}
              />
            </div>
            {weakest && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h2 className="font-semibold text-amber-900">Your growth area</h2>
                <p className="mt-1 text-slate-800">
                  Focus on <b>{weakest.name}</b>: {weakest.short}
                </p>
                <Link href="/lessons" className="mt-3 inline-block text-sm font-semibold text-amber-900 hover:underline">
                  Find a lesson →
                </Link>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Scores over time</h2>
                <p className="text-xs text-slate-500">Each point is one draft you got feedback on, oldest to newest.</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Show</span>
                <select
                  className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as Metric)}
                >
                  <option value="overall">Overall average</option>
                  {TRAITS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <ScoreTrendChart points={series(scored, metric)} label={metricLabel} />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Progress by trait</h2>
            <p className="mb-4 text-xs text-slate-500">
              Average of your latest 5 drafts. ▲/▼ shows the change since your first 5 drafts.
            </p>
            <TraitProgress rows={traits} />
          </section>
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 p-5 text-slate-600">
          No feedback yet. <Link href="/lessons" className="text-indigo-700 hover:underline">Start a lesson</Link> or
          try <Link href="/write" className="text-indigo-700 hover:underline">today&apos;s prompt</Link>.
        </p>
      )}

      {work.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">My writing &amp; draft history</h2>
            <p className="text-xs text-slate-500">
              {allDrafts.length} of 100 drafts saved · when you pass 100, the oldest are removed
            </p>
          </div>
          <ul className="space-y-3">
            {work.map((w) => (
              <li key={w.id} className="rounded-xl border border-slate-200 bg-white">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4">
                    <span>
                      <span className="font-medium">{w.title}</span>
                      <span className="block text-xs text-slate-500">
                        {w.drafts.length} draft{w.drafts.length === 1 ? "" : "s"} with feedback · updated{" "}
                        {new Date(w.updatedAt).toLocaleDateString()}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 text-sm">
                      {w.lessonSlug && (
                        <Link href={`/lessons/${w.lessonSlug}`} className="text-indigo-700 hover:underline">
                          Keep writing
                        </Link>
                      )}
                      <span className="text-slate-500">History ▾</span>
                    </span>
                  </summary>
                  <div className="border-t border-slate-200 p-4">
                    <DraftHistory drafts={w.drafts} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-3xl font-bold text-indigo-700">{value.toLocaleString()}</p>
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}
