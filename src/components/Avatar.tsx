import { avatarEmoji, colorOf } from "@/lib/avatars";

const SIZES = { sm: "h-7 w-7 text-base", md: "h-12 w-12 text-2xl", lg: "h-20 w-20 text-5xl" } as const;

export function Avatar({ avatar, color, size = "md" }: { avatar: string; color: string; size?: keyof typeof SIZES }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${colorOf(color).bg} ${SIZES[size]}`}
    >
      {avatarEmoji(avatar)}
    </span>
  );
}
