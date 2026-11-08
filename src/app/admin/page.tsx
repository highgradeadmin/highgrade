"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { AdminProgress } from "@/components/AdminProgress";
import { estimateCost, formatTokens, formatUsd, type ModelUsage } from "@/lib/pricing";
import { useAuthStatus, useIsAdmin } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

interface AdminChild {
  child_id: string;
  name: string;
  grade: number;
  level?: string;
  created_at: string;
  pieces: number;
  feedback_requests: number;
  last_active_at: string | null;
  usage_by_model: Record<string, ModelUsage>;
  // From migration 0006 (missing until it has run).
  scored_tries?: number;
  score_now?: number | null;
  score_start?: number | null;
}

interface AdminFamily {
  parent_id: string;
  email: string;
  parent_name: string | null;
  is_admin: boolean;
  joined_at: string;
  last_sign_in_at: string | null;
  children: AdminChild[];
}

type Sort = "joined" | "tokens" | "active" | "name";

const DAY = 86_400_000;

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
}

function ago(iso: string | null, now: number) {
  if (!iso) return "never";
  const d = Math.floor((now - new Date(iso).getTime()) / DAY);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}

function tokensOf(byModel: Record<string, ModelUsage>) {
  return Object.values(byModel).reduce(
    (acc, u) => ({ input: acc.input + u.input, output: acc.output + u.output }),
    { input: 0, output: 0 },
  );
}

function summarize(f: AdminFamily) {
  const kids = f.children.map((c) => ({ ...c, ...tokensOf(c.usage_by_model), cost: estimateCost(c.usage_by_model) }));
  const lastActive = kids.reduce<string | null>(
    (m, c) => (c.last_active_at && (!m || c.last_active_at > m) ? c.last_active_at : m),
    null,
  );
  return {
    ...f,
    kids,
    lastActive,
    pieces: kids.reduce((n, c) => n + c.pieces, 0),
    requests: kids.reduce((n, c) => n + c.feedback_requests, 0),
    input: kids.reduce((n, c) => n + c.input, 0),
    output: kids.reduce((n, c) => n + c.output, 0),
    cost: kids.reduce((n, c) => n + c.cost, 0),
  };
}

export default function AdminPage() {
  const status = useAuthStatus();
  const isAdmin = useIsAdmin();
  const [families, setFamilies] = useState<AdminFamily[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("joined");
  const [now, setNow] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    createClient()
      .rpc("admin_list_families")
      .then(({ data, error }) => {
        if (cancelled) return;
        setNow(Date.now());
        setError(error ? error.message : null);
        setFamilies(error ? null : ((data ?? []) as AdminFamily[]));
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, reloadKey]);

  const all = useMemo(() => (families ?? []).map(summarize), [families]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = all.filter(
      (f) =>
        !q ||
        f.email.toLowerCase().includes(q) ||
        (f.parent_name ?? "").toLowerCase().includes(q) ||
        f.kids.some((c) => c.name.toLowerCase().includes(q)),
    );
    const by: Record<Sort, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
      joined: (a, b) => b.joined_at.localeCompare(a.joined_at),
      tokens: (a, b) => b.input + b.output - (a.input + a.output),
      active: (a, b) => (b.lastActive ?? "").localeCompare(a.lastActive ?? ""),
      name: (a, b) => (a.parent_name ?? "").localeCompare(b.parent_name ?? ""),
    };
    return [...list].sort(by[sort]);
  }, [all, query, sort]);

  if (status === "loading") return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;
  if (status !== "ready") {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <Link href="/login" className="font-medium text-indigo-700 hover:underline">Log in</Link> with an admin account.
      </p>
    );
  }
  if (!isAdmin) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-700">
        This page is only for admins.
      </p>
    );
  }

  const kids = all.flatMap((f) => f.kids);
  const totals = {
    families: all.length,
    children: kids.length,
    active7: kids.filter((c) => c.last_active_at && now - new Date(c.last_active_at).getTime() < 7 * DAY).length,
    requests: kids.reduce((n, c) => n + c.feedback_requests, 0),
    input: kids.reduce((n, c) => n + c.input, 0),
    output: kids.reduce((n, c) => n + c.output, 0),
    cost: kids.reduce((n, c) => n + c.cost, 0),
  };

  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Admin</p>
          <h1 className="text-2xl font-bold">Families, progress &amp; usage</h1>
        </div>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
        >
          Refresh
        </button>
      </header>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Couldn&apos;t load families: {error}</p>}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile label="Families" value={totals.families.toLocaleString()} />
        <Tile label="Children" value={totals.children.toLocaleString()} />
        <Tile label="Children active, 7 days" value={totals.active7.toLocaleString()} />
        <Tile label="Feedback requests" value={totals.requests.toLocaleString()} />
        <Tile label="Tokens (in / out)" value={`${formatTokens(totals.input)} / ${formatTokens(totals.output)}`} />
        <Tile label="Estimated cost" value={formatUsd(totals.cost)} />
      </section>

      {families !== null && (
        <AdminProgress kids={all.flatMap((f) => f.kids.map((c) => ({ ...c, familyEmail: f.email })))} now={now} />
      )}

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-3">
          <input
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            placeholder="Search parent, email or child"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Sort</span>
            <select
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
            >
              <option value="joined">Newest first</option>
              <option value="active">Recently active</option>
              <option value="tokens">Most tokens</option>
              <option value="name">Parent name</option>
            </select>
          </label>
        </div>

        {families === null && !error ? (
          <div className="h-32 animate-pulse bg-slate-50" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Family / child</th>
                  <th className="px-3 py-2 font-medium">Joined</th>
                  <th className="px-3 py-2 font-medium">Last active</th>
                  <th className="px-3 py-2 text-right font-medium">Pieces</th>
                  <th className="px-3 py-2 text-right font-medium">Feedback</th>
                  <th className="px-3 py-2 text-right font-medium">Tokens in</th>
                  <th className="px-3 py-2 text-right font-medium">Tokens out</th>
                  <th className="px-3 py-2 text-right font-medium">Est. cost</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {rows.map((f) => {
                  const isOpen = open.has(f.parent_id);
                  return (
                    <Fragment key={f.parent_id}>
                      <tr className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <button
                            onClick={() => toggle(f.parent_id)}
                            className="flex items-start gap-2 text-left"
                            aria-expanded={isOpen}
                            disabled={f.kids.length === 0}
                          >
                            <span className="mt-0.5 w-3 text-slate-400">{f.kids.length ? (isOpen ? "▾" : "▸") : ""}</span>
                            <span>
                              <span className="font-medium text-slate-900">
                                {f.parent_name ?? "—"}
                                {f.is_admin && (
                                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                                    Admin
                                  </span>
                                )}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {f.email} · {f.kids.length} child{f.kids.length === 1 ? "" : "ren"}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">{fmtDate(f.joined_at)}</td>
                        <td className="whitespace-nowrap px-3 py-2">{ago(f.lastActive, now)}</td>
                        <td className="px-3 py-2 text-right">{f.pieces}</td>
                        <td className="px-3 py-2 text-right">{f.requests}</td>
                        <td className="px-3 py-2 text-right" title={f.input.toLocaleString()}>{formatTokens(f.input)}</td>
                        <td className="px-3 py-2 text-right" title={f.output.toLocaleString()}>{formatTokens(f.output)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatUsd(f.cost)}</td>
                      </tr>
                      {isOpen &&
                        f.kids.map((c) => (
                          <tr key={c.child_id} className="bg-slate-50/60 text-slate-700">
                            <td className="py-1.5 pl-10 pr-3">
                              {c.name} <span className="text-xs text-slate-500">· grade {c.grade}</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-1.5">{fmtDate(c.created_at)}</td>
                            <td className="whitespace-nowrap px-3 py-1.5">{ago(c.last_active_at, now)}</td>
                            <td className="px-3 py-1.5 text-right">{c.pieces}</td>
                            <td className="px-3 py-1.5 text-right">{c.feedback_requests}</td>
                            <td className="px-3 py-1.5 text-right">{formatTokens(c.input)}</td>
                            <td className="px-3 py-1.5 text-right">{formatTokens(c.output)}</td>
                            <td className="px-3 py-1.5 text-right">{formatUsd(c.cost)}</td>
                          </tr>
                        ))}
                    </Fragment>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                      No families match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-500">
        Click a family to see each child. Costs are estimates from list prices in <code>src/lib/pricing.ts</code>;
        your Anthropic Console billing page is the source of truth. Usage from removed children still counts in
        your bill but no longer appears here.
      </p>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
