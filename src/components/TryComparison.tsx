import { MAX_TRIES } from "@/lib/feedback";
import { metricValue, type Metric } from "@/lib/performance";
import type { Draft } from "@/lib/storage";
import { TRAITS } from "@/lib/traits";

const ROWS: { metric: Metric; name: string }[] = [
  { metric: "overall", name: "Overall" },
  ...TRAITS.map((t) => ({ metric: t.id as Metric, name: t.name })),
];

function fmt(v: number | null, metric: Metric) {
  if (v === null) return "–";
  return metric === "overall" ? v.toFixed(1) : String(v);
}

function Change({ value }: { value: number }) {
  if (Math.abs(value) < 0.05) return <span className="text-slate-400">no change</span>;
  const up = value > 0;
  return (
    <span className={`font-semibold ${up ? "text-emerald-700" : "text-rose-700"}`}>
      {up ? "▲" : "▼"} {Number.isInteger(value) ? Math.abs(value) : Math.abs(value).toFixed(1)}
    </span>
  );
}

/** Overall score per try on one line; opens to every score, side by side, with the change from try 1. */
export function TryComparison({ drafts }: { drafts: Draft[] }) {
  const tries = drafts.filter((d) => d.feedback);
  if (tries.length === 0) return null;
  const first = tries[0];
  const last = tries[tries.length - 1];
  const overallChange =
    tries.length > 1 ? (metricValue(last, "overall") ?? 0) - (metricValue(first, "overall") ?? 0) : null;

  const overalls = tries.map((d) => metricValue(d, "overall"));

  return (
    // Folded to one line of overall scores; tap to see every score.
    <details className="group rounded-xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <span className="text-xl" aria-hidden>
          📈
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900">Your scores, try by try</span>
          <span className="block truncate text-sm tabular-nums text-slate-600">
            {overalls.map((v, i) => (
              <span key={i}>
                {i > 0 && <span className="text-slate-400"> → </span>}
                <span className={i === overalls.length - 1 ? "font-semibold text-indigo-700" : ""}>
                  {fmt(v, "overall")}
                </span>
              </span>
            ))}
            {overallChange !== null && (
              <span className="ml-2 text-xs">
                <Change value={overallChange} />
              </span>
            )}
          </span>
        </span>
        <span className="shrink-0 text-xs font-medium text-indigo-700">
          <span className="group-open:hidden">Show all ▾</span>
          <span className="hidden group-open:inline">Hide ▴</span>
        </span>
      </summary>

      <div className="border-t border-slate-100 px-4 pb-4 pt-3">
        <p className="mb-2 text-xs text-slate-500">
          {tries.length} of {MAX_TRIES} tries used
        </p>

        {overallChange !== null && (
          <p className="mb-3 text-sm text-slate-700">
            {overallChange > 0.05 ? (
              <>
                Your overall score went from <b>{fmt(metricValue(first, "overall"), "overall")}</b> to{" "}
                <b>{fmt(metricValue(last, "overall"), "overall")}</b>. Your revising is working!
              </>
            ) : overallChange < -0.05 ? (
              <>Your overall score dipped this time. That happens! Check the next steps below and try again.</>
            ) : (
              <>Your overall score stayed the same. Pick one next step below and focus on it.</>
            )}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="py-1 pr-2 text-left font-medium">Trait</th>
                {tries.map((_, i) => (
                  <th
                    key={i}
                    className={`px-1.5 py-1 text-center font-medium ${i === tries.length - 1 ? "text-indigo-700" : ""}`}
                  >
                    Try {i + 1}
                  </th>
                ))}
                {tries.length > 1 && <th className="py-1 pl-2 text-right font-medium">Change</th>}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {ROWS.map(({ metric, name }) => {
                const vals = tries.map((d) => metricValue(d, metric));
                const a = vals[0];
                const b = vals[vals.length - 1];
                return (
                  <tr key={metric} className={metric === "overall" ? "border-b border-slate-200 font-semibold" : ""}>
                    <td className="whitespace-nowrap py-1 pr-2 text-slate-800">{name}</td>
                    {vals.map((v, i) => (
                      <td
                        key={i}
                        className={`px-1.5 py-1 text-center ${
                          i === vals.length - 1 ? "rounded bg-indigo-50 font-semibold text-indigo-900" : "text-slate-600"
                        }`}
                      >
                        {fmt(v, metric)}
                      </td>
                    ))}
                    {tries.length > 1 && (
                      <td className="whitespace-nowrap py-1 pl-2 text-right text-xs">
                        {a !== null && b !== null ? <Change value={b - a} /> : "–"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
      </div>
        {tries.length > 1 && (
          <p className="mt-2 text-xs text-slate-500">Change compares your latest try with Try 1. Scores are out of 5.</p>
        )}
      </div>
    </details>
  );
}
