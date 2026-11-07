/** Profile avatars a child can choose. Keys must match the check in migration 0003. */
export const AVATARS = [
  { key: "owl", emoji: "🦉", label: "Owl" },
  { key: "fox", emoji: "🦊", label: "Fox" },
  { key: "cat", emoji: "🐱", label: "Cat" },
  { key: "dog", emoji: "🐶", label: "Dog" },
  { key: "panda", emoji: "🐼", label: "Panda" },
  { key: "tiger", emoji: "🐯", label: "Tiger" },
  { key: "frog", emoji: "🐸", label: "Frog" },
  { key: "unicorn", emoji: "🦄", label: "Unicorn" },
  { key: "octopus", emoji: "🐙", label: "Octopus" },
  { key: "penguin", emoji: "🐧", label: "Penguin" },
  { key: "dragon", emoji: "🐲", label: "Dragon" },
  { key: "robot", emoji: "🤖", label: "Robot" },
] as const;

/** Colour keys with full class names (Tailwind needs literal strings). */
export const COLORS = {
  indigo: { bg: "bg-indigo-100", ring: "ring-indigo-400", dot: "bg-indigo-500", label: "Blue" },
  emerald: { bg: "bg-emerald-100", ring: "ring-emerald-400", dot: "bg-emerald-500", label: "Green" },
  amber: { bg: "bg-amber-100", ring: "ring-amber-400", dot: "bg-amber-400", label: "Yellow" },
  rose: { bg: "bg-rose-100", ring: "ring-rose-400", dot: "bg-rose-500", label: "Pink" },
  sky: { bg: "bg-sky-100", ring: "ring-sky-400", dot: "bg-sky-500", label: "Sky" },
  violet: { bg: "bg-violet-100", ring: "ring-violet-400", dot: "bg-violet-500", label: "Purple" },
} as const;

export type ColorKey = keyof typeof COLORS;
export const DEFAULT_COLORS = Object.keys(COLORS) as ColorKey[];

export function avatarEmoji(key: string) {
  return AVATARS.find((a) => a.key === key)?.emoji ?? "🦉";
}

export function colorOf(key: string) {
  return COLORS[key as ColorKey] ?? COLORS.indigo;
}
