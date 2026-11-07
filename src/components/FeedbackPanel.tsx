import type { Feedback } from "@/lib/feedback";
import { traitName } from "@/lib/traits";
import { CoachSays } from "./Coach";
import { ReadAloud } from "./ReadAloud";

export function ScoreBars({ traits, showComments = false }: { traits: Feedback["traits"]; showComments?: boolean }) {
  return (
    <ul className="space-y-2">
      {traits.map((t) => (
        <li key={t.trait}>
          <div className="flex justify-between text-sm">
            <span className="font-medium">{traitName(t.trait)}</span>
            <span className="text-slate-500">{t.score}/5</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${(t.score / 5) * 100}%` }} />
          </div>
          {showComments && t.comment && <p className="mt-1 text-xs text-slate-600">{t.comment}</p>}
        </li>
      ))}
    </ul>
  );
}

/** Short, kid-sized feedback: one line overall, what works, what to fix, scores. */
export function FeedbackPanel({ feedback }: { feedback: Feedback }) {
  const speech = [
    feedback.overall_comment,
    "Fix next.",
    ...feedback.next_steps.map((n) => `${n.focus}. ${n.suggestion}`),
    "What's working.",
    ...feedback.strengths.map((s) => s.comment),
  ].join(" ");
  return (
    <div className="space-y-4">
      <CoachSays>
        <p>{feedback.overall_comment}</p>
        <div className="mt-2">
          <ReadAloud text={speech} label="Read my feedback" />
        </div>
      </CoachSays>

      {feedback.wellbeing_concern && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          If anything you wrote about is happening to you, please talk to a parent, teacher, or
          school counselor. You don&apos;t have to handle it alone.
        </div>
      )}

      <section>
        <h4 className="mb-2 font-semibold text-amber-800">🔧 Fix next</h4>
        <ol className="space-y-2">
          {feedback.next_steps.map((n, i) => (
            <li key={i} className="rounded-2xl bg-amber-50 p-3">
              <p className="font-semibold text-slate-900">{n.focus}</p>
              {n.quote && <q className="mt-1 block italic text-slate-600">{n.quote}</q>}
              <p className="mt-1 text-slate-800">{n.suggestion}</p>
            </li>
          ))}
        </ol>
      </section>

      {feedback.strengths.length > 0 && (
        <section>
          <h4 className="mb-2 font-semibold text-emerald-800">⭐ What&apos;s working</h4>
          <ul className="space-y-2">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="rounded-2xl bg-emerald-50 p-3">
                <q className="italic text-slate-700">{s.quote}</q>
                <p className="mt-1 text-slate-800">{s.comment}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="rounded-2xl border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">Scores</summary>
        <div className="mt-3">
          <ScoreBars traits={feedback.traits} showComments />
        </div>
      </details>
    </div>
  );
}
