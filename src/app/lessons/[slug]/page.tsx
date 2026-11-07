import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoachSays } from "@/components/Coach";
import { LessonPractice } from "@/components/LessonPractice";
import { ReadAloud } from "@/components/ReadAloud";
import { GENRE_LABELS, getLesson, LESSONS } from "@/lib/lessons";
import { traitName } from "@/lib/traits";
import { LESSON_WALKTHROUGHS } from "@/lib/walkthroughs";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata(props: PageProps<"/lessons/[slug]">): Promise<Metadata> {
  const lesson = getLesson((await props.params).slug);
  return { title: lesson ? `${lesson.title} · HighGrade Writing` : "Lesson" };
}

export default async function LessonPage(props: PageProps<"/lessons/[slug]">) {
  const lesson = getLesson((await props.params).slug);
  if (!lesson) notFound();
  const lessonSpeech = [
    lesson.title,
    lesson.summary,
    ...lesson.teach.map((t, i) => `${i + 1}. ${t.heading}. ${t.body}`),
  ].join(" ");
  const exampleSpeech = `Weaker: ${lesson.example.weak} Stronger: ${lesson.example.strong} Why it works: ${lesson.example.why}`;

  return (
    <div className="space-y-10">
      <div>
        <Link href="/lessons" className="text-sm font-medium text-indigo-700 hover:underline">
          ← All lessons
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Grades {lesson.grade} · {GENRE_LABELS[lesson.genre]} · Focus:{" "}
          {lesson.focusTraits.map(traitName).join(", ")}
        </p>
        <h1 className="text-3xl font-bold">{lesson.title}</h1>
        <p className="mt-2 max-w-2xl text-lg text-slate-700">{lesson.summary}</p>
        <div className="mt-3">
          <ReadAloud text={lessonSpeech} label="Read this lesson to me" />
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {lesson.teach.map((t, i) => (
          <div key={t.heading} className="rounded-3xl border border-slate-200 bg-white p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
              {i + 1}
            </span>
            <h2 className="mt-3 text-lg font-bold">{t.heading}</h2>
            <p className="mt-1 text-slate-700">{t.body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">👀 See the difference</h2>
          <ReadAloud text={exampleSpeech} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-rose-50 p-4">
            <p className="text-sm font-bold text-rose-700">😕 Weaker</p>
            <p className="mt-1 text-slate-800">{lesson.example.weak}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-700">🌟 Stronger</p>
            <p className="mt-1 text-slate-800">{lesson.example.strong}</p>
          </div>
        </div>
        <div className="mt-4">
          <CoachSays title="Why it works">{lesson.example.why}</CoachSays>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-bold">✏️ Your turn</h2>
        <LessonPractice
          band={lesson.grade}
          topics={lesson.practice.topics}
          base={{
            lessonSlug: lesson.slug,
            lessonTitle: lesson.title,
            genre: lesson.genre,
            focus: lesson.focusTraits,
            targetWords: lesson.practice.targetWords,
            brainstorm: lesson.practice.brainstorm,
            outline: lesson.practice.outline,
            checklist: lesson.practice.checklist,
            walkthrough: LESSON_WALKTHROUGHS[lesson.slug],
          }}
        />
      </section>
    </div>
  );
}
