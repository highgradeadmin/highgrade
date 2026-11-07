"use client";

import { useEffect, useId, useSyncExternalStore } from "react";

// Only one thing reads aloud at a time; every button listens to which one.
let speakingId: string | null = null;
const listeners = new Set<() => void>();
function setSpeaking(id: string | null) {
  speakingId = id;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const supported = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** Picks a clear English voice once the browser has loaded its voice list. */
function pickVoice() {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  const preferred = ["Samantha", "Google US English", "Microsoft Aria", "Microsoft Jenny", "Karen", "Daniel"];
  return voices.find((v) => preferred.some((p) => v.name.includes(p))) ?? voices.find((v) => v.default) ?? voices[0];
}

/** 🔊 button that reads `text` aloud with the browser's built-in voice (free, works offline). */
export function ReadAloud({ text, label = "Read to me", className = "" }: { text: string; label?: string; className?: string }) {
  const id = useId();
  const current = useSyncExternalStore(subscribe, () => speakingId, () => null);
  const canSpeak = useSyncExternalStore(subscribe, supported, () => false);
  const speaking = current === id;

  useEffect(
    () => () => {
      if (speakingId === id) {
        window.speechSynthesis.cancel();
        setSpeaking(null);
      }
    },
    [id],
  );

  if (!canSpeak || !text.trim()) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    synth.cancel();
    if (speaking) {
      setSpeaking(null);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.onend = u.onerror = () => {
      if (speakingId === id) setSpeaking(null);
    };
    setSpeaking(id);
    synth.speak(u);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
        speaking
          ? "border-indigo-500 bg-indigo-600 text-white"
          : "border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
      } ${className}`}
    >
      <span aria-hidden>{speaking ? "⏹" : "🔊"}</span>
      {speaking ? "Stop" : label}
    </button>
  );
}
