import type { Feedback } from "@/lib/feedback";
import { traitName } from "@/lib/traits";

export function ScoreBars({ traits }: { traits: Feedback["traits"] }) {
  return (
    <ul className="space-y-2">
      {traits.map((t) => (
        <li key={t.trait}>
          <div className="flex justify-between text-sm">
            <span className="font-medium">{traitName(t.trait)}</span>
            <span className="text-slate-500">{t.score}/5</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-indigo-500"
              style={{ width: `${(t.score / 5) * 100}%` }}
            />
          </div>
          {t.comment && <p className="mt-1 text-xs text-slate-600">{t.comment}</p>}
        </li>
      ))}
    </ul>
  );
}

export function FeedbackPanel({ feedback }: { feedback: Feedback }) {
  return (
    <div className="space-y-5">
      <p className="text-slate-800">{feedback.overall_comment}</p>

      {feedback.wellbeing_concern && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          If anything you wrote about is happening to you, please talk to a parent, teacher, or
          school counselor. You don&apos;t have to handle it alone.
        </div>
      )}

      {feedback.strengths.length > 0 && (
        <section>
          <h4 className="mb-2 font-semibold text-emerald-700">What&apos;s working</h4>
          <ul className="space-y-2">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="rounded-lg bg-emerald-50 p-3 text-sm">
                <q className="italic text-slate-700">{s.quote}</q>
                <p className="mt-1 text-slate-800">{s.comment}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h4 className="mb-2 font-semibold text-amber-700">Your next steps</h4>
        <ol className="space-y-2">
          {feedback.next_steps.map((n, i) => (
            <li key={i} className="rounded-lg bg-amber-50 p-3 text-sm">
              <p className="font-medium text-slate-900">
                {i + 1}. {n.focus}
              </p>
              {n.quote && <q className="mt-1 block italic text-slate-600">{n.quote}</q>}
              <p className="mt-1 text-slate-800">{n.suggestion}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
        <h4 className="text-sm font-semibold text-indigo-800">Think about this as you revise</h4>
        <p className="mt-1 text-sm text-indigo-950">{feedback.revision_question}</p>
      </section>

      <section>
        <h4 className="mb-2 font-semibold text-slate-700">Trait scores</h4>
        <ScoreBars traits={feedback.traits} />
      </section>
    </div>
  );
}
