"use client";

import { useEffect, useState } from "react";
import { CoachOwl } from "./Coach";

// What the coach is "doing" while feedback is on its way (feedback usually takes 10-20 seconds).
const STAGES = [
  { at: 0, text: "Reading your writing…" },
  { at: 3, text: "Looking at your ideas…" },
  { at: 6, text: "Finding what's working…" },
  { at: 9, text: "Choosing what to fix next…" },
  { at: 12, text: "Making your sentences even better…" },
  { at: 17, text: "Almost done…" },
  { at: 28, text: "Still working — thanks for waiting!" },
];

/** Friendly progress while the coach writes feedback. The bar slows down as it nears the end. */
export function FeedbackLoading() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setSeconds((Date.now() - start) / 1000), 250);
    return () => clearInterval(timer);
  }, []);

  // Fills about 80% by ~13s, then creeps towards 95% so it never "finishes" before the answer arrives.
  const pct = Math.round(95 * (1 - Math.exp(-seconds / 8)));
  const stage = [...STAGES].reverse().find((s) => seconds >= s.at) ?? STAGES[0];

  return (
    <div className="rounded-3xl border-2 border-indigo-200 bg-white p-5" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <CoachOwl className="h-14 w-14 shrink-0 motion-safe:animate-bounce" />
        <div className="min-w-0">
          <p className="font-bold text-slate-900">Your coach is reading…</p>
          <p className="text-slate-600">{stage.text}</p>
        </div>
      </div>
      <div
        className="mt-4 h-4 overflow-hidden rounded-full bg-indigo-100"
        role="progressbar"
        aria-label="Getting your feedback"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div
          className="h-4 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-300 ease-out"
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>
      <p className="mt-2 text-right text-xs text-slate-500">This usually takes about 15 seconds.</p>
    </div>
  );
}
