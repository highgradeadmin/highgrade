"use client";

import { useEffect, useRef, useState } from "react";
import type { Point } from "@/lib/performance";

const H = 220;
const M = { top: 16, right: 44, bottom: 28, left: 28 };
const COLOR = "#4f46e5"; // indigo-600, validated ≥3:1 on white
const GRID = "#e2e8f0";
const MUTED = "#64748b";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(260);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const fmtDate = (at: string) =>
  at ? new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";

/** Line chart of a score (1-5) across drafts, oldest → newest. Single series. */
export function ScoreTrendChart({ points, label }: { points: Point[]; label: string }) {
  const [boxRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  if (points.length < 2) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
        Get feedback on at least 2 drafts to see your trend.
      </p>
    );
  }

  const innerW = width - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const n = points.length;
  const x = (i: number) => M.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => M.top + ((5 - v) / 4) * innerH;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const area = `${path}L${x(n - 1)},${y(1)}L${x(0)},${y(1)}Z`;
  const last = points[n - 1];
  const sel = active !== null ? points[active] : null;

  // X ticks: first, last and a few in between, by draft number.
  const tickCount = Math.min(n, Math.max(2, Math.floor(innerW / 80)));
  const ticks = Array.from(new Set(Array.from({ length: tickCount }, (_, k) => Math.round((k / (tickCount - 1)) * (n - 1)))));

  function nearest(clientX: number, rect: DOMRect) {
    const px = ((clientX - rect.left) / rect.width) * width;
    const i = Math.round(((px - M.left) / innerW) * (n - 1));
    return Math.min(n - 1, Math.max(0, i));
  }

  return (
    <div>
      <div ref={boxRef} className="relative min-w-0">
        <svg
          viewBox={`0 0 ${width} ${H}`}
          height={H}
          className="block w-full touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          role="img"
          aria-label={`${label} score across ${n} drafts, from ${points[0].value.toFixed(1)} to ${last.value.toFixed(1)}. Use arrow keys to step through drafts.`}
          tabIndex={0}
          onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((a) => a ?? n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n - 1) - 1));
            if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? 0) + 1));
          }}
        >
          {/* Gridlines + y ticks */}
          {[1, 2, 3, 4, 5].map((v) => (
            <g key={v}>
              <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth={1} />
              <text x={M.left - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize={11} fill={MUTED}>
                {v}
              </text>
            </g>
          ))}
          {/* "On track" reference */}
          <text x={width - M.right + 6} y={y(3)} dy="0.32em" fontSize={10} fill={MUTED}>
            on track
          </text>

          {/* X ticks */}
          {ticks.map((i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill={MUTED}>
              #{points[i].index}
            </text>
          ))}

          <path d={area} fill={COLOR} opacity={0.08} />
          <path d={path} fill="none" stroke={COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* End dot + end label */}
          <circle cx={x(n - 1)} cy={y(last.value)} r={4} fill={COLOR} stroke="#fff" strokeWidth={2} />
          {active === null && (
            <text x={x(n - 1) + 8} y={y(last.value)} dy="0.32em" fontSize={12} fontWeight={600} fill="#0f172a">
              {last.value.toFixed(1)}
            </text>
          )}

          {/* Crosshair */}
          {sel && active !== null && (
            <g pointerEvents="none">
              <line x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + innerH} stroke="#94a3b8" strokeWidth={1} />
              <circle cx={x(active)} cy={y(sel.value)} r={5} fill={COLOR} stroke="#fff" strokeWidth={2} />
            </g>
          )}
        </svg>

        {sel && active !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-48 rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-md"
            style={{
              left: Math.min(Math.max(0, x(active) - 96), width - 192),
              top: Math.max(0, y(sel.value) - 78),
            }}
          >
            <p className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3 rounded" style={{ background: COLOR }} />
              <span className="text-base font-semibold text-slate-900">{sel.value.toFixed(1)}</span>
              <span className="text-slate-500">{label}</span>
            </p>
            <p className="mt-0.5 truncate text-slate-700">{sel.title}</p>
            <p className="text-slate-500">
              Draft #{sel.index} · {fmtDate(sel.at)}
            </p>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowTable((s) => !s)}
        className="mt-2 text-xs font-medium text-indigo-700 hover:underline"
      >
        {showTable ? "Hide table" : "Show as table"}
      </button>
      {showTable && (
        <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-1.5 font-medium">Draft</th>
                <th className="px-3 py-1.5 font-medium">Date</th>
                <th className="px-3 py-1.5 font-medium">Writing</th>
                <th className="px-3 py-1.5 text-right font-medium">{label}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {[...points].reverse().map((p) => (
                <tr key={p.index}>
                  <td className="px-3 py-1.5">#{p.index}</td>
                  <td className="px-3 py-1.5">{fmtDate(p.at)}</td>
                  <td className="max-w-[12rem] truncate px-3 py-1.5">{p.title}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{p.value.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
