"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { selectChild, useActiveChild, useAuthStatus, useChildren } from "@/lib/storage";

const COLORS = ["bg-indigo-600", "bg-emerald-600", "bg-amber-500", "bg-rose-500", "bg-sky-600", "bg-violet-600"];

export default function ProfilesPage() {
  const router = useRouter();
  const status = useAuthStatus();
  const children = useChildren();
  const active = useActiveChild();

  if (status === "loading") return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
  if (status !== "ready") {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        A parent or guardian needs to{" "}
        <Link href="/login" className="font-medium text-indigo-700 hover:underline">
          log in
        </Link>{" "}
        first.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-6 text-center">
      <h1 className="text-3xl font-bold">Who&apos;s writing today?</h1>

      {children.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-8">
          <p className="text-slate-700">No children have been added yet.</p>
          <Link
            href="/parent"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
          >
            Parent: add a child
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {children.map((c, i) => (
            <li key={c.id}>
              <button
                onClick={async () => {
                  await selectChild(c.id);
                  router.push("/lessons");
                }}
                className={`flex w-full flex-col items-center gap-3 rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md ${
                  active?.id === c.id ? "border-indigo-400 ring-2 ring-indigo-200" : "border-slate-200"
                }`}
              >
                <span
                  className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white ${
                    COLORS[i % COLORS.length]
                  }`}
                  aria-hidden
                >
                  {c.name.slice(0, 1).toUpperCase()}
                </span>
                <span>
                  <span className="block text-lg font-semibold text-slate-900">{c.name}</span>
                  <span className="text-sm text-slate-500">Grade {c.grade}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Link href="/parent" className="mt-10 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
        ⚙ Parent area
      </Link>
    </div>
  );
}
