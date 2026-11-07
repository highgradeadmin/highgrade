import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonPractice } from "@/components/LessonPractice";
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

  return (
    <div className="space-y-10">
      <div>
        <Link href="/lessons" className="text-sm text-indigo-700 hover:underline">
          ← All lessons
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Grades {lesson.grade} · {GENRE_LABELS[lesson.genre]} · Focus:{" "}
          {lesson.focusTraits.map(traitName).join(", ")}
        </p>
        <h1 className="text-3xl font-bold">{lesson.title}</h1>
        <p className="mt-2 max-w-2xl text-slate-600">{lesson.summary}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {lesson.teach.map((t) => (
          <div key={t.heading} className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">{t.heading}</h2>
            <p className="mt-1 text-sm text-slate-700">{t.body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">See the difference</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-rose-50 p-4">
            <p className="text-xs font-semibold uppercase text-rose-700">Weaker</p>
            <p className="mt-1 text-slate-800">{lesson.example.weak}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase text-emerald-700">Stronger</p>
            <p className="mt-1 text-slate-800">{lesson.example.strong}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-700">
          <b>Why it works:</b> {lesson.example.why}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Your turn</h2>
        <LessonPractice
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
