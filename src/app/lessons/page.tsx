import type { Metadata } from "next";
import { LessonsBrowser } from "@/components/LessonsBrowser";

export const metadata: Metadata = { title: "Lessons · HighGrade Writing" };

export default function LessonsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Lessons</h1>
        <p className="text-slate-600">Each lesson teaches one skill, then you practise it right away.</p>
      </header>
      <LessonsBrowser />
    </div>
  );
}
