"use client";

import { useState } from "react";
import type { Feedback } from "@/lib/feedback";
import { findWord, isFixed, replaceOnce, swapWord } from "@/lib/practice";
import { ReadAloud } from "./ReadAloud";
import { joinSpoken, SpeechButton } from "./SpeechButton";

type Token = { text: string; added: boolean };

/** Marks the words in `after` that aren't in `before` (word-level LCS). */
function diffWords(before: string, after: string): Token[] {
  // Each token is a word plus the spaces after it, so spacing and line breaks are kept.
  const a = before.match(/\S+\s*/g) ?? [];
  const b = after.match(/\S+\s*/g) ?? [];
  const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
  // Guard against very long texts (the API caps input at 8000 chars, so this is generous).
  if (a.length * b.length > 4_000_000) return [{ text: after, added: false }];
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = norm(a[i]) === norm(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: Token[] = [];
  let i = 0;
  let j = 0;
  while (j < b.length) {
    if (i < a.length && norm(a[i]) === norm(b[j])) {
      out.push({ text: b[j], added: false });
      i++;
      j++;
    } else if (i < a.length && dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      out.push({ text: b[j], added: norm(b[j]) !== "" });
      j++;
    }
  }
  return out;
}

function Highlighted({ before, after }: { before: string; after: string }) {
  // Merge neighbouring changed words into one highlight; keep the trailing space outside it.
  const runs: Token[] = [];
  for (const t of diffWords(before, after)) {
    const last = runs.at(-1);
    if (last && last.added === t.added) last.text += t.text;
    else runs.push({ ...t });
  }
  return (
    <>
      {runs.map((r, k) => {
        if (!r.added) return <span key={k}>{r.text}</span>;
        const word = r.text.trimEnd();
        return (
          <span key={k}>
            <mark className="rounded bg-emerald-100 px-0.5 text-emerald-950">{word}</mark>
            {r.text.slice(word.length)}
          </span>
        );
      })}
    </>
  );
}

/** Stops casual copy-paste so students make the changes in their own words. */
const noCopy = {
  onCopy: (e: React.ClipboardEvent) => e.preventDefault(),
  onCut: (e: React.ClipboardEvent) => e.preventDefault(),
  className: "select-none",
};

/** What the student has done in the practice for one round of feedback. */
export interface PracticeState {
  /** Which feedback (draft time) this practice belongs to. */
  at: string;
  swaps: Record<number, { choice: string; sentence: string }>;
  /** Grammar fixes: what the student typed, and whether they fixed it or asked to be shown. */
  grammar: Record<number, { attempt: string; status: "trying" | "fixed" | "shown"; wrong?: boolean }>;
  attempt: string;
  revealed: boolean;
  usedAttempt: boolean;
  skipped: boolean;
}

export const emptyPractice = (at: string): PracticeState => ({
  at,
  swaps: {},
  grammar: {},
  attempt: "",
  revealed: false,
  usedAttempt: false,
  skipped: false,
});

/** Changes the draft; returns false if the change no longer fits (the student edited that part). */
export type ApplyToDraft = (change: (text: string) => string | null) => boolean;

const countWords = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

/** Practice first (word swaps, then fix one sentence yourself), then the coach's version unlocks. */
export function ImprovedVersion({
  feedback,
  studentText,
  practice,
  onPractice,
  applyToDraft,
  voice = false,
}: {
  feedback: Partial<Feedback>;
  studentText: string;
  practice: PracticeState;
  onPractice: (patch: Partial<PracticeState>) => void;
  applyToDraft: ApplyToDraft;
  voice?: boolean;
}) {
  const makeovers = feedback.sentence_makeovers ?? [];
  const swaps = feedback.word_swaps ?? [];
  const fixes = feedback.grammar_fixes ?? [];
  const improved = feedback.improved_version;
  const [tryFirst, ...moreMakeovers] = makeovers;
  const grammar = practice.grammar ?? {};

  if (!improved && makeovers.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
        This feedback came before the improved version was added. Get feedback again to see one.
      </p>
    );
  }

  const hasPractice = fixes.length > 0 || swaps.length > 0 || Boolean(tryFirst);
  const practiceDone =
    practice.skipped ||
    (fixes.every((_, i) => grammar[i] && grammar[i].status !== "trying") &&
      swaps.every((_, i) => practice.swaps[i]) &&
      (!tryFirst || practice.revealed));
  const unlocked = !hasPractice || practiceDone;

  return (
    <div className="space-y-5">
      {hasPractice && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">💪 Quick practice</h3>
            {!practiceDone && (
              <button
                type="button"
                onClick={() => onPractice({ skipped: true })}
                className="text-sm text-slate-500 underline hover:text-slate-700"
              >
                Skip practice
              </button>
            )}
          </div>
          {fixes.map((g, i) => (
            <GrammarFix
              key={`g${i}`}
              fix={g}
              state={grammar[i]}
              applyToDraft={applyToDraft}
              onChange={(s) => onPractice({ grammar: { ...grammar, [i]: s } })}
            />
          ))}
          {swaps.map((s, i) => (
            <WordSwap
              key={i}
              swap={s}
              done={practice.swaps[i]}
              applyToDraft={applyToDraft}
              onDone={(d) => onPractice({ swaps: { ...practice.swaps, [i]: d } })}
            />
          ))}
          {tryFirst && (
            <TryItFirst
              makeover={tryFirst}
              practice={practice}
              onPractice={onPractice}
              applyToDraft={applyToDraft}
              voice={voice}
            />
          )}
        </section>
      )}

      {!unlocked ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 p-5 text-center text-slate-600">
          🔒 Finish the practice to see the coach&apos;s version of your whole piece.
        </div>
      ) : (
        <>
          {moreMakeovers.length > 0 && (
            <section>
              <h3 className="mb-2 font-semibold">✨ More sentence makeovers</h3>
              <ul className="space-y-3">
                {moreMakeovers.map((m, i) => (
                  <li key={i} className="rounded-3xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">You wrote</p>
                    <p className="mt-1 text-slate-700">{m.before}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">Even better</p>
                    <p {...noCopy} className={`${noCopy.className} mt-1 text-slate-900`}>
                      <Highlighted before={m.before} after={m.after} />
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-slate-600">💡 {m.why}</p>
                      <ReadAloud text={`You wrote: ${m.before} Even better: ${m.after}`} label="Hear both" />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {improved && (
            <section>
              <h3 className="mb-1 font-semibold">📝 Your whole piece, made stronger</h3>
              <p className="mb-2 text-sm text-slate-600">
                <mark className="rounded bg-emerald-100 px-0.5">Green words</mark> are the coach&apos;s changes.
              </p>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Yours</p>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{studentText}</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Coach&apos;s version</p>
                    <ReadAloud text={improved} label="Hear it" />
                  </div>
                  <div
                    {...noCopy}
                    className={`${noCopy.className} mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-900`}
                  >
                    <Highlighted before={studentText} after={improved} />
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** The sentence with the swappable word picked out. */
function SentenceWithWord({ sentence, word }: { sentence: string; word: string }) {
  const found = findWord(sentence, word);
  if (!found) return <>{sentence}</>;
  return (
    <>
      {sentence.slice(0, found.index)}
      <b className="rounded bg-amber-100 px-1 text-amber-950">{found.text}</b>
      {sentence.slice(found.index + found.text.length)}
    </>
  );
}

function WordSwap({
  swap,
  done,
  applyToDraft,
  onDone,
}: {
  swap: NonNullable<Feedback["word_swaps"]>[number];
  done?: { choice: string; sentence: string };
  applyToDraft: ApplyToDraft;
  onDone: (d: { choice: string; sentence: string }) => void;
}) {
  const [missing, setMissing] = useState(false);
  const sentence = done?.sentence ?? swap.sentence;
  const word = done?.choice ?? swap.word;

  function pick(choice: string) {
    const next = swapWord(sentence, word, choice);
    if (next === null || !applyToDraft((t) => replaceOnce(t, sentence, next))) {
      setMissing(true);
      return;
    }
    setMissing(false);
    onDone({ choice, sentence: next });
  }

  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-semibold text-slate-900">
          {done ? "✓ " : "🔤 "}Pick a stronger word for <q>{swap.word}</q>
        </p>
        <ReadAloud
          text={`${swap.sentence} Pick a stronger word for ${swap.word}: ${swap.options.join(", ")}.`}
          label="Hear it"
        />
      </div>
      <p className="mt-2 text-slate-800">
        <SentenceWithWord sentence={sentence} word={word} />
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {swap.options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => pick(o)}
            aria-pressed={done?.choice === o}
            className={`rounded-full border px-3 py-1 font-medium transition ${
              done?.choice === o
                ? "border-emerald-500 bg-emerald-600 text-white"
                : "border-amber-300 bg-white text-slate-800 hover:bg-amber-100"
            }`}
          >
            {o}
          </button>
        ))}
        <button
          type="button"
          onClick={() => pick(swap.word)}
          aria-pressed={done?.choice === swap.word}
          className={`rounded-full border px-3 py-1 text-sm transition ${
            done?.choice === swap.word
              ? "border-slate-500 bg-slate-600 text-white"
              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          }`}
        >
          Keep <q>{swap.word}</q>
        </button>
      </div>
      {done && !missing && (
        <p className="mt-2 text-sm text-slate-600">
          {done.choice === swap.word ? "Okay, your word stays." : <>✓ Changed in your draft. 💡 {swap.why}</>}
        </p>
      )}
      {missing && (
        <p className="mt-2 text-sm text-rose-700">
          You&apos;ve changed that sentence already. Make the swap in your draft yourself if you like it.
        </p>
      )}
    </div>
  );
}

/** "Find and fix the mistake": the student edits their own sentence, then checks it. */
function GrammarFix({
  fix,
  state,
  applyToDraft,
  onChange,
}: {
  fix: Feedback["grammar_fixes"][number];
  state?: PracticeState["grammar"][number];
  applyToDraft: ApplyToDraft;
  onChange: (s: PracticeState["grammar"][number]) => void;
}) {
  const [missing, setMissing] = useState(false);
  const attempt = state?.attempt ?? fix.sentence;
  const status = state?.status ?? "trying";
  const corrected = replaceOnce(fix.sentence, fix.mistake, fix.fix) ?? fix.sentence;

  function put(sentence: string, next: "fixed" | "shown") {
    const ok = applyToDraft((t) => replaceOnce(t, fix.sentence, sentence));
    setMissing(!ok);
    onChange({ attempt, status: next });
  }

  function check() {
    if (isFixed(attempt, fix.mistake, fix.fix)) put(attempt.trim(), "fixed");
    else onChange({ attempt, status: "trying", wrong: true });
  }

  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-semibold text-slate-900">{status === "trying" ? "🔍 " : "✓ "}Find and fix the mistake</p>
        <ReadAloud text={`${fix.sentence} Tip: ${fix.hint}`} label="Hear it" />
      </div>
      <p className="mt-2 text-slate-700">{fix.sentence}</p>
      <p className="mt-2 text-sm font-medium text-rose-900">💡 {fix.hint}</p>

      {status === "trying" ? (
        <>
          <textarea
            aria-label="Your fixed sentence"
            className="mt-3 w-full rounded-xl border-2 border-slate-200 bg-white p-2.5 focus:border-rose-400 focus:outline-none"
            rows={2}
            value={attempt}
            onChange={(e) => onChange({ attempt: e.target.value, status: "trying" })}
          />
          {state?.wrong && (
            <p className="mt-1 text-sm text-rose-700">Not quite yet. Read it again slowly, then try once more.</p>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => put(corrected, "shown")}
              className="text-sm text-slate-500 underline hover:text-slate-700"
            >
              I&apos;m stuck, show me
            </button>
            <button
              type="button"
              disabled={attempt.trim() === fix.sentence.trim()}
              onClick={check}
              className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Check my fix
            </button>
          </div>
        </>
      ) : (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-white p-3">
          <p className="text-sm font-semibold text-emerald-800">
            {status === "fixed" ? "🎉 You fixed it!" : "Here's the fix:"}
          </p>
          <p className="mt-1 text-slate-900">{status === "fixed" ? attempt : corrected}</p>
          {/* Shown separately because the word highlight ignores capitals and punctuation. */}
          <p className="mt-2 text-sm">
            <s className="text-rose-700">{fix.mistake}</s> →{" "}
            <b className="rounded bg-emerald-100 px-1 text-emerald-950">{fix.fix}</b>
          </p>
          <p className="mt-1 text-sm text-slate-600">💡 {fix.why}</p>
          {!missing && <p className="mt-1 text-sm text-emerald-800">✓ Fixed in your draft.</p>}
        </div>
      )}
      {missing && (
        <p className="mt-2 text-sm text-rose-700">
          That sentence has changed in your draft. Make the fix there yourself.
        </p>
      )}
    </div>
  );
}

function TryItFirst({
  makeover,
  practice,
  onPractice,
  applyToDraft,
  voice,
}: {
  makeover: Feedback["sentence_makeovers"][number];
  practice: PracticeState;
  onPractice: (patch: Partial<PracticeState>) => void;
  applyToDraft: ApplyToDraft;
  voice: boolean;
}) {
  const [missing, setMissing] = useState(false);
  const hint = makeover.hint || "Make this sentence stronger. Add a detail.";
  const [pending, setPending] = useState(""); // spoken words still being recognised
  const attempt = practice.attempt;
  const tried = countWords(attempt) >= 3 && attempt.trim() !== makeover.before.trim();

  function useMine() {
    if (!applyToDraft((t) => replaceOnce(t, makeover.before, attempt.trim()))) {
      setMissing(true);
      return;
    }
    onPractice({ usedAttempt: true });
  }

  return (
    <div className="rounded-3xl border border-indigo-200 bg-indigo-50/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-semibold text-slate-900">✏️ Fix this sentence yourself</p>
        <ReadAloud text={`${makeover.before} Tip: ${hint}`} label="Hear it" />
      </div>
      <p className="mt-2 text-slate-700">{makeover.before}</p>
      <p className="mt-2 text-sm font-medium text-indigo-900">💡 {hint}</p>

      {!practice.revealed ? (
        <>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-700">Your better sentence</span>
            {voice && (
              <SpeechButton
                size="sm"
                onText={(t) => onPractice({ attempt: joinSpoken(practice.attempt, t).text })}
                onInterim={(p) => setPending(p ?? "")}
              />
            )}
          </div>
          <textarea
            aria-label="Your better sentence"
            className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white p-2.5 focus:border-indigo-500 focus:outline-none"
            rows={2}
            placeholder="Write your new sentence here…"
            value={pending ? joinSpoken(attempt, pending).text : attempt}
            onChange={(e) => onPractice({ attempt: e.target.value })}
            readOnly={Boolean(pending)}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onPractice({ revealed: true })}
              className="text-sm text-slate-500 underline hover:text-slate-700"
            >
              I&apos;m stuck, show me
            </button>
            <button
              type="button"
              disabled={!tried}
              onClick={() => onPractice({ revealed: true })}
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Compare with the coach →
            </button>
          </div>
        </>
      ) : (
        <div className="mt-3 space-y-3">
          {attempt.trim() && (
            <div className="rounded-2xl bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Yours</p>
              <p className="mt-1 text-slate-900">{attempt}</p>
            </div>
          )}
          <div className="rounded-2xl border border-emerald-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Coach&apos;s</p>
            <p {...noCopy} className={`${noCopy.className} mt-1 text-slate-900`}>
              <Highlighted before={makeover.before} after={makeover.after} />
            </p>
            <p className="mt-1 text-sm text-slate-600">💡 {makeover.why}</p>
          </div>
          {attempt.trim() &&
            (practice.usedAttempt ? (
              <p className="text-sm text-emerald-800">✓ Your sentence is in your draft.</p>
            ) : (
              <button
                type="button"
                onClick={useMine}
                className="rounded-full border border-indigo-300 bg-white px-4 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                Put my sentence in my draft
              </button>
            ))}
          {missing && (
            <p className="text-sm text-rose-700">
              That sentence has changed in your draft. Put your new one in yourself.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
