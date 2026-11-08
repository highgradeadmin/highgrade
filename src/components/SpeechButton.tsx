"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// The browser's built-in speech recognition (free; Chrome, Edge and Safari — not Firefox).
// Chrome/Edge send the audio to Google and Safari to Apple for recognition; HighGrade never
// receives or stores audio. Parents turn this on per child in the parent area.

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noop = () => () => {};

/** Joins spoken words onto existing text with sensible spacing and a capital at sentence starts. */
export function joinSpoken(before: string, spoken: string, after = "") {
  let words = spoken.trim();
  if (!words) return { text: before + after, caret: before.length };
  const startOfSentence = !before.trim() || /[.!?]\s*$/.test(before);
  if (startOfSentence) words = words[0].toUpperCase() + words.slice(1);
  const lead = before && !/\s$/.test(before) ? " " : "";
  const trail = after && !/^\s/.test(after) ? " " : "";
  const inserted = lead + words + trail;
  return { text: before + inserted + after, caret: before.length + inserted.length };
}

export function SpeechButton({
  onText,
  onInterim,
  label = "Speak",
  size = "md",
}: {
  /** Called with each finished phrase. */
  onText: (spoken: string) => void;
  /**
   * Called with the words still being recognised ("" between phrases, null once listening stops),
   * so the caller can show them in place. Without it, they're shown under the button.
   */
  onInterim?: (pending: string | null) => void;
  label?: string;
  size?: "sm" | "md";
}) {
  const supported = useSyncExternalStore(noop, () => recognitionCtor() !== null, () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  const onInterimRef = useRef(onInterim);

  useEffect(() => {
    onTextRef.current = onText;
    onInterimRef.current = onInterim;
  });
  useEffect(() => () => recRef.current?.stop(), []);

  if (!supported) return null;

  function start() {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = navigator.language?.startsWith("en") ? navigator.language : "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) onTextRef.current(r[0].transcript);
        else pending += r[0].transcript;
      }
      setInterim(pending);
      onInterimRef.current?.(pending);
    };
    rec.onerror = (e) => {
      if (e.error === "aborted") return;
      setError(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "The microphone is blocked. Ask a parent to allow it for this site in the browser."
          : e.error === "no-speech"
            ? "I didn't hear anything. Tap 🎤 and try again."
            : "Speech stopped. Tap 🎤 to try again.",
      );
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      setInterim("");
      onInterimRef.current?.(null);
    };
    recRef.current = rec;
    setError(null);
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      setError("Couldn't start the microphone. Try again.");
    }
  }

  const sizing = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-sm";

  return (
    <span className="inline-flex max-w-full flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => (listening ? recRef.current?.stop() : start())}
        aria-pressed={listening}
        title={listening ? "Stop listening" : "Speak instead of typing"}
        className={`inline-flex items-center gap-1 rounded-full border font-semibold transition ${sizing} ${
          listening
            ? "border-rose-500 bg-rose-600 text-white"
            : "border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
        }`}
      >
        <span aria-hidden className={listening ? "motion-safe:animate-pulse" : undefined}>
          {listening ? "⏺" : "🎤"}
        </span>
        {listening ? "Stop" : label}
      </button>
      {listening && (
        <span className="text-xs text-slate-500" aria-live="polite">
          {interim && !onInterim ? <i>{interim}…</i> : "Listening… start talking."}
        </span>
      )}
      {error && <span className="text-xs text-rose-700">{error}</span>}
    </span>
  );
}
