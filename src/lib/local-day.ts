"use client";

import { useSyncExternalStore } from "react";

/** Today's date on this device ("YYYY-MM-DD"), so the Daily Write changes at the child's own midnight. */
function localToday() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Fixed while the page is in use, so a child writing past midnight keeps their piece on screen.
// It moves to the new day when they come back to the tab.
let current: string | null = null;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onVisible = () => {
    if (document.visibilityState !== "visible") return;
    const now = localToday();
    if (now !== current) {
      current = now;
      listeners.forEach((l) => l());
    }
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    listeners.delete(onChange);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

function getSnapshot() {
  current ??= localToday();
  return current;
}

/** null during server rendering; the local date once in the browser. */
export function useLocalDay(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
