import type { Draft, Work } from "./storage";
import { TRAITS, type TraitId } from "./traits";

/** Scores are 1-5, relative to the student's grade (3 = on track). */
export const LEVELS = [
  { min: 1, label: "Getting started", blurb: "Building the basics — every draft helps." },
  { min: 2, label: "Developing", blurb: "You're getting the key skills down. Keep revising!" },
  { min: 3, label: "On track", blurb: "Your writing is right where it should be for your grade." },
  { min: 4, label: "Strong", blurb: "Your writing is ahead of your grade level." },
  { min: 4.7, label: "Exceptional", blurb: "Outstanding writing for your grade." },
] as const;

export function levelFor(score: number) {
  let i = 0;
  for (let k = 0; k < LEVELS.length; k++) if (score >= LEVELS[k].min) i = k;
  return { ...LEVELS[i], index: i, next: LEVELS[i + 1] ?? null };
}

export type Metric = "overall" | TraitId;

export interface Point {
  index: number; // 1-based, chronological
  at: string;
  title: string;
  value: number;
}

export interface ScoredDraft extends Draft {
  title: string;
}

/** All drafts that have feedback, oldest first, tagged with their piece's title. */
export function scoredDrafts(works: Pick<Work, "title" | "drafts">[]): ScoredDraft[] {
  return works
    .flatMap((w) => w.drafts.filter((d) => d.feedback).map((d) => ({ ...d, title: w.title })))
    .sort((a, b) => a.at.localeCompare(b.at));
}

export function metricValue(d: Draft, metric: Metric): number | null {
  const traits = d.feedback?.traits ?? [];
  if (metric === "overall") {
    return traits.length ? traits.reduce((s, t) => s + t.score, 0) / traits.length : null;
  }
  return traits.find((t) => t.trait === metric)?.score ?? null;
}

export function series(drafts: ScoredDraft[], metric: Metric): Point[] {
  return drafts.flatMap((d, i) => {
    const v = metricValue(d, metric);
    return v === null ? [] : [{ index: i + 1, at: d.at, title: d.title, value: v }];
  });
}

function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

const WINDOW = 5;

/** Average of the latest 5 drafts vs. the first 5 (null delta until there are enough drafts). */
export function summary(drafts: ScoredDraft[], metric: Metric) {
  const vals = drafts.map((d) => metricValue(d, metric)).filter((v): v is number => v !== null);
  const current = mean(vals.slice(-WINDOW));
  const start = mean(vals.slice(0, WINDOW));
  const enough = vals.length >= 2;
  const delta = current !== null && start !== null && enough && vals.length > 1 ? current - start : null;
  return { current, start, delta, count: vals.length };
}

export function traitSummaries(drafts: ScoredDraft[]) {
  return TRAITS.map((t) => ({ trait: t, ...summary(drafts, t.id) }));
}
