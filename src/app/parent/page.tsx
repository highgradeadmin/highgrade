"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GradeSelect } from "@/components/GradePicker";
import type { Feedback } from "@/lib/feedback";
import { LEVELS, levelLabel } from "@/lib/lessons";
import { metricValue } from "@/lib/performance";
import { levelProgress, type PieceLike } from "@/lib/proficiency";
import {
  addChild,
  deleteChild,
  getPinStatus,
  lockParentArea,
  selectChild,
  setParentPin,
  signOut,
  unlockParentArea,
  updateChild,
  useAuthStatus,
  useChildren,
  useParentName,
  useParentUnlocked,
  type Child,
  type PinStatus,
} from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

const input = "mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none";
const primary = "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50";
const secondary = "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50";
const THIS_YEAR = new Date().getFullYear();
const PIN_RE = /^\d{4,6}$/;

function PinInput(props: { value: string; onChange: (v: string) => void; label: string; autoFocus?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{props.label}</span>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        autoFocus={props.autoFocus}
        className={`${input} tracking-[0.4em]`}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value.replace(/\D/g, ""))}
      />
    </label>
  );
}

export default function ParentPage() {
  const status = useAuthStatus();
  const unlocked = useParentUnlocked();

  if (status === "loading") return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
  if (status !== "ready") {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <Link href="/login" className="font-medium text-indigo-700 hover:underline">
          Log in
        </Link>{" "}
        to manage your family.
      </p>
    );
  }
  return unlocked ? <ParentDashboard /> : <PinGate />;
}

// ─── PIN gate ───────────────────────────────────────────────────────────────

function PinGate() {
  const router = useRouter();
  const [pinStatus, setPinStatus] = useState<PinStatus | null | undefined>(undefined);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [forgot, setForgot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPinStatus().then((s) => {
      if (!cancelled) setPinStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (pinStatus === undefined) return <div className="mx-auto h-48 max-w-md animate-pulse rounded-xl bg-slate-100" />;
  if (pinStatus === null) {
    return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Couldn&apos;t load your account. Please refresh.</p>;
  }

  const creating = !pinStatus.hasPin || (forgot && pinStatus.canReset);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (creating) {
      if (!PIN_RE.test(pin)) return setError("Use 4 to 6 digits.");
      if (pin !== pin2) return setError("The two PINs don't match.");
    }
    setBusy(true);
    const err = creating ? await setParentPin(pin) : await unlockParentArea(pin);
    setBusy(false);
    if (err) {
      setError(err);
      setPin("");
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Parent area</p>
      <h1 className="mb-1 text-2xl font-bold">
        {!pinStatus.hasPin ? "Create your parent PIN" : creating ? "Set a new PIN" : "Enter your parent PIN"}
      </h1>
      <p className="mb-5 text-sm text-slate-600">
        {!pinStatus.hasPin
          ? "Your PIN keeps this area (adding and removing children) parents-only. Choose 4–6 digits your children don't know."
          : creating
            ? "You just logged in with your password, so you can choose a new PIN."
            : "This area is for parents and guardians."}
      </p>

      {pinStatus.lockedUntil && !creating ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Too many wrong PINs. Try again after {new Date(pinStatus.lockedUntil).toLocaleTimeString()}.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <PinInput label={creating ? "New PIN" : "PIN"} value={pin} onChange={setPin} autoFocus />
          {creating && <PinInput label="Type it again" value={pin2} onChange={setPin2} />}
          {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          <button disabled={busy || pin.length < 4} className={`${primary} w-full py-2.5`}>
            {busy ? "Checking…" : creating ? "Save PIN" : "Unlock"}
          </button>
        </form>
      )}

      {pinStatus.hasPin && !creating && (
        <div className="mt-5 text-sm">
          {!forgot ? (
            <button onClick={() => setForgot(true)} className="text-slate-600 hover:underline">
              Forgot your PIN?
            </button>
          ) : (
            <div className="rounded-lg bg-slate-50 p-3 text-slate-700">
              For safety, log out and log back in with your <b>password</b>, then come back here within 10
              minutes to set a new PIN.
              <button
                onClick={async () => {
                  await signOut();
                  router.push("/login?next=/parent");
                }}
                className="mt-2 block font-medium text-indigo-700 hover:underline"
              >
                Log out now
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

interface ChildStats {
  /** task_key → piece, for proficiency. */
  works: Record<string, PieceLike>;
  pieces: number;
  tries: number;
  latestScore: number | null;
  lastActive: string | null;
}

function useChildStats(children: Child[]) {
  const [stats, setStats] = useState<Record<string, ChildStats>>({});
  const ids = children.map((c) => c.id).join(",");
  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("works")
      .select("child_id, task_key, updated_at, drafts(feedback, created_at)")
      .then(({ data }) => {
        if (cancelled) return;
        const out: Record<string, ChildStats> = {};
        const rows = (data ?? []) as {
          child_id: string;
          task_key: string;
          updated_at: string;
          drafts: { feedback: Feedback | null; created_at: string }[];
        }[];
        for (const r of rows) {
          const s = (out[r.child_id] ??= { works: {}, pieces: 0, tries: 0, latestScore: null, lastActive: null });
          s.works[r.task_key] = { drafts: r.drafts };
          s.pieces += 1;
          s.tries += r.drafts.length;
          if (!s.lastActive || r.updated_at > s.lastActive) s.lastActive = r.updated_at;
        }
        // Latest score = average of each child's 5 most recent scored drafts.
        for (const childId of Object.keys(out)) {
          const drafts = rows
            .filter((r) => r.child_id === childId)
            .flatMap((r) => r.drafts)
            .filter((d) => d.feedback)
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .slice(-5)
            .map((d) => metricValue({ text: "", at: d.created_at, feedback: d.feedback }, "overall"))
            .filter((v): v is number => v !== null);
          out[childId].latestScore = drafts.length ? drafts.reduce((a, b) => a + b, 0) / drafts.length : null;
        }
        setStats(out);
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);
  return stats;
}

function ParentDashboard() {
  const router = useRouter();
  const parentName = useParentName();
  const children = useChildren();
  const stats = useChildStats(children);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Parent area</p>
          <h1 className="text-2xl font-bold">Hi{parentName ? `, ${parentName}` : ""}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              lockParentArea();
              router.push("/profiles");
            }}
            className={secondary}
          >
            🔒 Lock &amp; go to profiles
          </button>
          <button
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className={secondary}
          >
            Log out
          </button>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Your children</h2>
        {children.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-slate-600">
            Add your first child below. They&apos;ll pick their profile on the{" "}
            <Link href="/profiles" className="text-indigo-700 hover:underline">
              Who&apos;s writing?
            </Link>{" "}
            screen.
          </p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {children.map((c) => (
              <ChildCard
                key={c.id}
                child={c}
                stats={stats[c.id]}
                onOpen={async () => {
                  await selectChild(c.id);
                  lockParentArea();
                  router.push("/progress");
                }}
              />
            ))}
          </ul>
        )}
      </section>

      {children.length < 6 && <AddChildForm />}
      <ChangePinForm />

      <p className="text-xs text-slate-500">
        The parent area locks automatically after 10 minutes. Removing a child deletes their writing and
        scores permanently.
      </p>
    </div>
  );
}

function ChildCard({ child, stats, onOpen }: { child: Child; stats?: ChildStats; onOpen: () => void }) {
  const [mode, setMode] = useState<"view" | "edit" | "remove">("view");
  const [name, setName] = useState(child.name);
  const [grade, setGrade] = useState(child.grade);
  const [level, setLevel] = useState(child.level);
  const progress = levelProgress(child.level, stats?.works ?? {});
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-5">
      {mode === "view" && (
        <>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-semibold">{child.name}</p>
              <p className="text-sm text-slate-500">
                Grade {child.grade} · Level {levelLabel(child.level)}
              </p>
            </div>
            {stats?.latestScore != null && (
              <p className="text-right">
                <span className="text-2xl font-semibold">{stats.latestScore.toFixed(1)}</span>
                <span className="text-sm text-slate-500"> / 5</span>
                <span className="block text-xs text-slate-500">recent average</span>
              </p>
            )}
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-600">
              <span>{levelLabel(child.level)} lessons proficient</span>
              <span>
                {progress.proficient} of {progress.total}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-indigo-100">
              <div
                className="h-2 rounded-full bg-indigo-600"
                style={{ width: `${progress.total ? (progress.proficient / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {stats ? (
              <>
                {stats.pieces} piece{stats.pieces === 1 ? "" : "s"} · {stats.tries} feedback tr
                {stats.tries === 1 ? "y" : "ies"}
                {stats.lastActive && <> · last active {new Date(stats.lastActive).toLocaleDateString()}</>}
              </>
            ) : (
              "No writing yet."
            )}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={onOpen} className={primary}>
              View progress
            </button>
            <button onClick={() => setMode("edit")} className={secondary}>
              Edit
            </button>
            <button onClick={() => setMode("remove")} className={`${secondary} text-rose-700`}>
              Remove
            </button>
          </div>
        </>
      )}

      {mode === "edit" && (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const res = await updateChild(child.id, name.trim(), grade, level);
            setBusy(false);
            if (!res.ok) return setError(res.error);
            setMode("view");
          }}
        >
          <label className="block">
            <span className="text-sm font-medium">First name</span>
            <input required maxLength={40} className={input} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Grade</span>
            <GradeSelect value={grade} onChange={setGrade} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Lesson level</span>
            <select className={input} value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((l) => (
                <option key={l.band} value={l.band}>
                  {l.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">
              Move {child.name} up (or back) a level. Their writing and scores are kept.
            </span>
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button disabled={busy} className={primary}>
              Save
            </button>
            <button type="button" onClick={() => setMode("view")} className={secondary}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "remove" && (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const res = await deleteChild(child.id);
            setBusy(false);
            if (!res.ok) setError(res.error);
          }}
        >
          <p className="text-sm text-slate-800">
            This permanently deletes <b>{child.name}</b>&apos;s profile, writing and scores. Type{" "}
            <b>{child.name}</b> to confirm.
          </p>
          <input className={input} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button
              disabled={busy || confirmText.trim() !== child.name}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              Remove {child.name}
            </button>
            <button type="button" onClick={() => setMode("view")} className={secondary}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

function AddChildForm() {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState(5);
  const [birthYear, setBirthYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold">Add a child</h2>
      <p className="mb-4 text-sm text-slate-600">
        First name only is fine. We don&apos;t need your child&apos;s email.
      </p>
      <form
        className="grid gap-3 sm:grid-cols-4 sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const res = await addChild(name.trim(), grade, birthYear ? Number(birthYear) : null);
          setBusy(false);
          if (!res.ok) return setError(res.error);
          setName("");
          setBirthYear("");
        }}
      >
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">First name</span>
          <input required maxLength={40} className={input} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Grade</span>
          <GradeSelect value={grade} onChange={setGrade} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Birth year (optional)</span>
          <select className={input} value={birthYear} onChange={(e) => setBirthYear(e.target.value)}>
            <option value="">—</option>
            {Array.from({ length: 15 }, (_, i) => THIS_YEAR - 8 - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-red-700 sm:col-span-4">{error}</p>}
        <div className="sm:col-span-4">
          <button disabled={busy || !name.trim()} className={primary}>
            {busy ? "Adding…" : "Add child"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ChangePinForm() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm font-medium text-slate-600 hover:underline">
        Change parent PIN
      </button>
    );
  }
  return (
    <section className="max-w-sm rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-semibold">Change parent PIN</h2>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!PIN_RE.test(next)) return setMessage("New PIN must be 4 to 6 digits.");
          setBusy(true);
          const err = await setParentPin(next, current);
          setBusy(false);
          setMessage(err ?? "PIN changed.");
          if (!err) {
            setCurrent("");
            setNext("");
          }
        }}
      >
        <PinInput label="Current PIN" value={current} onChange={setCurrent} />
        <PinInput label="New PIN" value={next} onChange={setNext} />
        {message && <p className="text-sm text-slate-700">{message}</p>}
        <div className="flex gap-2">
          <button disabled={busy} className={primary}>
            Save
          </button>
          <button type="button" onClick={() => setOpen(false)} className={secondary}>
            Close
          </button>
        </div>
      </form>
    </section>
  );
}
