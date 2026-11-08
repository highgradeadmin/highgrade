"use client";

import { DEFAULT_COLORS } from "./avatars";
import { useSyncExternalStore } from "react";
import type { Feedback } from "./feedback";
import type { Genre } from "./lessons";
import { createClient, supabaseConfigured } from "./supabase/client";

// Client-side store backed by Supabase.
// A login belongs to a PARENT. The parent's children are profiles; one child is
// "active" on this device and all writing is saved for that child. Components
// read an in-memory snapshot (instant typing); edits save in the background.

export interface Child {
  id: string;
  name: string;
  grade: number;
  birthYear: number | null;
  /** Lesson level band, e.g. "5-6". */
  level: string;
  /** Avatar key (see lib/avatars.ts) and colour key, chosen by the child. */
  avatar: string;
  color: string;
  /** Parent has allowed speech-to-text (🎤) for this child. */
  voiceTyping: boolean;
}

/** The active child's profile (what the writing pages need). */
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
  /** "needs-setup": signed in (e.g. with Google) but the parent hasn't finished setup yet. */
  status: "loading" | "signed-out" | "needs-setup" | "ready" | "unconfigured";
  userId: string | null;
  /** Name from the sign-in provider (Google), used to prefill setup. */
  providerName: string | null;
  parentName: string | null;
  children: Child[];
  activeChildId: string | null;
  /** Works for the active child only. */
  works: Record<string, Work>;
  worksLoading: boolean;
  save: SaveStatus;
  isAdmin: boolean;
  /** Parent area unlocked on this page (until this time, ms). */
  unlockedUntil: number;
}

let state: State = {
  status: supabaseConfigured ? "loading" : "unconfigured",
  userId: null,
  providerName: null,
  parentName: null,
  children: [],
  activeChildId: null,
  works: {},
  worksLoading: false,
  save: "saved",
  isAdmin: false,
  unlockedUntil: 0,
};
const SERVER_STATE = state;
const listeners = new Set<() => void>();

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

// ─── Remember the active child on this device (convenience only) ───────────
const childKey = (userId: string) => `hg:active-child:${userId}`;
function rememberChild(userId: string, childId: string | null) {
  try {
    if (childId) window.localStorage.setItem(childKey(userId), childId);
    else window.localStorage.removeItem(childKey(userId));
  } catch {
    // Storage blocked: the child just picks their profile again next time.
  }
}
function recallChild(userId: string): string | null {
  try {
    return window.localStorage.getItem(childKey(userId));
  } catch {
    return null;
  }
}

// ─── Loading ────────────────────────────────────────────────────────────────
let started = false;
function start() {
  if (started || !supabaseConfigured || typeof window === "undefined") return;
  started = true;
  createClient().auth.onAuthStateChange((_event, session) => {
    const userId = session?.user.id ?? null;
    if (userId === state.userId && state.status !== "loading") return;
    if (!userId) {
      parentPin = null;
      setState({
        status: "signed-out",
        userId: null,
        parentName: null,
        children: [],
        activeChildId: null,
        works: {},
        isAdmin: false,
        unlockedUntil: 0,
      });
      return;
    }
    const meta = session?.user.user_metadata ?? {};
    const providerName = (meta.full_name ?? meta.name ?? null) as string | null;
    // Defer: Supabase recommends not awaiting other calls inside this callback.
    setTimeout(() => void load(userId, providerName), 0);
  });
}

type ChildRow = {
  id: string;
  name: string;
  grade: number;
  birth_year: number | null;
  level: string;
  avatar?: string;
  color?: string;
  voice_typing?: boolean;
};

function toChild(r: ChildRow, i: number): Child {
  return {
    id: r.id,
    name: r.name,
    grade: r.grade,
    birthYear: r.birth_year,
    level: r.level,
    avatar: r.avatar ?? "owl",
    color: r.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    voiceTyping: r.voice_typing ?? false,
  };
}

async function fetchChildren(): Promise<Child[]> {
  const { data } = await createClient()
    .from("children")
    // "*" so profiles still load if the avatar migration (0003) hasn't been run yet.
    .select("*")
    .order("created_at", { ascending: true });
  return ((data ?? []) as ChildRow[]).map(toChild);
}

async function load(userId: string, providerName: string | null = state.providerName) {
  const supabase = createClient();
  const [parentRes, children, adminRes] = await Promise.all([
    supabase.from("parents").select("name").eq("id", userId).maybeSingle(),
    fetchChildren(),
    supabase.rpc("is_admin"),
  ]);
  if (!parentRes.error && !parentRes.data) {
    setState({ status: "needs-setup", userId, providerName, isAdmin: adminRes.data === true });
    return;
  }
  const remembered = recallChild(userId);
  const activeChildId = children.some((c) => c.id === remembered) ? remembered : null;
  setState({
    status: "ready",
    userId,
    providerName,
    parentName: parentRes.data?.name ?? null,
    children,
    activeChildId,
    works: {},
    isAdmin: adminRes.data === true,
    save: parentRes.error ? "error" : "saved",
  });
  if (activeChildId) await loadWorks(activeChildId);
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

async function loadWorks(childId: string) {
  setState({ worksLoading: true });
  const { data, error } = await createClient()
    .from("works")
    .select(
      "task_key, lesson_slug, title, prompt, genre, notes, outline, text, checked, updated_at, drafts(text, feedback, created_at)",
    )
    .eq("child_id", childId)
    .order("created_at", { referencedTable: "drafts", ascending: true });
  if (state.activeChildId !== childId) return; // switched meanwhile
  const works: Record<string, Work> = {};
  for (const r of (data ?? []) as WorkRow[]) {
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
  setState({ works, worksLoading: false, save: error ? "error" : "saved" });
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

export function useIsAdmin() {
  return useStore((s) => s.isAdmin);
}

export function useSaveStatus() {
  return useStore((s) => s.save);
}

export function useProviderName() {
  return useStore((s) => s.providerName);
}

/** "Finish setting up" for logins without a parent record yet (e.g. Google sign-in). */
export async function completeParentSignup(name: string, birthYear: number, consent: boolean) {
  const { error } = await createClient().rpc("complete_parent_signup", {
    p_name: name,
    p_birth_year: birthYear,
    p_consent: consent,
  });
  if (error) return error.message;
  if (state.userId) await load(state.userId);
  return null;
}

export function useParentName() {
  return useStore((s) => s.parentName);
}

export function useChildren() {
  return useStore((s) => s.children);
}

export function useActiveChild(): Child | null {
  return useStore((s) => s.children.find((c) => c.id === s.activeChildId) ?? null);
}

/** The active child's profile, or null when no child is selected. */
export function useProfile(): Child | null {
  return useActiveChild();
}

export function useWorksLoading() {
  return useStore((s) => s.worksLoading);
}

export function useAllWorkMap() {
  return useStore((s) => s.works);
}

/** Latest saved copy of a piece (outside React; used when several updates arrive quickly). */
export function getWork(id: string): Work | undefined {
  return state.works[id];
}

export function useWork(id: string): Work | undefined {
  return useStore((s) => s.works[id]);
}

export function getActiveChildId() {
  return state.activeChildId;
}

// ─── Choosing a child ───────────────────────────────────────────────────────

export async function selectChild(childId: string | null) {
  await flushAll();
  if (!state.userId) return;
  rememberChild(state.userId, childId);
  setState({ activeChildId: childId, works: {} });
  if (childId) await loadWorks(childId);
}

// ─── Saving writing ─────────────────────────────────────────────────────────

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const pending = new Map<string, Promise<void>>();

/** Update a work locally right away; persist after a short pause in typing. */
export function saveWork(work: Work) {
  if (!state.userId || !state.activeChildId) return;
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
  const childId = state.activeChildId;
  if (!w || !state.userId || !childId) return;
  const p = (async () => {
    const { error } = await createClient()
      .from("works")
      .upsert(
        {
          child_id: childId,
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
        { onConflict: "child_id,task_key" },
      );
    if (timers.size === 0) setState({ save: error ? "error" : "saved" });
  })();
  pending.set(id, p);
  await p;
  pending.delete(id);
}

async function flushAll() {
  await Promise.all([...timers.keys()].map((id) => flushWork(id)));
}

/** Record a draft the server just created alongside its feedback. */
export function addDraft(id: string, draft: Draft) {
  const w = state.works[id];
  if (!w) return;
  setState({ works: { ...state.works, [id]: { ...w, drafts: [...w.drafts, draft] } } });
}

export async function signOut() {
  await flushAll();
  if (state.userId) rememberChild(state.userId, null);
  await createClient().auth.signOut();
}

// ─── Parent area (PIN) ──────────────────────────────────────────────────────
// The PIN is kept in memory only while the parent area is unlocked, because the
// server checks it again for every parent-only action.

const UNLOCK_MS = 10 * 60 * 1000;
let parentPin: string | null = null;
let lockTimer: ReturnType<typeof setTimeout> | undefined;

function setUnlocked(pin: string) {
  parentPin = pin;
  clearTimeout(lockTimer);
  lockTimer = setTimeout(lockParentArea, UNLOCK_MS);
  setState({ unlockedUntil: Date.now() + UNLOCK_MS });
}

export function lockParentArea() {
  parentPin = null;
  clearTimeout(lockTimer);
  setState({ unlockedUntil: 0 });
}

export function useParentUnlocked() {
  return useStore((s) => s.unlockedUntil > 0);
}

export interface PinStatus {
  hasPin: boolean;
  lockedUntil: string | null;
  canReset: boolean;
}

export async function getPinStatus(): Promise<PinStatus | null> {
  const { data, error } = await createClient().rpc("parent_pin_status");
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return null;
  return { hasPin: row.has_pin, lockedUntil: row.locked_until, canReset: row.can_reset };
}

/** Returns an error message, or null on success. */
export async function unlockParentArea(pin: string): Promise<string | null> {
  const { data, error } = await createClient().rpc("verify_parent_pin", { p_pin: pin });
  if (error) return error.message;
  if (data !== true) return "That PIN isn't right. After 5 wrong tries the parent area locks for 15 minutes.";
  setUnlocked(pin);
  return null;
}

/** Set a first PIN, change it (needs current PIN), or reset it right after logging in. */
export async function setParentPin(newPin: string, currentPin?: string): Promise<string | null> {
  const { data, error } = await createClient().rpc("set_parent_pin", {
    p_new_pin: newPin,
    p_current_pin: currentPin ?? null,
  });
  if (error) return error.message;
  if (data !== true) return "Your current PIN isn't right.";
  setUnlocked(newPin);
  return null;
}

async function withPin<T>(fn: (pin: string) => PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  if (!parentPin) return { ok: false as const, error: "The parent area is locked. Enter your PIN again." };
  const { data, error } = await fn(parentPin);
  if (error) return { ok: false as const, error: error.message };
  if (data === null || data === false) {
    lockParentArea();
    return { ok: false as const, error: "Your PIN was not accepted. Please unlock the parent area again." };
  }
  setState({ children: await fetchChildren() });
  return { ok: true as const, data };
}

export function addChild(name: string, grade: number, birthYear: number | null) {
  return withPin<string | null>(async (pin) =>
    createClient().rpc("add_child", { p_pin: pin, p_name: name, p_grade: grade, p_birth_year: birthYear }),
  );
}

export function updateChild(id: string, name: string, grade: number, level: string) {
  return withPin<boolean>(async (pin) =>
    createClient().rpc("update_child", { p_pin: pin, p_child: id, p_name: name, p_grade: grade, p_level: level }),
  );
}

// ── Family plan (Stripe) ──

export interface PlanInfo {
  enabled: boolean;
  active?: boolean;
  status?: string | null;
  interval?: "month" | "year" | null;
  trialEnd?: string | null;
  periodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  hadSubscription?: boolean;
  /** Free coach feedback tries (no card): counted per email address. */
  freeTries?: { used: number; limit: number; left: number };
  /** What a plan includes each month (fair use, for the whole family). */
  allowance?: { monthlyTokens: number; dailyLimit: number; approxFeedbacks: number };
  error?: string;
}

/** The family's coach feedback usage (see src/lib/usage.ts). */
export interface UsageInfo {
  monthTokens: number;
  monthlyTokens: number;
  monthRequests: number;
  perChild: Record<string, number>;
  todayRequests: number;
  dailyLimit: number;
  tokensPerFeedback: number;
  feedbackLeft: number;
  resetsAt: string;
  error?: string;
}

export async function fetchUsage(): Promise<UsageInfo | null> {
  try {
    const res = await fetch("/api/usage", { cache: "no-store" });
    return res.ok ? ((await res.json()) as UsageInfo) : null;
  } catch {
    return null;
  }
}

export async function fetchPlan(): Promise<PlanInfo> {
  try {
    const res = await fetch("/api/billing", { cache: "no-store" });
    const data = (await res.json()) as PlanInfo;
    return res.ok ? data : { enabled: true, error: data.error ?? "Couldn't check your plan." };
  } catch {
    return { enabled: true, error: "Couldn't check your plan." };
  }
}

/** Opens Stripe Checkout or the customer portal (needs the unlocked parent area). Returns an error or redirects. */
export async function openBilling(action: "checkout" | "portal", interval: "month" | "year" = "month") {
  if (!parentPin) return "The parent area is locked. Enter your PIN again.";
  try {
    const res = await fetch(`/api/billing/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: parentPin, interval }),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (res.status === 403) lockParentArea();
    if (!res.ok || !data.url) return data.error ?? "Something went wrong.";
    window.location.assign(data.url);
    return null;
  } catch {
    return "Couldn't reach the server. Check your connection.";
  }
}

/** Deletes the whole family account (cancels the plan first). Returns an error, or null when done. */
export async function deleteAccount(confirm: string): Promise<string | null> {
  if (!parentPin) return "The parent area is locked. Enter your PIN again.";
  try {
    await flushAll();
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: parentPin, confirm }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (res.status === 403) lockParentArea();
    if (!res.ok || !data.ok) return data.error ?? "Something went wrong.";
    if (state.userId) rememberChild(state.userId, null);
    lockParentArea();
    await createClient().auth.signOut();
    return null;
  } catch {
    return "Couldn't reach the server. Check your connection.";
  }
}

/** Parent turns speech-to-text on or off for a child (needs the parent PIN). */
export function setChildVoiceTyping(id: string, enabled: boolean) {
  return withPin<boolean>(async (pin) =>
    createClient().rpc("set_child_voice_typing", { p_pin: pin, p_child: id, p_enabled: enabled }),
  );
}

/** Move the active child up one level (offered once every lesson in their level is proficient). */
export async function advanceChildLevel(childId: string): Promise<string | null> {
  const { data, error } = await createClient().rpc("advance_child_level", { p_child: childId });
  if (error || !data) return null;
  setState({ children: await fetchChildren() });
  return data as string;
}

/** The child picks their own avatar and colour (no PIN; only for this parent's children). */
export async function setChildAvatar(childId: string, avatar: string, color: string): Promise<boolean> {
  const { data, error } = await createClient().rpc("set_child_avatar", {
    p_child: childId,
    p_avatar: avatar,
    p_color: color,
  });
  if (error || !data) return false;
  setState({ children: await fetchChildren() });
  return true;
}

export async function deleteChild(id: string) {
  const res = await withPin<boolean>(async (pin) => createClient().rpc("delete_child", { p_pin: pin, p_child: id }));
  if (res.ok && state.activeChildId === id) await selectChild(null);
  return res;
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (e) => {
    if (timers.size > 0) {
      void flushAll();
      e.preventDefault();
    }
  });
}
