"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { levelFor } from "@/lib/performance";

/** One child as the admin page sees them (scores only; never their writing). */
export interface ProgressChild {
  child_id: string;
  name: string;
  grade: number;
  level?: string;
  last_active_at: string | null;
  scored_tries?: number;
  score_now?: number | null;
  score_start?: number | null;
  familyEmail: string;
}


type Sort = "help" | "improved" | "active" | "name";

const DAY = 86_400_000;
const WINDOW = 5;
/** Below this, a child is flagged as needing help (2.5 = between "Developing" and "On track"). */
const HELP_BELOW = 2.5;

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const fmt = (v: number | null) => (v === null ? "—" : v.toFixed(1));

function ago(iso: string | null, now: number) {
  if (!iso) return "never";
  const d = Math.floor((now - new Date(iso).getTime()) / DAY);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}

function Change({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-slate-400">—</span>;
  if (Math.abs(delta) < 0.05) return <span className="text-slate-500">no change</span>;
  return (
    <span className={`font-medium ${delta > 0 ? "text-emerald-700" : "text-rose-700"}`}>
      {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
    </span>
  );
}

export function AdminProgress({ kids, now }: { kids: ProgressChild[]; now: number }) {
  const [sort, setSort] = useState<Sort>("help");

  const rows = useMemo(() => {
    const list = kids.map((c) => {
      const scoreNow = num(c.score_now);
      const start = num(c.score_start);
      const tries = c.scored_tries ?? 0;
      return { ...c, scoreNow, delta: scoreNow !== null && start !== null && tries > 1 ? scoreNow - start : null, tries };
    });
    const by: Record<Sort, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
      // Children with scores first, lowest score first.
      help: (a, b) => (a.scoreNow ?? 99) - (b.scoreNow ?? 99),
      improved: (a, b) => (b.delta ?? -99) - (a.delta ?? -99),
      active: (a, b) => (b.last_active_at ?? "").localeCompare(a.last_active_at ?? ""),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return list.sort(by[sort]);
  }, [kids, sort]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3">
        <div>
          <h2 className="font-semibold">Children&apos;s progress</h2>
          <p className="text-xs text-slate-500">
            Writing level = average of the 6 skill scores (1–5, 3 = on track for their grade) over the latest{" "}
            {WINDOW} tries. Change = compared with their first {WINDOW} tries. Click a child to see their full progress.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-600">Sort</span>
          <select
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
          >
            <option value="help">Needs help first</option>
            <option value="improved">Most improved</option>
            <option value="active">Recently active</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">Child</th>
              <th className="px-3 py-2 font-medium">Grade · lessons</th>
              <th className="px-3 py-2 font-medium">Writing level</th>
              <th className="px-3 py-2 font-medium">Change</th>
              <th className="px-3 py-2 text-right font-medium">Scored tries</th>
              <th className="px-3 py-2 font-medium">Last active</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((c) => {
              const inactive = !c.last_active_at || now - new Date(c.last_active_at).getTime() > 14 * DAY;
              return (
                  <tr key={c.child_id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <Link href={`/admin/child/${c.child_id}`} className="group block">
                        <span className="font-medium text-indigo-700 group-hover:underline">{c.name} →</span>
                        <span className="block text-xs text-slate-500">{c.familyEmail}</span>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {c.grade} · {c.level ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {c.scoreNow === null ? (
                        <span className="text-slate-400">no scores yet</span>
                      ) : (
                        <>
                          <b>{fmt(c.scoreNow)}</b> <span className="text-slate-600">{levelFor(c.scoreNow).label}</span>
                          {c.scoreNow < HELP_BELOW && (
                            <span className="ml-2 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-rose-700">
                              Needs help
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Change delta={c.delta} />
                    </td>
                    <td className="px-3 py-2 text-right">{c.tries}</td>
                    <td className={`whitespace-nowrap px-3 py-2 ${inactive ? "text-amber-700" : ""}`}>
                      {ago(c.last_active_at, now)}
                    </td>
                  </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  No children yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
