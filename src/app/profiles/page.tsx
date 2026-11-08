"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { AVATARS, COLORS, colorOf, type ColorKey } from "@/lib/avatars";
import { selectChild, setChildAvatar, useActiveChild, useAuthStatus, useChildren, type Child } from "@/lib/storage";

export default function ProfilesPage() {
  const router = useRouter();
  const status = useAuthStatus();
  const children = useChildren();
  const active = useActiveChild();
  const [editing, setEditing] = useState<Child | null>(null);

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
        <ul className="mt-8 flex flex-wrap justify-center gap-4">
          {children.map((c) => (
            <li key={c.id} className="flex w-40 flex-col items-center gap-1 sm:w-44">
              <button
                onClick={async () => {
                  await selectChild(c.id);
                  router.push("/");
                }}
                className={`flex w-full flex-col items-center gap-3 rounded-3xl border-2 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg ${
                  active?.id === c.id ? `ring-4 ${colorOf(c.color).ring} border-transparent` : "border-slate-200"
                }`}
              >
                <Avatar avatar={c.avatar} color={c.color} size="lg" />
                <span>
                  <span className="block text-xl font-bold text-slate-900">{c.name}</span>
                  <span className="text-sm text-slate-500">Grade {c.grade}</span>
                </span>
              </button>
              <button
                onClick={() => setEditing(c)}
                className="rounded-full px-3 py-1 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
              >
                🎨 Change my look
              </button>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/parent"
        className="mt-10 inline-flex items-center gap-2 rounded-full border-2 border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-400 hover:text-indigo-700"
      >
        ⚙ Parent area →
      </Link>

      {editing && <LookPicker child={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function LookPicker({ child, onClose }: { child: Child; onClose: () => void }) {
  const [avatar, setAvatar] = useState(child.avatar);
  const [color, setColor] = useState(child.color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="look-title"
        className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 text-left shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <Avatar avatar={avatar} color={color} size="lg" />
          <h2 id="look-title" className="text-2xl font-bold">
            Pick your look, {child.name}!
          </h2>
        </div>

        <p className="mt-5 font-semibold">Animal</p>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {AVATARS.map((a) => (
            <button
              key={a.key}
              onClick={() => setAvatar(a.key)}
              aria-label={a.label}
              aria-pressed={avatar === a.key}
              className={`flex aspect-square items-center justify-center rounded-2xl text-3xl transition ${
                avatar === a.key ? "bg-indigo-100 ring-2 ring-indigo-500" : "hover:bg-slate-100"
              }`}
            >
              {a.emoji}
            </button>
          ))}
        </div>

        <p className="mt-5 font-semibold">Colour</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {(Object.keys(COLORS) as ColorKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setColor(k)}
              aria-label={COLORS[k].label}
              aria-pressed={color === k}
              className={`h-10 w-10 rounded-full ${COLORS[k].dot} ${
                color === k ? "ring-4 ring-slate-900/20 ring-offset-2" : ""
              }`}
            />
          ))}
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setError(null);
              const ok = await setChildAvatar(child.id, avatar, color);
              setSaving(false);
              if (ok) onClose();
              else setError("Couldn't save right now. Ask a parent to check the app is up to date.");
            }}
            className="rounded-full bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
