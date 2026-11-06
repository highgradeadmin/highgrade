import { connection } from "next/server";
import { Suspense } from "react";
import { WritingStudio } from "@/components/WritingStudio";
import { getDailyPrompt } from "@/lib/daily-prompts";
import type { Genre } from "@/lib/lessons";
import { GENRE_WALKTHROUGHS } from "@/lib/walkthroughs";

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

export default function DailyWritePage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading today&apos;s prompt…</p>}>
      <DailyWrite />
    </Suspense>
  );
}

async function DailyWrite() {
  await connection(); // pick the prompt per request, not at build time
  const daily = getDailyPrompt();
  const guide = GUIDES[daily.genre];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Daily Write · {today}</p>
        <h1 className="text-2xl font-bold">Today&apos;s prompt</h1>
        <p className="text-slate-600">A new prompt every day. Write a little every day and you&apos;ll see the difference.</p>
      </header>
      <WritingStudio
        task={{
          id: `daily:${today}`,
          lessonSlug: null,
          title: `Daily Write — ${today}`,
          prompt: daily.prompt,
          genre: daily.genre,
          focus: [],
          targetWords: [100, 300],
          ...guide,
          walkthrough: GENRE_WALKTHROUGHS[daily.genre],
        }}
      />
    </div>
  );
}
