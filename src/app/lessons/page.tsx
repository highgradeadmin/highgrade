import type { Metadata } from "next";
import { LessonCard } from "@/components/LessonCard";
import { LESSONS, type GradeBand } from "@/lib/lessons";

export const metadata: Metadata = { title: "Lessons · HighGrade Writing" };

const BANDS: { band: GradeBand; label: string }[] = [
  { band: "5-6", label: "Grades 5–6" },
  { band: "7-8", label: "Grades 7–8" },
];

export default function LessonsPage() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold">Lessons</h1>
        <p className="text-slate-600">Each lesson teaches one skill, then you practise it right away.</p>
      </header>
      {BANDS.map(({ band, label }) => (
        <section key={band}>
          <h2 className="mb-3 text-lg font-semibold">{label}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LESSONS.filter((l) => l.grade === band).map((l) => (
              <LessonCard key={l.slug} lesson={l} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
