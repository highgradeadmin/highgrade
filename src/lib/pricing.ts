// Claude API list prices in USD per million tokens (first-party API).
// Used only to ESTIMATE cost in the admin dashboard — your Anthropic Console
// billing page is the source of truth. Update if prices change.
// Cache writes are priced at 1.25× input (5-minute cache).
const PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
};

const DEFAULT_MODEL = "claude-opus-5-5";

export interface ModelUsage {
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
}

export function estimateCost(byModel: Record<string, ModelUsage>): number {
  let usd = 0;
  for (const [model, u] of Object.entries(byModel)) {
    const p = PRICES[model] ?? PRICES[DEFAULT_MODEL];
    usd +=
      (u.input * p.input + u.output * p.output + u.cache_read * p.cacheRead + u.cache_write * p.cacheWrite) /
      1_000_000;
  }
  return usd;
}

export function formatUsd(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  return n.toLocaleString();
}
