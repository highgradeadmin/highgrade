"use client";

import { DAILY_TARGET_WORDS, asLevel, getDailyPrompt } from "@/lib/daily-prompts";
import type { Genre } from "@/lib/lessons";
import { useLocalDay } from "@/lib/local-day";
import { useActiveChild, useWork } from "@/lib/storage";
import { GENRE_WALKTHROUGHS } from "@/lib/walkthroughs";
import { ReadAloud } from "./ReadAloud";
import { WritingStudio } from "./WritingStudio";

const GUIDES: Record<Genre, { brainstorm: string[]; outline: string[]; checklist: string[] }> = {
  narrative: {
    brainstorm: ["Who is in the story and where?", "What is the key moment?", "What senses and feelings can you show?"],
    outline: ["Hook", "Build-up", "Key moment", "Ending"],
    checklist: ["My opening hooks the reader.", "I showed feelings instead of naming them.", "Events are in a clear order.", "My ending feels finished."],
  },
  persuasive: {
    brainstorm: ["What is your opinion or claim?", "What are your strongest reasons?", "What would someone who disagrees say?"],
    outline: ["Claim", "Reason 1 + evidence", "Reason 2 + evidence", "Counterclaim + response", "Conclusion"],
    checklist: ["My claim is clear and arguable.", "Each reason has evidence or an example.", "I explained why my evidence matters.", "I used transition words."],
  },
  informative: {
    brainstorm: ["What exactly will you explain?", "What does a reader need to know first?", "What facts or examples will help?"],
    outline: ["Introduction", "Main point 1", "Main point 2", "Conclusion"],
    checklist: ["A reader new to this topic could follow it.", "I used precise words and examples.", "My ideas are in a logical order.", "I have an intro and a conclusion."],
  },
  paragraph: {
    brainstorm: ["What is your main idea?", "What details support it?"],
    outline: ["Topic sentence", "Supporting details", "Closing sentence"],
    checklist: ["My topic sentence states the main idea.", "Every sentence supports it.", "I have a closing sentence."],
  },
};

/** Today's Daily Write for the active child: their level's prompt for their local date. */
export function DailyWrite() {
  const today = useLocalDay();
  const child = useActiveChild();
  const key = today ? `daily:${today}` : "";
  const saved = useWork(key);

  if (!today) return <div className="h-72 animate-pulse rounded-3xl bg-indigo-50" />;

  // Keep the prompt the piece was started with (e.g. if the child moved up a level today).
  const level = asLevel(child?.level);
  const daily = saved ? { prompt: saved.prompt, genre: saved.genre } : getDailyPrompt(today, level);
  const genre: Genre = daily.genre in GUIDES ? daily.genre : "narrative";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Daily Write · {today}</p>
        <h1 className="text-2xl font-bold">✍️ Today&apos;s prompt</h1>
        <p className="text-slate-600">A new prompt every day. Write a little every day and you&apos;ll see the difference.</p>
      </header>
      <WritingStudio
        key={key}
        task={{
          id: key,
          lessonSlug: null,
          title: `Daily Write — ${today}`,
          prompt: daily.prompt,
          genre,
          focus: [],
          targetWords: DAILY_TARGET_WORDS[level],
          ...GUIDES[genre],
          walkthrough: GENRE_WALKTHROUGHS[genre],
        }}
      />
    </div>
  );
}

/** Small card with today's prompt (home pages). */
export function TodayPrompt({ level, children }: { level?: string; children?: React.ReactNode }) {
  const today = useLocalDay();
  if (!today) return <div className="h-12 animate-pulse rounded-xl bg-amber-100/60" />;
  const daily = getDailyPrompt(today, level);
  return (
    <>
      <p className="text-lg text-slate-900">{daily.prompt}</p>
      <div className="mt-2">
        <ReadAloud text={daily.prompt} />
      </div>
      {children}
    </>
  );
}
