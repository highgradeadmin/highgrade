"use client";

import Link from "next/link";
import { countWords, ProgressView } from "@/components/ProgressView";
import { useAllWorkMap, useAuthStatus, useProfile, useWorksLoading } from "@/lib/storage";

export default function ProgressPage() {
  const status = useAuthStatus();
  const profile = useProfile();
  const worksLoading = useWorksLoading();
  const workMap = useAllWorkMap();

  if (status === "loading" || worksLoading) return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;
  if (status !== "ready") {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-700">
        <Link href="/login" className="font-medium text-indigo-700 hover:underline">Log in</Link> to see progress.
      </p>
    );
  }
  if (!profile) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-700">
        <Link href="/profiles" className="font-medium text-indigo-700 hover:underline">Choose who&apos;s writing</Link>{" "}
        to see their progress.
      </p>
    );
  }

  const pieces = Object.values(workMap).map((w) => ({
    id: w.id,
    lessonSlug: w.lessonSlug,
    title: w.title,
    updatedAt: w.updatedAt,
    words: countWords(w.text),
    drafts: w.drafts,
  }));
  return <ProgressView name={profile.name} grade={profile.grade} pieces={pieces} />;
}
