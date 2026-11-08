"use client";

import { useState } from "react";
import type { Draft } from "@/lib/storage";
import { TRAITS } from "@/lib/traits";
import { FeedbackPanel } from "./FeedbackPanel";

function scoreOf(d: Draft, trait: string) {
  return d.feedback?.traits.find((t) => t.trait === trait)?.score ?? null;
}

export function averageScore(d: Draft): number | null {
  const s = d.feedback?.traits.map((t) => t.score) ?? [];
  return s.length ? s.reduce((a, b) => a + b, 0) / s.length : null;
}

function Delta({ value }: { value: number | null }) {
  if (value === null || Math.abs(value) < 0.05) return null;
  const up = value > 0;
  return (
    <span
      className={`ml-1 text-xs font-semibold ${up ? "text-emerald-600" : "text-rose-600"}`}
    >
      {up ? "▲" : "▼"}
      {Math.abs(value) % 1 === 0 ? Math.abs(value) : Math.abs(value).toFixed(1)}
    </span>
  );
}

/** Every saved draft of one piece of writing, newest first, with scores and changes. */
export function DraftHistory({
  drafts,
  scoresOnly = false,
}: {
  drafts: Draft[];
  scoresOnly?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (drafts.length === 0) {
    return (
      <p className="text-sm text-slate-500">No feedback yet for this piece.</p>
    );
  }

  const newestFirst = drafts.map((d, i) => ({ d, i })).reverse();

  return (
    <ol className="space-y-3">
      {newestFirst.map(({ d, i }) => {
        const prev = i > 0 ? drafts[i - 1] : null;
        const avg = averageScore(d);
        const prevAvg = prev ? averageScore(prev) : null;
        const open = openIndex === i;
        return (
          <li
            key={d.at || i}
            className="rounded-lg border border-slate-200 p-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">
                Draft {i + 1}
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {d.at
                    ? new Date(d.at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : ""}
                </span>
              </p>
              {avg !== null && (
                <p className="text-sm">
                  Average <b>{avg.toFixed(1)}</b>/5
                  <Delta value={prevAvg !== null ? avg - prevAvg : null} />
                </p>
              )}
            </div>

            <ul className="mt-2 flex flex-wrap gap-1.5">
              {TRAITS.map((t) => {
                const s = scoreOf(d, t.id);
                const p = prev ? scoreOf(prev, t.id) : null;
                return (
                  <li
                    key={t.id}
                    className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                  >
                    {t.name} <b>{s ?? "–"}</b>
                    <Delta value={s !== null && p !== null ? s - p : null} />
                  </li>
                );
              })}
            </ul>

            {!scoresOnly && (
              <button
                onClick={() => setOpenIndex(open ? null : i)}
                className="mt-2 text-sm font-medium text-indigo-700 hover:underline"
              >
                {open ? "Hide" : "View draft & feedback"}
              </button>
            )}

            {open && !scoresOnly && (
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <div className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-relaxed text-slate-800">
                  {d.text}
                </div>
                {d.feedback && (
                  <div className="text-sm">
                    <FeedbackPanel feedback={d.feedback} />
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
