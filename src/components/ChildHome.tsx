"use client";

import Link from "next/link";
import { MAX_TRIES } from "@/lib/feedback";
import { levelLabel } from "@/lib/lessons";
import { levelProgress } from "@/lib/proficiency";
import { useActiveChild, useAllWorkMap, useAuthStatus, useWorksLoading, type Work } from "@/lib/storage";
import { Avatar } from "./Avatar";
import { CoachSays } from "./Coach";
import { ProficiencyBadge } from "./ProficiencyBadge";
import { useLocalDay } from "@/lib/local-day";
import { TodayPrompt } from "./DailyWrite";

/** Shows the child's own home when a child profile is active; otherwise the public home page. */
export function HomeSwitch({ children }: { children: React.ReactNode }) {
  const status = useAuthStatus();
  const child = useActiveChild();
  if (status === "loading") return <div className="h-72 animate-pulse rounded-3xl bg-indigo-50" />;
  if (status === "ready" && child) return <ChildHome />;
  return <>{children}</>;
}

function hrefFor(w: Work) {
  return w.lessonSlug ? `/lessons/${w.lessonSlug}` : "/write";
}

function ChildHome() {
  const child = useActiveChild()!;
  const today = useLocalDay();
  const todayKey = today ? `daily:${today}` : "";
  const works = useAllWorkMap();
  const loading = useWorksLoading();

  const progress = levelProgress(child.level, works);
  const nextLesson = progress.results.find((r) => r.status !== "proficient");
  // The most recent piece that still has tries left (yesterday's Daily Write can't be reopened).
  const inProgress = Object.values(works)
    .filter((w) => w.text.trim() && w.drafts.length < MAX_TRIES && (w.lessonSlug || w.id === todayKey))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const pct = progress.total ? (progress.proficient / progress.total) * 100 : 0;

  return (
    <div className="space-y-6">
      <section className="flex flex-col items-start gap-4 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white sm:flex-row sm:items-center sm:p-8">
        <span className="rounded-full bg-white/90 p-1">
          <Avatar avatar={child.avatar} color={child.color} size="lg" />
        </span>
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Hi {child.name}! 👋</h1>
          <p className="mt-1 text-indigo-100">Ready to write something great today?</p>
        </div>
      </section>

      {loading ? (
        <div className="h-40 animate-pulse rounded-3xl bg-indigo-50" />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {inProgress ? (
            <Card emoji="📝" title="Keep going" tone="bg-emerald-50 border-emerald-200">
              <p className="font-semibold text-slate-900">{inProgress.title}</p>
              <p className="text-sm text-slate-600">
                {inProgress.drafts.length
                  ? `Try ${inProgress.drafts.length} of ${MAX_TRIES} done`
                  : "You started this one"}
              </p>
              <CardLink href={hrefFor(inProgress)}>Continue writing</CardLink>
            </Card>
          ) : null}

          {nextLesson ? (
            <Card emoji="📚" title="Next lesson" tone="bg-indigo-50 border-indigo-200">
              <p className="font-semibold text-slate-900">{nextLesson.lesson.title}</p>
              <span className="mt-1 inline-block">
                <ProficiencyBadge status={nextLesson.status} />
              </span>
              <CardLink href={`/lessons/${nextLesson.lesson.slug}`}>Start lesson</CardLink>
            </Card>
          ) : (
            <Card emoji="🏆" title="All lessons done!" tone="bg-indigo-50 border-indigo-200">
              <p className="text-slate-700">You&apos;re proficient in every {levelLabel(child.level)} lesson.</p>
              <CardLink href="/lessons">See your lessons</CardLink>
            </Card>
          )}

          <Card emoji="✍️" title="Today's prompt" tone="bg-amber-50 border-amber-200">
            <TodayPrompt level={child.level} />
            <CardLink href="/write">Write now</CardLink>
          </Card>
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold">⭐ {levelLabel(child.level)}</h2>
          <p className="text-sm text-slate-600">
            <b className="text-slate-900">{progress.proficient}</b> of {progress.total} lessons proficient
          </p>
        </div>
        <div
          className="mt-2 h-3 overflow-hidden rounded-full bg-indigo-100"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.proficient}
          aria-label={`${progress.proficient} of ${progress.total} lessons proficient`}
        >
          <div
            className="h-3 rounded-full bg-indigo-600"
            style={{ width: `${Math.max(pct, progress.proficient ? 4 : 0)}%` }}
          />
        </div>
        <div className="mt-4">
          <CoachSays>
            {progress.proficient === 0
              ? "Every great writer starts somewhere. Let's do your first lesson!"
              : progress.allProficient
                ? "Wow — you've mastered this whole level!"
                : "You're getting stronger every time you write. Keep it up!"}
          </CoachSays>
        </div>
      </section>

      <p className="text-center text-sm">
        <Link href="/profiles" className="font-medium text-slate-500 hover:text-slate-800">
          Not {child.name}? Switch profile
        </Link>
      </p>
    </div>
  );
}

function Card({ emoji, title, tone, children }: { emoji: string; title: string; tone: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col rounded-3xl border p-5 ${tone}`}>
      <p className="text-sm font-bold uppercase tracking-wide text-slate-600">
        <span aria-hidden className="mr-1 text-xl">
          {emoji}
        </span>
        {title}
      </p>
      <div className="mt-2 flex flex-1 flex-col">{children}</div>
    </div>
  );
}

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <div className="mt-auto pt-4">
      <Link
        href={href}
        className="inline-block rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        {children} →
      </Link>
    </div>
  );
}
