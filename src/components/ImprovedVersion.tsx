"use client";

import type { Feedback } from "@/lib/feedback";
import { ReadAloud } from "./ReadAloud";

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

/** Before/after sentences and the coach's improved version of the whole piece. */
export function ImprovedVersion({ feedback, studentText }: { feedback: Partial<Feedback>; studentText: string }) {
  const makeovers = feedback.sentence_makeovers ?? [];
  const improved = feedback.improved_version;

  if (!improved && makeovers.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
        This feedback came before the improved version was added. Get feedback again to see one.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {makeovers.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold">✨ Sentence makeovers</h3>
          <ul className="space-y-3">
            {makeovers.map((m, i) => (
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
    </div>
  );
}
