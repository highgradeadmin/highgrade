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

/** `text` with the first `from` replaced by `to`, or null if `from` isn't in it any more. */
export function replaceOnce(text: string, from: string, to: string) {
  const i = from ? text.indexOf(from) : -1;
  return i === -1 ? null : text.slice(0, i) + to + text.slice(i + from.length);
}
