// Server-only: fair-use limits per family (all children together), counted from ai_usage.
// ai_usage rows stay when a child is removed, so removing and re-adding children doesn't reset them.
import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Feedback requests per family per rolling 24 hours. */
export const FAMILY_DAILY_LIMIT = Number(process.env.FAMILY_DAILY_LIMIT ?? 20);
/** Claude tokens (input + output) per family per calendar month (UTC). */
export const FAMILY_MONTHLY_TOKENS = Number(process.env.FAMILY_MONTHLY_TOKENS ?? 400_000);
/** Typical tokens for one feedback, used to turn tokens into "about N feedbacks". */
export const TYPICAL_TOKENS_PER_FEEDBACK = Number(process.env.TYPICAL_TOKENS_PER_FEEDBACK ?? 7_500);

/** What a plan includes, for the plan card. */
export function allowance() {
  return {
    monthlyTokens: FAMILY_MONTHLY_TOKENS,
    dailyLimit: FAMILY_DAILY_LIMIT,
    approxFeedbacks: Math.floor(FAMILY_MONTHLY_TOKENS / TYPICAL_TOKENS_PER_FEEDBACK),
  };
}

export interface FamilyUsage {
  monthTokens: number;
  monthlyTokens: number;
  monthRequests: number;
  /** Feedback requests this month per child id (removed children are left out). */
  perChild: Record<string, number>;
  todayRequests: number;
  dailyLimit: number;
  /** This family's own average once they have a few requests, otherwise the typical size. */
  tokensPerFeedback: number;
  feedbackLeft: number;
  resetsAt: string;
}

export async function familyUsage(supabase: ServerClient, parentId: string): Promise<FamilyUsage> {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const since = dayAgo < monthStart ? dayAgo : monthStart;

  const { data, error } = await supabase
    .from("ai_usage")
    .select("child_id, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, created_at")
    .eq("parent_id", parentId)
    .gte("created_at", since.toISOString())
    .limit(10000);
  if (error) throw new Error(`Usage check failed: ${error.message}`);
  const rows = data ?? [];

  // One feedback request can log several rows (one per model) with the same timestamp.
  const today = new Set<string>();
  const month = new Set<string>();
  const perChildSets: Record<string, Set<string>> = {};
  let monthTokens = 0;
  for (const r of rows) {
    const at = new Date(r.created_at);
    if (at >= dayAgo) today.add(r.created_at);
    if (at < monthStart) continue;
    month.add(r.created_at);
    if (r.child_id) (perChildSets[r.child_id] ??= new Set()).add(r.created_at);
    monthTokens += r.input_tokens + r.output_tokens + r.cache_read_tokens + r.cache_write_tokens;
  }

  const tokensPerFeedback = month.size >= 3 ? Math.round(monthTokens / month.size) : TYPICAL_TOKENS_PER_FEEDBACK;
  return {
    monthTokens,
    monthlyTokens: FAMILY_MONTHLY_TOKENS,
    monthRequests: month.size,
    perChild: Object.fromEntries(Object.entries(perChildSets).map(([id, s]) => [id, s.size])),
    todayRequests: today.size,
    dailyLimit: FAMILY_DAILY_LIMIT,
    tokensPerFeedback,
    feedbackLeft: Math.max(0, Math.floor((FAMILY_MONTHLY_TOKENS - monthTokens) / Math.max(1, tokensPerFeedback))),
    resetsAt: resetsAt.toISOString(),
  };
}

/** The message a child sees when the family is over a limit, or null. */
export function limitMessage(u: FamilyUsage): string | null {
  if (u.todayRequests >= u.dailyLimit) {
    return `Your family has used today's ${u.dailyLimit} coach feedback requests. Keep writing, and try again tomorrow!`;
  }
  if (u.monthTokens >= u.monthlyTokens) {
    const date = new Date(u.resetsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
    return `Your family has used this month's coach feedback. It resets on ${date}.`;
  }
  return null;
}
