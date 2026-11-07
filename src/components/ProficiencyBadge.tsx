import { STATUS_UI, type Status } from "@/lib/proficiency";

export function ProficiencyBadge({ status, size = "sm" }: { status: Status; size?: "sm" | "md" }) {
  const ui = STATUS_UI[status];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-medium ${ui.className} ${
        size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"
      }`}
    >
      {ui.icon && <span aria-hidden>{ui.icon}</span>}
      {ui.label}
    </span>
  );
}
