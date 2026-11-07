import { LESSONS, type GradeBand, type Lesson } from "./lessons";
import type { Feedback } from "./feedback";
import { traitName, type TraitId } from "./traits";

/**
 * Proficiency per lesson.
 * A try is PROFICIENT when every focus skill of the lesson scores 3+ (on track
 * for the child's grade). A lesson is proficient once any try is.
 * NEARLY: the best try's focus skills average 2.5+.
 */
export const PROFICIENT_SCORE = 3;
export const NEARLY_SCORE = 2.5;

export type Status = "proficient" | "nearly" | "not-yet" | "in-progress" | "not-started";

export const STATUS_UI: Record<Status, { icon: string; label: string; className: string }> = {
  proficient: { icon: "✓", label: "Proficient", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  nearly: { icon: "◐", label: "Nearly proficient", className: "bg-amber-50 text-amber-900 border-amber-200" },
  "not-yet": { icon: "○", label: "Not yet proficient", className: "bg-slate-100 text-slate-700 border-slate-200" },
  "in-progress": { icon: "•", label: "In progress", className: "bg-sky-50 text-sky-800 border-sky-200" },
  "not-started": { icon: "", label: "Not started", className: "bg-white text-slate-500 border-slate-200" },
};

/** Minimal shape so this works with the student store and the parent's overview. */
export interface PieceLike {
  text?: string;
  drafts: { feedback: Feedback | null }[];
}

export interface LessonResult {
  status: Status;
  /** Focus-skill scores of the best try (null if no feedback yet). */
  best: { scores: { trait: TraitId; score: number }[]; average: number } | null;
  /** Focus skills still below 3 in the best try. */
  toImprove: string[];
}

function piecesOf(slug: string, works: Record<string, PieceLike>): PieceLike[] {
  const re = new RegExp(`^lesson:${slug}(:\\d+)?$`);
  return Object.entries(works)
    .filter(([key]) => re.test(key))
    .map(([, w]) => w);
}

export function lessonResult(lesson: Pick<Lesson, "slug" | "focusTraits">, works: Record<string, PieceLike>): LessonResult {
  const pieces = piecesOf(lesson.slug, works);
  const tries = pieces.flatMap((p) => p.drafts).filter((d) => d.feedback);
  if (tries.length === 0) {
    return {
      status: pieces.some((p) => p.text?.trim()) ? "in-progress" : "not-started",
      best: null,
      toImprove: [],
    };
  }
  const scored = tries.map((d) => {
    const scores = lesson.focusTraits.map((trait) => ({
      trait,
      score: d.feedback!.traits.find((t) => t.trait === trait)?.score ?? 0,
    }));
    const average = scores.reduce((n, s) => n + s.score, 0) / scores.length;
    return { scores, average, proficient: scores.every((s) => s.score >= PROFICIENT_SCORE) };
  });
  const best =
    scored.find((s) => s.proficient) ?? scored.reduce((a, b) => (b.average > a.average ? b : a));
  const status: Status = best.proficient ? "proficient" : best.average >= NEARLY_SCORE ? "nearly" : "not-yet";
  return {
    status,
    best: { scores: best.scores, average: best.average },
    toImprove: best.scores.filter((s) => s.score < PROFICIENT_SCORE).map((s) => traitName(s.trait)),
  };
}

export function levelProgress(band: GradeBand | string, works: Record<string, PieceLike>) {
  const lessons = LESSONS.filter((l) => l.grade === band);
  const results = lessons.map((l) => ({ lesson: l, ...lessonResult(l, works) }));
  const proficient = results.filter((r) => r.status === "proficient").length;
  return { results, proficient, total: lessons.length, allProficient: lessons.length > 0 && proficient === lessons.length };
}
