import type { Walkthrough } from "@/lib/walkthroughs";

/** Shows how brainstorm notes → plan → full draft, with what changed. */
export function PlanToDraftExample({ example, defaultOpen }: { example: Walkthrough; defaultOpen: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
      <summary className="cursor-pointer font-medium text-amber-900">
        See an example: from plan to draft{" "}
        <span className="font-normal text-amber-700">— “{example.topic}”</span>
      </summary>

      <ol className="mt-3 space-y-3">
        <li>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">1 · Brainstorm notes</p>
          <p className="mt-1 flex flex-wrap gap-1">
            {example.brainstorm.map((b) => (
              <span
                key={b}
                className={`rounded px-1.5 py-0.5 text-xs ${
                  example.leftOut.includes(b) ? "bg-white text-slate-400 line-through" : "bg-white text-slate-800"
                }`}
              >
                {b}
              </span>
            ))}
          </p>
          {example.leftOut.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">Crossed-out ideas weren&apos;t used — choosing is part of writing.</p>
          )}
        </li>
        <li>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">2 · Plan (short notes)</p>
          <ul className="mt-1 space-y-0.5 text-slate-800">
            {example.outline.map((o) => (
              <li key={o.label}>
                <span className="text-slate-500">{o.label}:</span> {o.text}
              </li>
            ))}
          </ul>
        </li>
        <li>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">3 · Draft (full sentences)</p>
          <div className="mt-1 space-y-2 rounded-md bg-white p-3 leading-relaxed text-slate-800">
            {example.draft.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </li>
        <li>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">What changed from plan to draft</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
            {example.changes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </li>
      </ol>
      <p className="mt-3 text-xs text-amber-800">
        Use this to see <b>how</b> — then write about <b>your own</b> topic in your own words.
        This example is kept short so it&apos;s quick to read; aim for the word target on your task.
      </p>
    </details>
  );
}
