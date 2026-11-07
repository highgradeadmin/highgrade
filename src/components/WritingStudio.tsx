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
import { FeedbackPanel } from "./FeedbackPanel";
import { PlanToDraftExample } from "./PlanToDraftExample";
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

const STEPS = ["Brainstorm", "Outline", "Draft", "Revise"] as const;
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

  const [step, setStep] = useState<Step>(work.drafts.length ? "Revise" : "Brainstorm");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<Work>) => saveWork({ ...work, ...patch });
  const words = countWords(work.text);
  const hasOutline = work.outline.some((l) => l?.trim());
  const latest = work.drafts.at(-1);
  const unchangedSinceFeedback = latest?.text === work.text;
  const triesUsed = work.drafts.length;
  const outOfTries = triesUsed >= MAX_TRIES;

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
      setStep("Revise");
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
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Your task</p>
        <p className="mt-1 text-slate-900">{task.prompt}</p>
        <p className="mt-1 text-sm text-slate-600">
          Aim for {task.targetWords[0]}–{task.targetWords[1]} words.
        </p>
      </div>

      <nav className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1" aria-label="Writing steps">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              step === s ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {i + 1}. {s}
          </button>
        ))}
      </nav>

      {step === "Brainstorm" && (
        <section className="space-y-4">
          <StepIntro n={1} title="Collect your ideas">
            Write <b>quick notes</b> — single words or short phrases, not sentences. Get as many ideas
            down as you can; you&apos;ll choose the best ones next.
            <Example>cold water · fireflies · grandma&apos;s dock · feels calm</Example>
          </StepIntro>
          {task.brainstorm.map((q) => (
            <label key={q} className="block">
              <span className="text-sm font-medium text-slate-800">{q}</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
                rows={2}
                placeholder="Quick notes…"
                value={work.notes[q] ?? ""}
                onChange={(e) => update({ notes: { ...work.notes, [q]: e.target.value } })}
              />
            </label>
          ))}
          <NextButton onClick={() => setStep("Outline")}>Next: Outline</NextButton>
        </section>
      )}

      {step === "Outline" && (
        <section className="space-y-3">
          <StepIntro n={2} title="Make a plan">
            Pick your best ideas and put them in order. Keep each line <b>short — a few words</b>.
            This is your map; you&apos;ll write the full sentences in the next step.
            <Example>Topic: lake = my happy place · Detail: icy water in July</Example>
          </StepIntro>
          {task.outline.map((label, i) => (
            <label key={label} className="block">
              <span className="text-sm font-medium text-slate-800">{label}</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
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
          <NextButton onClick={() => setStep("Draft")}>Next: Draft</NextButton>
        </section>
      )}

      {(step === "Draft" || step === "Revise") && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3">
            {step === "Draft" && (
              <StepIntro n={3} title="Write it for real">
                Your brainstorm and plan are your <b>raw material</b> — now build the finished piece:
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  <li>Use your <b>best</b> brainstorm ideas. Leaving some out is normal.</li>
                  <li>Keep your plan&apos;s order, and grow each line into one or more <b>full sentences</b>.</li>
                  <li>Add details (what you saw, heard, felt) and linking words like <i>also, because, best of all</i>.</li>
                </ul>
                <p className="mt-1">Your draft should be clearly longer and richer than your plan. Don&apos;t worry about perfect — you&apos;ll revise next.</p>
              </StepIntro>
            )}
            {step === "Draft" && hasOutline && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-800">Your plan</p>
                  {!work.text.trim() && (
                    <button
                      onClick={() => update({ text: task.outline.map((_, i) => work.outline[i]?.trim()).filter(Boolean).join("\n\n") })}
                      className="rounded-md border border-indigo-200 bg-white px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                    >
                      Start from my plan
                    </button>
                  )}
                </div>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-700">
                  {task.outline.map((label, i) =>
                    work.outline[i] ? (
                      <li key={label}>
                        <span className="text-slate-500">{label}:</span> {work.outline[i]}
                      </li>
                    ) : null,
                  )}
                </ol>
                {!work.text.trim() && (
                  <p className="mt-2 text-xs text-slate-500">
                    &ldquo;Start from my plan&rdquo; copies these lines into the box below so you can grow each
                    one into full sentences.
                  </p>
                )}
              </div>
            )}
            {step === "Draft" && task.walkthrough && (
              <PlanToDraftExample example={task.walkthrough} defaultOpen={!work.text.trim()} />
            )}
            <textarea
              className="h-80 w-full rounded-lg border border-slate-300 p-3 leading-relaxed focus:border-indigo-500 focus:outline-none lg:h-[28rem]"
              placeholder="Write your full piece here. Turn each line of your plan into complete sentences…"
              value={work.text}
              onChange={(e) => update({ text: e.target.value })}
              spellCheck
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm">
                <span className={words >= task.targetWords[0] ? "text-emerald-700" : "text-slate-500"}>
                  {words} words
                </span>
                <span className={`ml-3 text-xs ${saveStatus === "error" ? "text-red-600" : "text-slate-400"}`}>
                  {saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Not saved — check connection" : "Saved"}
                </span>
              </span>
              <button
                onClick={getFeedback}
                disabled={loading || words < 5 || unchangedSinceFeedback || outOfTries}
                className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Reading your writing…"
                  : outOfTries
                    ? `All ${MAX_TRIES} tries used`
                    : `Get feedback · try ${triesUsed + 1} of ${MAX_TRIES}`}
              </button>
            </div>
            {outOfTries ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <b>You finished all {MAX_TRIES} tries on this piece!</b> Look at how your scores changed, then
                use what you learned on a new piece:{" "}
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
                <p className="text-right text-xs text-slate-500">
                  Make some changes, then get feedback again to see your new score.
                </p>
              )
            )}
            {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          </section>

          <aside className="space-y-4">
            {step === "Revise" && (
              <StepIntro n={4} title="Make it better">
                Read your coach&apos;s feedback, then <b>change your writing in the box</b> — add,
                cut or reword. Tick the checklist as you go, then get feedback again to see how your
                score changes. You have {MAX_TRIES - triesUsed} of {MAX_TRIES} tries left.
              </StepIntro>
            )}
            {step === "Revise" && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-2 font-semibold">Revision checklist</h3>
                <ul className="space-y-1">
                  {task.checklist.map((c, i) => (
                    <li key={c}>
                      <label className="flex gap-2 text-sm">
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
              </div>
            )}

            {step === "Revise" && <TryComparison drafts={work.drafts} />}

            {latest?.feedback ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Coach feedback</h3>
                  <span className="text-xs text-slate-500">
                    Try {triesUsed} of {MAX_TRIES}
                  </span>
                </div>
                <FeedbackPanel feedback={latest.feedback} />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                When your draft is ready, click <b>Get feedback</b>. Your coach will score it and give you
                one or two things to improve. You get {MAX_TRIES} tries on each piece, so revise and
                watch your score change!
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function StepIntro({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-l-4 border-indigo-400 bg-white p-3 text-sm text-slate-700 shadow-sm">
      <p className="font-semibold text-slate-900">
        Step {n} of 4 · {title}
      </p>
      <div className="mt-1">{children}</div>
    </div>
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
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        {children} →
      </button>
    </div>
  );
}
