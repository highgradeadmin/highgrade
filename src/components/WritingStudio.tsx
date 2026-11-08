"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MAX_TRIES, type Feedback } from "@/lib/feedback";
import type { Genre } from "@/lib/lessons";
import Link from "next/link";
import {
  addDraft,
  fetchPlan,
  flushWork,
  getActiveChildId,
  getWork,
  saveWork,
  useAuthStatus,
  useIsAdmin,
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
import { emptyPractice, ImprovedVersion, type ApplyToDraft, type PracticeState } from "./ImprovedVersion";
import { PlanToDraftExample } from "./PlanToDraftExample";
import { ReadAloud } from "./ReadAloud";
import { joinSpoken, SpeechButton } from "./SpeechButton";
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
  /** Worked plan → draft example shown in the Write step. */
  walkthrough?: Walkthrough;
}

const STEPS = ["Plan", "Write", "Improve"] as const;
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

  const [step, setStep] = useState<Step>(work.drafts.length || work.text.trim() ? "Write" : "Plan");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  // Planning is optional: an empty plan gets one friendly nudge, then the child can skip it.
  const [planNudge, setPlanNudge] = useState(false);
  const [skippedPlan, setSkippedPlan] = useState(false);
  const firstLineRef = useRef<HTMLInputElement>(null);
  // Speech-to-text: allowed per child by a parent. The coach is told when the draft was spoken.
  const voice = profile?.voiceTyping ?? false;
  const [spokeInDraft, setSpokeInDraft] = useState(false);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const [practiceState, setPracticeState] = useState<PracticeState>(emptyPractice(""));
  // Free coach tries left for families without a plan (null = has a plan, admin, or billing off).
  const isAdmin = useIsAdmin();
  const [freeLeft, setFreeLeft] = useState<number | null>(null);
  useEffect(() => {
    if (auth !== "ready" || isAdmin) return;
    let cancelled = false;
    fetchPlan().then((p) => {
      if (!cancelled) setFreeLeft(p.enabled && !p.active && p.freeTries ? p.freeTries.left : null);
    });
    return () => {
      cancelled = true;
    };
  }, [auth, isAdmin]);

  /** Latest copy from the store, so quick speech results don't overwrite each other. */
  const current = () => getWork(task.id) ?? work;

  function speakIntoLine(i: number, spoken: string) {
    const w = current();
    const outline = task.outline.map((_, j) => w.outline[j] ?? "");
    outline[i] = joinSpoken(outline[i], spoken).text;
    saveWork({ ...w, outline });
  }

  function speakIntoDraft(spoken: string) {
    const w = current();
    const el = draftRef.current;
    const at = el ? Math.min(el.selectionStart ?? w.text.length, w.text.length) : w.text.length;
    const { text, caret } = joinSpoken(w.text.slice(0, at), spoken, w.text.slice(at));
    saveWork({ ...w, text });
    setSpokeInDraft(true);
    requestAnimationFrame(() => draftRef.current?.setSelectionRange(caret, caret));
  }

  const update = (patch: Partial<Work>) => saveWork({ ...work, ...patch });

  function skipPlan() {
    setSkippedPlan(true);
    goTo("Write", { force: true });
  }

  function startQuickPlan() {
    setPlanNudge(false);
    firstLineRef.current?.focus();
  }
  const words = countWords(work.text);
  const hasOutline = work.outline.some((l) => l?.trim());
  const latest = work.drafts.at(-1);
  const unchangedSinceFeedback = latest?.text === work.text;
  const triesUsed = work.drafts.length;
  const outOfTries = triesUsed >= MAX_TRIES;
  const latestFeedback = latest?.feedback;
  const hasImproved = Boolean(latestFeedback?.improved_version || latestFeedback?.sentence_makeovers?.length);
  // Practice starts fresh for each new round of feedback.
  const practiceAt = latest?.at ?? "";
  const practice = practiceState.at === practiceAt ? practiceState : emptyPractice(practiceAt);
  const onPractice = (patch: Partial<PracticeState>) => setPracticeState({ ...practice, ...patch });
  const applyToDraft: ApplyToDraft = (change) => {
    const w = current();
    const next = change(w.text);
    if (next === null) return false;
    saveWork({ ...w, text: next });
    return true;
  };

  const planLines = task.outline.map((_, i) => work.outline[i]?.trim()).filter((l): l is string => Boolean(l));
  const planText = planLines.join("\n");
  const lowerText = work.text.toLowerCase();
  const planInDraft = planLines.every((l) => lowerText.includes(l.toLowerCase()));

  // Notes from the old Brainstorm step, split into single ideas that can be tapped into the plan.
  const ideas = [
    ...new Set(
      Object.values(work.notes)
        .flatMap((n) => n.split(/[\n,;·•]+/))
        .map((x) => x.trim())
        .filter((x) => x.length > 0 && x.length <= 80),
    ),
  ];
  const planLower = work.outline.join(" ").toLowerCase();

  function addIdea(idea: string) {
    const firstEmpty = task.outline.findIndex((_, i) => !work.outline[i]?.trim());
    const line = activeLine ?? (firstEmpty === -1 ? task.outline.length - 1 : firstEmpty);
    const outline = task.outline.map((_, i) => work.outline[i] ?? "");
    outline[line] = outline[line].trim() ? `${outline[line].trim()}, ${idea}` : idea;
    update({ outline });
  }

  /** Puts the plan at the top of the draft box (never deletes anything already written). */
  function copyPlanIn() {
    update({ text: work.text.trim() ? `${planText}\n\n${work.text}` : planText });
  }

  /** Moving to Write with an empty box copies the plan in, so the student edits it into sentences. */
  function goTo(next: Step, { force = false } = {}) {
    if (next === "Write" && !work.text.trim()) {
      if (hasOutline) {
        update({ text: planText });
      } else if (!force && !skippedPlan && !triesUsed) {
        setPlanNudge(true);
        setStep("Plan");
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    setPlanNudge(false);
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
          dictated: spokeInDraft,
        }),
      });
      const data = (await res.json()) as {
        feedback?: Feedback;
        at?: string;
        error?: string;
        code?: string;
        freeTriesLeft?: number | null;
      };
      if (data.code === "no_plan") setFreeLeft(0);
      if (!res.ok || !data.feedback) throw new Error(data.error ?? "Something went wrong.");
      if (typeof data.freeTriesLeft === "number") setFreeLeft(data.freeTriesLeft);
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

      {step === "Plan" && (
        <section className="space-y-3">
          {planNudge ? (
            <CoachSays title="Want to plan for 1 minute first?">
              <p className="text-slate-800">
                A quick plan makes writing much easier, and it gets copied into your writing box for you.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={startQuickPlan}
                  className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Quick plan
                </button>
                <button
                  type="button"
                  onClick={skipPlan}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  I know what to write →
                </button>
              </div>
            </CoachSays>
          ) : (
            <StepIntro
              n={1}
              title="Make a quick plan"
              speak={`Write a few words on each line. Not sentences. Think about: ${task.brainstorm.join(" ")}`}
            >
              <b>A few words</b> on each line — not sentences. It takes about a minute.
              <Example>Topic: the lake = my happy place · Detail: icy water in July</Example>
            </StepIntro>
          )}
          {task.brainstorm.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-700">🤔 Think about</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
                {task.brainstorm.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          {ideas.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-900">
                💡 Your ideas — tap one to add it to the {activeLine === null ? "next empty" : "selected"} line
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ideas.map((idea) => {
                  const used = planLower.includes(idea.toLowerCase());
                  return (
                    <button
                      key={idea}
                      type="button"
                      // Keep the cursor in the line the child picked.
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addIdea(idea)}
                      className={`rounded-full border px-3 py-1 text-sm transition ${
                        used
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-amber-300 bg-white text-slate-800 hover:bg-amber-100"
                      }`}
                    >
                      {used ? "✓ " : "+ "}
                      {idea}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {task.outline.map((label, i) => (
            <div key={label}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <label htmlFor={`${fieldId}-o${i}`} className="font-semibold text-slate-800">
                  {label}
                </label>
                {voice && <SpeechButton size="sm" onText={(t) => speakIntoLine(i, t)} />}
              </div>
              <input
                id={`${fieldId}-o${i}`}
                ref={i === 0 ? firstLineRef : undefined}
                className={`mt-1 w-full rounded-xl border-2 bg-white p-2.5 focus:border-indigo-500 focus:outline-none ${
                  activeLine === i ? "border-indigo-400" : "border-slate-200"
                }`}
                placeholder={ideas.length ? "Tap an idea above, or type a few words…" : "A few words…"}
                onFocus={() => setActiveLine(i)}
                value={work.outline[i] ?? ""}
                onChange={(e) => {
                  const outline = [...work.outline];
                  outline[i] = e.target.value;
                  update({ outline });
                }}
              />
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-end gap-3">
            {!hasOutline && !planNudge && (
              <button type="button" onClick={skipPlan} className="text-sm text-slate-500 underline hover:text-slate-700">
                Skip the plan
              </button>
            )}
            <button
              onClick={() => goTo("Write")}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Next: Write →
            </button>
          </div>
        </section>
      )}

      {step === "Write" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3">
            <StepIntro
              n={2}
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
            {hasOutline && !planInDraft && !triesUsed && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-sm">
                <span className="text-slate-800">📋 Your plan isn&apos;t in the box yet.</span>
                <button
                  type="button"
                  onClick={copyPlanIn}
                  className="rounded-full bg-indigo-600 px-4 py-1.5 font-semibold text-white hover:bg-indigo-700"
                >
                  Copy my plan in
                </button>
              </div>
            )}
            {voice && (
              <div className="flex flex-wrap items-start justify-between gap-2">
                <SpeechButton label="Speak my writing" onText={speakIntoDraft} />
                <span className="text-xs text-slate-500">Tip: say your sentences, then fix any wrong words and add full stops.</span>
              </div>
            )}
            <textarea
              ref={draftRef}
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
            {freeLeft !== null && !isAdmin && (
              <p className={`text-right text-xs ${freeLeft > 0 ? "text-amber-800" : "text-rose-700"}`}>
                {freeLeft > 0
                  ? `🎁 ${freeLeft} free ${freeLeft === 1 ? "try" : "tries"} left for your family`
                  : "🎁 Free tries used up. Ask a parent to start the family plan."}
              </p>
            )}
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
                    💪 Practise, then see it made better →
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
            n={3}
            title="Practise and improve"
            speak="First a quick practice on your own sentences. Your changes go straight into your draft. Then you'll see how your coach would make the whole piece stronger."
          >
            {latestFeedback ? (
              <>
                First a <b>quick practice</b> on your own sentences. Your changes go straight into your draft. Then
                you&apos;ll see the coach&apos;s version.
              </>
            ) : (
              <>Get feedback on your draft first. Then you&apos;ll see your sentences made even better here.</>
            )}
          </StepIntro>
          {latest && latestFeedback && (
            <ImprovedVersion
              feedback={latestFeedback}
              studentText={latest.text}
              practice={practice}
              onPractice={onPractice}
              applyToDraft={applyToDraft}
              voice={voice}
            />
          )}
          <div className="flex justify-end">
            <button
              onClick={() => goTo("Write")}
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
    <CoachSays title={`Step ${n} of ${STEPS.length} · ${title}`}>
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
