// Helpers for the practice step (word swaps and "try it, then peek"). Shared by the API and the UI.

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Finds `word` inside `sentence` as a whole word (ignoring case). */
export function findWord(sentence: string, word: string) {
  const w = word.trim();
  if (!w) return null;
  const m = new RegExp(`(?<![A-Za-z0-9'])${escape(w)}(?![A-Za-z0-9'])`, "i").exec(sentence);
  return m ? { index: m.index, text: m[0] } : null;
}

/** The sentence with `word` changed to `choice` (keeping a capital letter), or null if not found. */
export function swapWord(sentence: string, word: string, choice: string) {
  const found = findWord(sentence, word);
  if (!found) return null;
  const capital = /^[A-Z]/.test(found.text);
  const next = capital ? choice.charAt(0).toUpperCase() + choice.slice(1) : choice;
  return sentence.slice(0, found.index) + next + sentence.slice(found.index + found.text.length);
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** `text` contains `part` as whole words, matching case (so "i" and "I" differ). */
const hasExact = (text: string, part: string) => {
  const before = /^[A-Za-z0-9']/.test(part) ? "(?<![A-Za-z0-9'])" : "";
  const after = /[A-Za-z0-9']$/.test(part) ? "(?![A-Za-z0-9'])" : "";
  return new RegExp(`${before}${escape(part)}${after}`).test(text);
};

/** True if the student's version of the sentence makes the fix and no longer has the mistake. */
export function isFixed(attempt: string, mistake: string, fix: string) {
  const a = squash(attempt);
  const m = squash(mistake);
  const f = squash(fix);
  if (!f || !hasExact(a, f)) return false;
  // When the fix contains the mistake (e.g. adding a full stop), finding the fix is enough.
  return hasExact(f, m) || !hasExact(a, m);
}

/** `text` with the first `from` replaced by `to`, or null if `from` isn't in it any more. */
export function replaceOnce(text: string, from: string, to: string) {
  const i = from ? text.indexOf(from) : -1;
  return i === -1 ? null : text.slice(0, i) + to + text.slice(i + from.length);
}
