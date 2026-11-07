"use client";

import Link from "next/link";
import { GENRE_LABELS, type Lesson } from "@/lib/lessons";
import type { Status } from "@/lib/proficiency";
import { ProficiencyBadge } from "./ProficiencyBadge";

export function LessonCard({ lesson, status, locked = false }: { lesson: Lesson; status?: Status; locked?: boolean }) {
  const body = (
    <>
      <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
        {GENRE_LABELS[lesson.genre]} · {lesson.minutes} min
      </span>
      <h3 className="mt-1 text-lg font-bold">
        {locked && <span aria-hidden>🔒 </span>}
        {lesson.title}
      </h3>
      <p className="mt-1 flex-1 text-sm text-slate-600">{lesson.summary}</p>
      {status && !locked && (
        <span className="mt-3">
          <ProficiencyBadge status={status} />
        </span>
      )}
    </>
  );

  if (locked) {
    return (
      <div className="flex flex-col rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 opacity-70" aria-disabled>
        {body}
      </div>
    );
  }
  return (
    <Link
      href={`/lessons/${lesson.slug}`}
      className="flex flex-col rounded-3xl border-2 border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
    >
      {body}
    </Link>
  );
}
