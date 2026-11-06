import { LEVELS, levelFor } from "@/lib/performance";

/** Hero number + level meter: where the student is now and how far to the next level. */
export function PerformanceSummary({
  current,
  delta,
  count,
  grade,
}: {
  current: number;
  delta: number | null;
  count: number;
  grade: number;
}) {
  const level = levelFor(current);
  const pct = ((current - 1) / 4) * 100; // 1-5 scale → 0-100%

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">Overall writing level</p>
      <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-1">
        <p className="text-5xl font-semibold text-slate-900">
          {current.toFixed(1)}
          <span className="text-xl font-normal text-slate-500"> / 5</span>
        </p>
        <div className="pb-1.5">
          <p className="text-lg font-semibold text-slate-900">{level.label}</p>
          {delta !== null && Math.abs(delta) >= 0.05 && (
            <p className={`text-sm font-medium ${delta > 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)} {delta > 0 ? "up" : "down"} since your first drafts
            </p>
          )}
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-600">{level.blurb}</p>

      {/* Meter */}
      <div
        className="relative mt-5"
        role="meter"
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={Number(current.toFixed(1))}
        aria-label={`Overall writing level ${current.toFixed(1)} out of 5: ${level.label}`}
      >
        <div className="h-3 overflow-hidden rounded-full bg-indigo-100">
          <div className="h-3 rounded-full bg-indigo-600" style={{ width: `${Math.max(2, pct)}%` }} />
        </div>
        {/* Level boundaries */}
        {LEVELS.slice(1).map((l) => (
          <span
            key={l.label}
            className="absolute top-0 h-3 w-0.5 bg-white"
            style={{ left: `${((l.min - 1) / 4) * 100}%` }}
            aria-hidden
          />
        ))}
        <div className="relative mt-1.5 h-4 text-[11px] text-slate-500" aria-hidden>
          {LEVELS.map((l, i) => (
            <span
              key={l.label}
              className={`absolute whitespace-nowrap ${
                i === level.index ? "font-semibold text-slate-800" : "hidden sm:inline"
              } ${i === 0 ? "" : i === LEVELS.length - 1 ? "-translate-x-full sm:-translate-x-1/2" : "-translate-x-1/2"}`}
              style={{ left: `${((l.min - 1) / 4) * 100}%` }}
            >
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        {level.next
          ? `${(level.next.min - current).toFixed(1)} more to reach “${level.next.label}”. `
          : "You've reached the top level! "}
        Based on your latest {Math.min(5, count)} draft{count === 1 ? "" : "s"}; scores compare you with
        grade {grade} writers (3 = on track).
      </p>
    </div>
  );
}
