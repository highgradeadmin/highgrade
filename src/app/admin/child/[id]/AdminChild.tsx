"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProficiencyBadge } from "@/components/ProficiencyBadge";
import { ProgressView, type ProgressPiece } from "@/components/ProgressView";
import type { Feedback } from "@/lib/feedback";
import { levelProgress, type PieceLike } from "@/lib/proficiency";
import { useAuthStatus, useIsAdmin } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

/** What admin_child_progress returns: scores only, never the child's writing. */
interface AdminChildProgress {
  child_id: string;
  name: string;
  grade: number;
  level: string;
  created_at: string;
  family_email: string | null;
  pieces: {
    task_key: string;
    lesson_slug: string | null;
    title: string;
    updated_at: string;
    words: number;
    tries: { at: string; traits: { trait: string; score: unknown }[] }[];
  }[];
}

export function AdminChild() {
  const { id } = useParams<{ id: string }>();
  const status = useAuthStatus();
  const isAdmin = useIsAdmin();
  const [child, setChild] = useState<AdminChildProgress | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin || !id) return;
    let cancelled = false;
    createClient()
      .rpc("admin_child_progress", { p_child: id })
      .then(({ data, error }) => {
        if (cancelled) return;
        setError(error ? error.message : null);
        setChild(error ? null : ((data as AdminChildProgress | null) ?? null));
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, id]);

  const back = (
    <Link href="/admin" className="text-sm font-medium text-indigo-700 hover:underline">
      ← All families
    </Link>
  );

  if (status === "loading" || (isAdmin && child === undefined && !error)) {
    return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;
  }
  if (!isAdmin) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-700">
        This page is only for admins.
      </p>
    );
  }
  if (error || !child) {
    return (
      <div className="space-y-4">
        {back}
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error ? `Couldn't load progress: ${error}` : "Child not found. They may have been removed by their parent."}
        </p>
      </div>
    );
  }

  // Shape the scores like the child's own progress page (no writing: text stays empty).
  const pieces: ProgressPiece[] = child.pieces.map((p) => ({
    id: p.task_key,
    lessonSlug: p.lesson_slug,
    title: p.title || p.task_key,
    updatedAt: p.updated_at,
    words: p.words,
    drafts: p.tries.map((t) => ({
      text: "",
      at: t.at,
      feedback: { traits: t.traits.map((x) => ({ trait: x.trait, score: Number(x.score), comment: "" })) } as unknown as Feedback,
    })),
  }));
  const works: Record<string, PieceLike> = Object.fromEntries(pieces.map((p) => [p.id, { drafts: p.drafts }]));
  const lessons = levelProgress(child.level, works);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {back}
        <p className="text-sm text-slate-500">
          {child.family_email} · joined {new Date(child.created_at).toLocaleDateString()}
        </p>
      </div>

      <ProgressView name={child.name} grade={child.grade} pieces={pieces} admin />

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">
          Lessons at level {child.level}
          {lessons.total > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-600">
              {lessons.proficient} of {lessons.total} proficient
            </span>
          )}
        </h2>
        {lessons.total > 0 ? (
          <ul className="mt-3 divide-y divide-slate-100">
            {lessons.results.map((r) => (
              <li key={r.lesson.slug} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  {r.lesson.title}
                  {r.toImprove.length > 0 && (
                    <span className="block text-xs text-slate-500">Still working on: {r.toImprove.join(", ")}</span>
                  )}
                </span>
                <ProficiencyBadge status={r.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No lessons at this level yet.</p>
        )}
      </section>
    </div>
  );
}
