// Server-only: Stripe family-plan billing. Never import this from a client component.
import Stripe from "stripe";
import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export const TRIAL_DAYS = 7;
export const PLAN_PRICES = { month: "family_monthly", year: "family_yearly" } as const;
export type PlanInterval = keyof typeof PLAN_PRICES;

/** Billing is only enforced when a Stripe key is configured (local setups without Stripe stay free). */
export function billingEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;
export function stripe() {
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!);
  return client;
}

export interface PlanStatus {
  /** Feedback is unlocked (trialing, active, or a payment being retried). */
  active: boolean;
  status: Stripe.Subscription.Status | null;
  interval: PlanInterval | null;
  trialEnd: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** Has had a subscription before (no second free trial). */
  hadSubscription: boolean;
}

const NONE: PlanStatus = {
  active: false,
  status: null,
  interval: null,
  trialEnd: null,
  periodEnd: null,
  cancelAtPeriodEnd: false,
  hadSubscription: false,
};

const iso = (t: number | null | undefined) => (t ? new Date(t * 1000).toISOString() : null);

/** The parent's Stripe customer, only if it really belongs to them (checked against Stripe metadata). */
async function verifiedCustomer(supabase: ServerClient, parentId: string): Promise<string | null> {
  const { data } = await supabase.from("parents").select("stripe_customer_id").eq("id", parentId).maybeSingle();
  const id = data?.stripe_customer_id as string | null | undefined;
  if (!id) return null;
  try {
    const c = await stripe().customers.retrieve(id);
    if (c.deleted || c.metadata?.parent_id !== parentId) return null;
    return c.id;
  } catch {
    return null;
  }
}

/** Live plan status from Stripe. */
export async function planStatus(supabase: ServerClient, parentId: string): Promise<PlanStatus> {
  const customer = await verifiedCustomer(supabase, parentId);
  if (!customer) return NONE;
  const subs = await stripe().subscriptions.list({ customer, status: "all", limit: 10 });
  // past_due: Stripe is retrying the card, so keep the children writing meanwhile.
  const live = subs.data.find((s) => s.status === "active" || s.status === "trialing" || s.status === "past_due");
  const item = live?.items.data[0];
  const interval: string | undefined = item?.price.recurring?.interval;
  return {
    active: Boolean(live),
    status: live?.status ?? subs.data[0]?.status ?? null,
    interval: interval === "month" ? "month" : interval === "year" ? "year" : null,
    trialEnd: live?.status === "trialing" ? iso(live.trial_end) : null,
    periodEnd: iso(item?.current_period_end),
    cancelAtPeriodEnd: Boolean(live?.cancel_at_period_end || live?.cancel_at),
    hadSubscription: subs.data.length > 0,
  };
}

/** Finds or creates the parent's Stripe customer and remembers it. */
export async function ensureCustomer(supabase: ServerClient, parentId: string, email: string | undefined) {
  const existing = await verifiedCustomer(supabase, parentId);
  if (existing) return existing;
  const { data: parent } = await supabase.from("parents").select("name").eq("id", parentId).maybeSingle();
  const c = await stripe().customers.create({
    email,
    name: (parent?.name as string | undefined) ?? undefined,
    metadata: { parent_id: parentId },
  });
  const { error } = await supabase.rpc("set_stripe_customer", { p_customer: c.id });
  if (error) throw new Error(`Couldn't save the billing account: ${error.message}`);
  return c.id;
}

/** Billing changes need the parent PIN too (children may use the same logged-in device). */
export async function pinOk(supabase: ServerClient, pin: unknown) {
  if (typeof pin !== "string" || !/^[0-9]{4,6}$/.test(pin)) return false;
  const { data } = await supabase.rpc("verify_parent_pin", { p_pin: pin });
  return data === true;
}
