"use client";

import Link from "next/link";
import { useState } from "react";
import { DraftHistory } from "@/components/DraftHistory";
import { PerformanceSummary } from "@/components/PerformanceSummary";
import { ScoreTrendChart } from "@/components/ScoreTrendChart";
import { TraitProgress } from "@/components/TraitProgress";
import {
  scoredDrafts,
  series,
  summary,
  traitSummaries,
  type Metric,
} from "@/lib/performance";
import type { Draft } from "@/lib/storage";
import { TRAITS } from "@/lib/traits";

/** One piece of writing as the progress view needs it (the admin view has scores only, no text). */
export interface ProgressPiece {
  id: string;
  lessonSlug: string | null;
  title: string;
  updatedAt: string;
  words: number;
  drafts: Draft[];
}

export const countWords = (text: string) =>
  text.trim() ? text.trim().split(/\s+/).length : 0;

/**
 * A child's progress: totals, writing level, scores over time, skills and every draft.
 * The child (and parent) see it on /progress; admins see the same view with scores only.
 */
export function ProgressView({
  name,
  grade,
  pieces,
  admin = false,
}: {
  name: string;
  grade: number;
  pieces: ProgressPiece[];
  /** Admin view: talks about the child, and shows scores without the writing. */
  admin?: boolean;
}) {
  const work = [...pieces].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  const [metric, setMetric] = useState<Metric>("overall");
  const allDrafts = work.flatMap((w) => w.drafts);
  const scored = scoredDrafts(work);
  const overall = summary(scored, "overall");
  const traits = traitSummaries(scored);
  const weakest = scored.length
    ? [...traits].sort((a, b) => (a.current ?? 9) - (b.current ?? 9))[0].trait
    : null;
  const metricLabel =
    metric === "overall"
      ? "Overall"
      : (TRAITS.find((t) => t.id === metric)?.name ?? "");
  const totalWords = work.reduce((n, w) => n + w.words, 0);
  const revisions = work.reduce(
    (n, w) => n + Math.max(0, w.drafts.length - 1),
    0,
  );
  const your = admin ? `${name}'s` : "Your";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">{name}&apos;s progress</h1>
        <p className="text-slate-600">Grade {grade}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Pieces written"
          value={work.filter((w) => w.words > 0).length}
        />
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
                grade={grade}
              />
            </div>
            {weakest && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h2 className="font-semibold text-amber-900">
                  {your} growth area
                </h2>
                <p className="mt-1 text-slate-800">
                  Focus on <b>{weakest.name}</b>: {weakest.short}
                </p>
                {!admin && (
                  <Link
                    href="/lessons"
                    className="mt-3 inline-block text-sm font-semibold text-amber-900 hover:underline"
                  >
                    Find a lesson →
                  </Link>
                )}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Scores over time</h2>
                <p className="text-xs text-slate-500">
                  Each point is one draft {admin ? "that got" : "you got"}{" "}
                  feedback, oldest to newest.
                </p>
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
            <ScoreTrendChart
              points={series(scored, metric)}
              label={metricLabel}
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Progress by trait</h2>
            <p className="mb-4 text-xs text-slate-500">
              Average of the latest 5 drafts. ▲/▼ shows the change since the
              first 5 drafts.
            </p>
            <TraitProgress rows={traits} />
          </section>
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 p-5 text-slate-600">
          No feedback yet.
          {!admin && (
            <>
              {" "}
              <Link href="/lessons" className="text-indigo-700 hover:underline">
                Start a lesson
              </Link>{" "}
              or try{" "}
              <Link href="/write" className="text-indigo-700 hover:underline">
                today&apos;s prompt
              </Link>
              .
            </>
          )}
        </p>
      )}

      {work.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">
              {admin ? "Writing & draft history" : "My writing & draft history"}
            </h2>
            <p className="text-xs text-slate-500">
              {allDrafts.length} draft{allDrafts.length === 1 ? "" : "s"} saved
              {admin && " · scores only, the writing stays private"}
            </p>
          </div>
          <ul className="space-y-3">
            {work.map((w) => (
              <li
                key={w.id}
                className="rounded-xl border border-slate-200 bg-white"
              >
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4">
                    <span>
                      <span className="font-medium">{w.title}</span>
                      <span className="block text-xs text-slate-500">
                        {w.drafts.length} draft
                        {w.drafts.length === 1 ? "" : "s"} with feedback ·
                        updated {new Date(w.updatedAt).toLocaleDateString()}
                        {admin && ` · ${w.words} words`}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 text-sm">
                      {w.lessonSlug && !admin && (
                        <Link
                          href={`/lessons/${w.lessonSlug}`}
                          className="text-indigo-700 hover:underline"
                        >
                          Keep writing
                        </Link>
                      )}
                      <span className="text-slate-500">History ▾</span>
                    </span>
                  </summary>
                  <div className="border-t border-slate-200 p-4">
                    <DraftHistory drafts={w.drafts} scoresOnly={admin} />
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
      <p className="text-3xl font-bold text-indigo-700">
        {value.toLocaleString()}
      </p>
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}
