"use client";

import { useState } from "react";
import { LESSONS, LEVELS, levelIndex, levelLabel, nextLevel } from "@/lib/lessons";
import { levelProgress } from "@/lib/proficiency";
import { advanceChildLevel, useActiveChild, useAllWorkMap, useAuthStatus, useWorksLoading } from "@/lib/storage";
import { LessonCard } from "./LessonCard";

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

/** Lessons for the active child's level, with proficiency and the next level locked. */
export function LessonsBrowser() {
  const status = useAuthStatus();
  const child = useActiveChild();
  const works = useAllWorkMap();
  const worksLoading = useWorksLoading();
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Visitors (and parents before choosing a child) see every level.
  if (status !== "ready" || !child) {
    if (status === "loading") return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
    return (
      <div className="space-y-10">
        {LEVELS.map(({ band, label }) => (
          <section key={band}>
            <h2 className="mb-3 text-lg font-semibold">{label}</h2>
            <Grid>
              {LESSONS.filter((l) => l.grade === band).map((l) => (
                <LessonCard key={l.slug} lesson={l} />
              ))}
            </Grid>
          </section>
        ))}
      </div>
    );
  }

  if (worksLoading) return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;

  const current = levelProgress(child.level, works);
  const next = nextLevel(child.level);
  const earlier = LEVELS.slice(0, levelIndex(child.level));
  const pct = current.total ? (current.proficient / current.total) * 100 : 0;

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-600">{child.name}&apos;s level</p>
            <h2 className="text-2xl font-bold">{levelLabel(child.level)}</h2>
          </div>
          <p className="text-sm text-slate-700">
            <b className="text-lg text-slate-900">{current.proficient}</b> of {current.total} lessons proficient
          </p>
        </div>
        <div
          className="mt-3 h-3 overflow-hidden rounded-full bg-indigo-100"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={current.total}
          aria-valuenow={current.proficient}
          aria-label={`${current.proficient} of ${current.total} lessons proficient`}
        >
          <div className="h-3 rounded-full bg-indigo-600" style={{ width: `${Math.max(pct, current.proficient ? 4 : 0)}%` }} />
        </div>

        {current.allProficient ? (
          next ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-emerald-900">
                <b>🎉 You&apos;re proficient in every {levelLabel(child.level)} lesson!</b> Ready for the next level?
              </p>
              <button
                disabled={moving}
                onClick={async () => {
                  setMoving(true);
                  setMoveError(null);
                  const lvl = await advanceChildLevel(child.id);
                  setMoving(false);
                  if (!lvl) setMoveError("Couldn't move up right now. Please try again.");
                }}
                className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {moving ? "Moving up…" : `Move up to ${next.label}`}
              </button>
              {moveError && <p className="w-full text-sm text-red-700">{moveError}</p>}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
              🎉 You&apos;re proficient in every lesson we have so far. Keep writing with the Daily Write — new
              levels are coming!
            </p>
          )
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            A lesson is <b>proficient</b> when every focus skill scores 3 or more in one try.
            {next && <> Get all {current.total} proficient to unlock {next.label}.</>}
          </p>
        )}
      </section>

      <section>
        <Grid>
          {current.results.map((r) => (
            <LessonCard key={r.lesson.slug} lesson={r.lesson} status={r.status} />
          ))}
        </Grid>
      </section>

      {next && (
        <section>
          <h2 className="text-lg font-semibold">{next.label}</h2>
          <p className="mb-3 text-sm text-slate-600">
            🔒 Unlocks when every {levelLabel(child.level)} lesson is proficient — or a parent can move{" "}
            {child.name} up in the parent area.
          </p>
          <Grid>
            {LESSONS.filter((l) => l.grade === next.band).map((l) => (
              <LessonCard key={l.slug} lesson={l} locked />
            ))}
          </Grid>
        </section>
      )}

      {earlier.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer font-medium">Review earlier levels</summary>
          {earlier.map(({ band, label }) => {
            const p = levelProgress(band, works);
            return (
              <section key={band} className="mt-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  {label} · {p.proficient} of {p.total} proficient
                </h3>
                <Grid>
                  {p.results.map((r) => (
                    <LessonCard key={r.lesson.slug} lesson={r.lesson} status={r.status} />
                  ))}
                </Grid>
              </section>
            );
          })}
        </details>
      )}
    </div>
  );
}
