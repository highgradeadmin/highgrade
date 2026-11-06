"use client";

import Link from "next/link";
import { GENRE_LABELS, type Lesson } from "@/lib/lessons";
import { useWork } from "@/lib/storage";

export function LessonCard({ lesson }: { lesson: Lesson }) {
  const work = useWork(`lesson:${lesson.slug}`);
  const status = work?.drafts.length ? "Feedback received" : work?.text ? "In progress" : null;

  return (
    <Link
      href={`/lessons/${lesson.slug}`}
      className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
        {GENRE_LABELS[lesson.genre]} · {lesson.minutes} min
      </span>
      <h3 className="mt-1 font-semibold">{lesson.title}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-600">{lesson.summary}</p>
      {status && <span className="mt-3 text-xs font-medium text-emerald-700">✓ {status}</span>}
    </Link>
  );
}
