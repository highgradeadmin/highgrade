"use client";

import { useSyncExternalStore } from "react";
import type { Feedback } from "./feedback";
import type { Genre } from "./lessons";
import { createClient, supabaseConfigured } from "./supabase/client";

// Client-side store backed by Supabase. Components read from an in-memory
// snapshot (instant typing); edits are saved to the database in the background.

export interface Profile {
  name: string;
  grade: number;
}

export interface Draft {
  text: string;
  feedback: Feedback | null;
  at: string;
}

export interface Work {
  /** Stable task key, e.g. "lesson:topic-sentences" or "daily:2026-11-06". */
  id: string;
  lessonSlug: string | null;
  title: string;
  prompt: string;
  genre: Genre;
  notes: Record<string, string>;
  outline: string[];
  text: string;
  checked: number[];
  drafts: Draft[];
  updatedAt: string;
}

export type SaveStatus = "saved" | "saving" | "error";

interface State {
  status: "loading" | "signed-out" | "ready" | "unconfigured";
  userId: string | null;
  profile: Profile | null;
  works: Record<string, Work>;
  save: SaveStatus;
}

let state: State = {
  status: supabaseConfigured ? "loading" : "unconfigured",
  userId: null,
  profile: null,
  works: {},
  save: "saved",
};
const SERVER_STATE = state;
const listeners = new Set<() => void>();

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

let started = false;
function start() {
  if (started || !supabaseConfigured || typeof window === "undefined") return;
  started = true;
  const supabase = createClient();
  supabase.auth.onAuthStateChange((_event, session) => {
    const userId = session?.user.id ?? null;
    if (userId === state.userId && state.status !== "loading") return;
    if (!userId) {
      setState({ status: "signed-out", userId: null, profile: null, works: {} });
      return;
    }
    // Defer: Supabase recommends not awaiting other calls inside this callback.
    setTimeout(() => void load(userId), 0);
  });
}

interface WorkRow {
  task_key: string;
  lesson_slug: string | null;
  title: string;
  prompt: string;
  genre: Genre;
  notes: Record<string, string>;
  outline: string[];
  text: string;
  checked: number[];
  updated_at: string;
  drafts: { text: string; feedback: Feedback | null; created_at: string }[];
}

async function load(userId: string) {
  const supabase = createClient();
  const [profileRes, worksRes] = await Promise.all([
    supabase.from("profiles").select("name, grade").eq("id", userId).maybeSingle(),
    supabase
      .from("works")
      .select("task_key, lesson_slug, title, prompt, genre, notes, outline, text, checked, updated_at, drafts(text, feedback, created_at)")
      .order("created_at", { referencedTable: "drafts", ascending: true }),
  ]);
  const works: Record<string, Work> = {};
  for (const r of (worksRes.data ?? []) as WorkRow[]) {
    works[r.task_key] = {
      id: r.task_key,
      lessonSlug: r.lesson_slug,
      title: r.title,
      prompt: r.prompt,
      genre: r.genre,
      notes: r.notes ?? {},
      outline: r.outline ?? [],
      text: r.text,
      checked: r.checked ?? [],
      updatedAt: r.updated_at,
      drafts: r.drafts.map((d) => ({ text: d.text, feedback: d.feedback, at: d.created_at })),
    };
  }
  setState({
    status: "ready",
    userId,
    profile: (profileRes.data as Profile | null) ?? null,
    works,
    save: worksRes.error || profileRes.error ? "error" : "saved",
  });
}

function subscribe(cb: () => void) {
  start();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(SERVER_STATE),
  );
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useAuthStatus() {
  return useStore((s) => s.status);
}

export function useSaveStatus() {
  return useStore((s) => s.save);
}

export function useProfile(): [Profile | null, (p: Profile) => Promise<string | null>] {
  return [useStore((s) => s.profile), saveProfile];
}

export function useAllWorkMap() {
  return useStore((s) => s.works);
}

export function useWork(id: string): Work | undefined {
  return useStore((s) => s.works[id]);
}

// ─── Writes ─────────────────────────────────────────────────────────────────

async function saveProfile(p: Profile): Promise<string | null> {
  if (!state.userId) return "You're not signed in.";
  const { error } = await createClient()
    .from("profiles")
    .update({ name: p.name, grade: p.grade })
    .eq("id", state.userId);
  if (error) return error.message;
  setState({ profile: p });
  return null;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const pending = new Map<string, Promise<void>>();

/** Update a work locally right away; persist after a short pause in typing. */
export function saveWork(work: Work) {
  if (!state.userId) return;
  const updated = { ...work, updatedAt: new Date().toISOString() };
  setState({ works: { ...state.works, [work.id]: updated }, save: "saving" });
  clearTimeout(timers.get(work.id));
  timers.set(
    work.id,
    setTimeout(() => void flushWork(work.id), 800),
  );
}

/** Persist any pending edits for a work immediately. */
export async function flushWork(id: string): Promise<void> {
  clearTimeout(timers.get(id));
  timers.delete(id);
  await pending.get(id);
  const w = state.works[id];
  if (!w || !state.userId) return;
  const p = (async () => {
    const { error } = await createClient()
      .from("works")
      .upsert(
        {
          task_key: w.id,
          lesson_slug: w.lessonSlug,
          title: w.title,
          prompt: w.prompt,
          genre: w.genre,
          notes: w.notes,
          outline: w.outline,
          text: w.text,
          checked: w.checked,
          updated_at: w.updatedAt,
        },
        { onConflict: "user_id,task_key" },
      );
    if (timers.size === 0) setState({ save: error ? "error" : "saved" });
  })();
  pending.set(id, p);
  await p;
  pending.delete(id);
}

/** Record a draft the server just created alongside its feedback. */
export function addDraft(id: string, draft: Draft) {
  const w = state.works[id];
  if (!w) return;
  setState({ works: { ...state.works, [id]: { ...w, drafts: [...w.drafts, draft] } } });
}

export async function signOut() {
  await createClient().auth.signOut();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (e) => {
    if (timers.size > 0) {
      for (const id of [...timers.keys()]) void flushWork(id);
      e.preventDefault();
    }
  });
}
