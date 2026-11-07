"use client";

import { useState } from "react";
import { MAX_TRIES } from "@/lib/feedback";
import { saveWork, useAllWorkMap, useAuthStatus } from "@/lib/storage";
import { WritingStudio, type StudioTask } from "./WritingStudio";

/** Piece 1 keeps the original key so existing work is preserved. */
export function pieceKey(slug: string, n: number) {
  return n === 1 ? `lesson:${slug}` : `lesson:${slug}:${n}`;
}

export function piecesFor(slug: string, keys: string[]): number[] {
  const ns = keys.flatMap((k) => {
    if (k === `lesson:${slug}`) return [1];
    const m = k.match(new RegExp(`^lesson:${slug}:(\\d+)$`));
    return m ? [Number(m[1])] : [];
  });
  return [...new Set(ns)].sort((a, b) => a - b);
}

type BaseTask = Omit<StudioTask, "id" | "prompt" | "title" | "lessonSlug"> & {
  lessonSlug: string;
  lessonTitle: string;
};

/**
 * Lets a student practise one lesson's skill on several pieces of writing,
 * each on its own topic with its own tries. Earlier pieces stay viewable.
 */
export function LessonPractice({ base, topics }: { base: BaseTask; topics: string[] }) {
  const works = useAllWorkMap();
  const auth = useAuthStatus();
  const slug = base.lessonSlug;
  const pieces = piecesFor(slug, Object.keys(works));
  const latest = pieces.length ? pieces[pieces.length - 1] : 1;

  const [selected, setSelected] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [ownTopic, setOwnTopic] = useState("");

  const n = selected !== null && pieces.includes(selected) ? selected : latest;
  const key = pieceKey(slug, n);
  const work = works[key];
  const latestWork = works[pieceKey(slug, latest)];
  const canStartNew = auth === "ready" && (latestWork?.drafts.length ?? 0) > 0;
  const usedPrompts = new Set(pieces.map((p) => works[pieceKey(slug, p)]?.prompt));

  const task: StudioTask = {
    ...base,
    id: key,
    lessonSlug: slug,
    title: n === 1 ? base.lessonTitle : `${base.lessonTitle} · piece ${n}`,
    prompt: work?.prompt || topics[0],
  };

  function startNew(prompt: string) {
    const next = latest + 1;
    saveWork({
      id: pieceKey(slug, next),
      lessonSlug: slug,
      title: `${base.lessonTitle} · piece ${next}`,
      prompt,
      genre: base.genre,
      notes: {},
      outline: base.outline.map(() => ""),
      text: "",
      checked: [],
      drafts: [],
      updatedAt: "",
    });
    setSelected(null);
    setPicking(false);
    setOwnTopic("");
  }

  return (
    <div className="space-y-4">
      {auth === "ready" && (pieces.length > 1 || canStartNew) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
          {pieces.length > 1 ? (
            <nav className="flex flex-wrap gap-1" aria-label="Your pieces for this lesson">
              {pieces.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelected(p)}
                  aria-current={p === n ? "page" : undefined}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    p === n ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Piece {p}
                  {p === latest && p !== n ? " (latest)" : ""}
                </button>
              ))}
            </nav>
          ) : (
            <p className="text-sm text-slate-600">Want more practice with this skill?</p>
          )}
          {canStartNew && (
            <button
              onClick={() => setPicking((v) => !v)}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-800 hover:bg-indigo-100"
            >
              {picking ? "Cancel" : "+ Practise with a new topic"}
            </button>
          )}
        </div>
      )}

      {picking && (
        <div className="rounded-xl border border-indigo-200 bg-white p-4">
          <h3 className="font-semibold">Choose a topic for piece {latest + 1}</h3>
          <p className="mb-3 text-sm text-slate-600">
            Same skill, new topic. You&apos;ll get {MAX_TRIES} fresh tries, and your earlier pieces stay saved.
          </p>
          <ul className="space-y-2">
            {topics.map((t) => {
              const used = usedPrompts.has(t);
              return (
                <li key={t}>
                  <button
                    onClick={() => startNew(t)}
                    className="w-full rounded-lg border border-slate-200 p-3 text-left text-sm hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    {t}
                    {used && <span className="ml-2 text-xs text-slate-500">(you&apos;ve written this one)</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const t = ownTopic.trim();
              if (t) startNew(`Use the “${base.lessonTitle}” skill to write about: ${t}`);
            }}
          >
            <input
              className="min-w-0 flex-1 rounded-lg border border-slate-300 p-2 text-sm"
              placeholder="Or type your own topic, e.g. my grandpa's garden"
              maxLength={150}
              value={ownTopic}
              onChange={(e) => setOwnTopic(e.target.value)}
            />
            <button
              disabled={!ownTopic.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Use my topic
            </button>
          </form>
        </div>
      )}

      {n !== latest && (
        <p className="rounded-lg bg-slate-100 p-2 text-sm text-slate-700">
          You&apos;re looking at piece {n}.{" "}
          <button onClick={() => setSelected(null)} className="font-medium text-indigo-700 hover:underline">
            Go to your latest piece
          </button>
        </p>
      )}

      <WritingStudio key={task.id} task={task} />
    </div>
  );
}
