import type { traitSummaries } from "@/lib/performance";

/** One meter per trait: latest average, with change since the first drafts. */
export function TraitProgress({ rows }: { rows: ReturnType<typeof traitSummaries> }) {
  return (
    <ul className="space-y-3">
      {rows.map(({ trait, current, delta }) => (
        <li key={trait.id}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium text-slate-800">{trait.name}</span>
            <span className="text-slate-700">
              <b className="text-slate-900">{current !== null ? current.toFixed(1) : "–"}</b>
              <span className="text-slate-500">/5</span>
              {delta !== null && Math.abs(delta) >= 0.05 && (
                <span className={`ml-2 text-xs font-semibold ${delta > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
                </span>
              )}
            </span>
          </div>
          <div
            className="mt-1 h-2 overflow-hidden rounded-full bg-indigo-100"
            role="meter"
            aria-valuemin={1}
            aria-valuemax={5}
            aria-valuenow={current ?? undefined}
            aria-label={`${trait.name}: ${current?.toFixed(1) ?? "no score"} out of 5`}
          >
            <div
              className="h-2 rounded-full bg-indigo-600"
              style={{ width: `${current !== null ? Math.max(2, ((current - 1) / 4) * 100) : 0}%` }}
            />
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{trait.short}</p>
        </li>
      ))}
    </ul>
  );
}
