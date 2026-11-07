"use client";

import { useState } from "react";
import { MAX_TRIES, type Feedback } from "@/lib/feedback";
import type { Genre } from "@/lib/lessons";
import Link from "next/link";
import {
  addDraft,
  flushWork,
  getActiveChildId,
  saveWork,
  useAuthStatus,
  useProfile,
  useSaveStatus,
  useWork,
  useWorksLoading,
  type Work,
} from "@/lib/storage";
import type { Walkthrough } from "@/lib/walkthroughs";
import { CoachSays } from "./Coach";
import { FeedbackLoading } from "./FeedbackLoading";
import { FeedbackPanel } from "./FeedbackPanel";
import { ImprovedVersion } from "./ImprovedVersion";
import { PlanToDraftExample } from "./PlanToDraftExample";
import { ReadAloud } from "./ReadAloud";
import { TryComparison } from "./TryComparison";

export interface StudioTask {
  id: string;
  lessonSlug: string | null;
  title: string;
  prompt: string;
  genre: Genre;
  focus: string[];
  targetWords: [number, number];
  brainstorm: string[];
  outline: string[];
  checklist: string[];
  /** Worked plan → draft example shown in the Draft step. */
  walkthrough?: Walkthrough;
}

const STEPS = ["Brainstorm", "Outline", "Draft", "Improve"] as const;
type Step = (typeof STEPS)[number];

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function WritingStudio({ task }: { task: StudioTask }) {
  const auth = useAuthStatus();
  const profile = useProfile();
  const worksLoading = useWorksLoading();
  const saveStatus = useSaveStatus();
  const stored = useWork(task.id);
  const work: Work = stored ?? {
    id: task.id,
    lessonSlug: task.lessonSlug,
    title: task.title,
    prompt: task.prompt,
    genre: task.genre,
    notes: {},
    outline: task.outline.map(() => ""),
    text: "",
    checked: [],
    drafts: [],
    updatedAt: "", // set by saveWork()
  };

  const [step, setStep] = useState<Step>(work.drafts.length ? "Draft" : "Brainstorm");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<Work>) => saveWork({ ...work, ...patch });
  const words = countWords(work.text);
  const hasOutline = work.outline.some((l) => l?.trim());
  const latest = work.drafts.at(-1);
  const unchangedSinceFeedback = latest?.text === work.text;
  const triesUsed = work.drafts.length;
  const outOfTries = triesUsed >= MAX_TRIES;
  const latestFeedback = latest?.feedback;
  const hasImproved = Boolean(latestFeedback?.improved_version || latestFeedback?.sentence_makeovers?.length);

  /** Moving to Draft with an empty box copies the plan in, so the student edits it into sentences. */
  function goTo(next: Step) {
    if (next === "Draft" && !work.text.trim() && hasOutline) {
      update({ text: task.outline.map((_, i) => work.outline[i]?.trim()).filter(Boolean).join("\n") });
    }
    setStep(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function getFeedback() {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      await flushWork(task.id);
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: getActiveChildId(),
          taskKey: task.id,
          lessonSlug: task.lessonSlug,
          title: task.title,
          text: work.text,
          prompt: task.prompt,
          genre: task.genre,
          focus: task.focus,
          checklist: task.checklist,
        }),
      });
      const data = (await res.json()) as { feedback?: Feedback; at?: string; error?: string };
      if (!res.ok || !data.feedback) throw new Error(data.error ?? "Something went wrong.");
      addDraft(task.id, { text: work.text, feedback: data.feedback, at: data.at ?? "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (auth === "loading") {
    return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;
  }
  if (auth === "unconfigured") {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Accounts aren&apos;t set up yet. Add the Supabase keys to <code>.env.local</code> (see README).
      </p>
    );
  }
  if (auth === "signed-out") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <h2 className="text-lg font-semibold">Ready to write?</h2>
        <p className="mt-1 text-slate-600">
          A parent or guardian logs in, then you pick your profile. Your writing is saved and your
          coach gives you feedback.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
            Log in
          </Link>
          <Link href="/signup" className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50">
            Parents: create a family account
          </Link>
        </div>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <h2 className="text-lg font-semibold">Who&apos;s writing today?</h2>
        <p className="mt-1 text-slate-600">Pick your profile so your writing is saved to the right place.</p>
        <Link
          href="/profiles"
          className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
        >
          Choose profile
        </Link>
      </div>
    );
  }
  if (worksLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border-2 border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-800">🎯 Your task</p>
          <ReadAloud text={task.prompt} />
        </div>
        <p className="mt-1 text-lg text-slate-900">{task.prompt}</p>
        <p className="mt-1 text-sm text-slate-600">
          Aim for {task.targetWords[0]}–{task.targetWords[1]} words.
        </p>
      </div>

      <nav className="flex gap-1 overflow-x-auto rounded-full bg-indigo-100/70 p-1" aria-label="Writing steps">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => goTo(s)}
            aria-current={step === s ? "step" : undefined}
            className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition ${
              step === s ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {i + 1}. {s}
          </button>
        ))}
      </nav>

      {step === "Brainstorm" && (
        <section className="space-y-4">
          <StepIntro
            n={1}
            title="Collect your ideas"
            speak={`Write quick notes. Just words, not sentences. ${task.brainstorm.join(" ")}`}
          >
            Write <b>quick notes</b> — just words, not sentences.
            <Example>cold water · fireflies · grandma&apos;s dock · feels calm</Example>
          </StepIntro>
          {task.brainstorm.map((q) => (
            <label key={q} className="block">
              <span className="font-semibold text-slate-800">{q}</span>
              <textarea
                className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white p-2.5 focus:border-indigo-500 focus:outline-none"
                rows={2}
                placeholder="Quick notes…"
                value={work.notes[q] ?? ""}
                onChange={(e) => update({ notes: { ...work.notes, [q]: e.target.value } })}
              />
            </label>
          ))}
          <NextButton onClick={() => goTo("Outline")}>Next: Outline</NextButton>
        </section>
      )}

      {step === "Outline" && (
        <section className="space-y-3">
          <StepIntro
            n={2}
            title="Make a plan"
            speak={`Pick your best ideas and put them in order. Just a few words on each line. ${task.outline.join(". ")}.`}
          >
            Pick your best ideas and put them in order. <b>A few words</b> on each line.
            <Example>Topic: lake = my happy place · Detail: icy water in July</Example>
          </StepIntro>
          {task.outline.map((label, i) => (
            <label key={label} className="block">
              <span className="font-semibold text-slate-800">{label}</span>
              <input
                className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white p-2.5 focus:border-indigo-500 focus:outline-none"
                placeholder="A few words…"
                value={work.outline[i] ?? ""}
                onChange={(e) => {
                  const outline = [...work.outline];
                  outline[i] = e.target.value;
                  update({ outline });
                }}
              />
            </label>
          ))}
          <NextButton onClick={() => goTo("Draft")}>Next: Draft</NextButton>
        </section>
      )}

      {step === "Draft" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3">
            <StepIntro
              n={3}
              title={triesUsed ? "Make it better" : "Write it for real"}
              speak={
                triesUsed
                  ? "Read the feedback, change your writing in the box, then get feedback again."
                  : "Turn each line of your plan into full sentences, and add details."
              }
            >
              {triesUsed ? (
                <>Read the feedback, change your writing in the box, then get feedback again.</>
              ) : hasOutline ? (
                <>
                  Your plan is copied below. <b>Turn each line into full sentences</b> and add details. Change
                  anything you like.
                </>
              ) : (
                <>Write your piece in the box below, in full sentences.</>
              )}
            </StepIntro>
            <textarea
              className="h-80 w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-lg leading-relaxed focus:border-indigo-500 focus:outline-none lg:h-[28rem]"
              placeholder="Write your full piece here…"
              value={work.text}
              onChange={(e) => update({ text: e.target.value })}
              readOnly={loading}
              spellCheck
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm">
                <span className={words >= task.targetWords[0] ? "text-emerald-700" : "text-slate-500"}>
                  {words} / {task.targetWords[0]}+ words
                </span>
                <span className={`ml-3 text-xs ${saveStatus === "error" ? "text-red-600" : "text-slate-400"}`}>
                  {saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Not saved — check connection" : "Saved"}
                </span>
              </span>
              <button
                onClick={getFeedback}
                disabled={loading || words < 5 || unchangedSinceFeedback || outOfTries}
                className="rounded-full bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Reading your writing…"
                  : outOfTries
                    ? `All ${MAX_TRIES} tries used`
                    : `Get feedback · try ${triesUsed + 1} of ${MAX_TRIES}`}
              </button>
            </div>
            {loading && <FeedbackLoading />}
            {outOfTries ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <b>You finished all {MAX_TRIES} tries!</b> Try a new piece:{" "}
                <Link href="/write" className="font-medium underline">
                  today&apos;s prompt
                </Link>{" "}
                or{" "}
                <Link href="/lessons" className="font-medium underline">
                  another lesson
                </Link>
                .
              </div>
            ) : (
              unchangedSinceFeedback && (
                <p className="text-right text-xs text-slate-500">Change your writing to get feedback again.</p>
              )
            )}
            {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

            <div className="space-y-2">
              {hasOutline && (
                <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <summary className="cursor-pointer font-medium text-slate-800">My plan</summary>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-700">
                    {task.outline.map((label, i) =>
                      work.outline[i] ? (
                        <li key={label}>
                          <span className="text-slate-500">{label}:</span> {work.outline[i]}
                        </li>
                      ) : null,
                    )}
                  </ol>
                </details>
              )}
              {task.walkthrough && <PlanToDraftExample example={task.walkthrough} defaultOpen={false} />}
              {task.checklist.length > 0 && (
                <details className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                  <summary className="cursor-pointer font-medium text-slate-800">
                    Checklist ({work.checked.length}/{task.checklist.length})
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {task.checklist.map((c, i) => (
                      <li key={c}>
                        <label className="flex gap-2">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={work.checked.includes(i)}
                            onChange={(e) =>
                              update({
                                checked: e.target.checked
                                  ? [...work.checked, i]
                                  : work.checked.filter((x) => x !== i),
                              })
                            }
                          />
                          {c}
                        </label>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </section>

          <aside className={`space-y-4 transition-opacity ${loading ? "pointer-events-none opacity-40" : ""}`}>
            {latestFeedback ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold">Coach feedback</h3>
                  <span className="text-xs text-slate-500">
                    Try {triesUsed} of {MAX_TRIES}
                  </span>
                </div>
                <FeedbackPanel feedback={latestFeedback} />
                {hasImproved && (
                  <button
                    onClick={() => goTo("Improve")}
                    className="mt-4 w-full rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
                  >
                    ✨ See how to make it better →
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                Done? Click <b>Get feedback</b>. You get {MAX_TRIES} tries.
              </div>
            )}
            {triesUsed > 1 && <TryComparison drafts={work.drafts} />}
          </aside>
        </div>
      )}

      {step === "Improve" && (
        <section className="space-y-4">
          <StepIntro
            n={4}
            title="See it improved"
            speak="Here's how your coach would make your writing stronger. Read it, then go back and make your own changes, in your own words."
          >
            {latestFeedback ? (
              <>
                Here&apos;s how your coach would make your writing stronger. Read it, then go back and make{" "}
                <b>your own changes, in your own words</b>.
              </>
            ) : (
              <>Get feedback on your draft first. Then you&apos;ll see your sentences made even better here.</>
            )}
          </StepIntro>
          {latest && latestFeedback && <ImprovedVersion feedback={latestFeedback} studentText={latest.text} />}
          <div className="flex justify-end">
            <button
              onClick={() => goTo("Draft")}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              {latestFeedback && !outOfTries ? "Back to my draft to make changes →" : "Back to my draft →"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function StepIntro({
  n,
  title,
  speak,
  children,
}: {
  n: number;
  title: string;
  speak?: string;
  children: React.ReactNode;
}) {
  return (
    <CoachSays title={`Step ${n} of 4 · ${title}`}>
      <div className="text-slate-800">{children}</div>
      {speak && (
        <div className="mt-2">
          <ReadAloud text={speak} />
        </div>
      )}
    </CoachSays>
  );
}

function Example({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs text-slate-500">Example: {children}</p>;
}

function NextButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <button
        onClick={onClick}
        className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
      >
        {children} →
      </button>
    </div>
  );
}
