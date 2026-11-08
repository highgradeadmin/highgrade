import type Stripe from "stripe";
import { billingEnabled, stripe } from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";

export interface AdminPlan {
  status: Stripe.Subscription.Status;
  interval: "month" | "year" | null;
  amount: number | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

const LIVE: Stripe.Subscription.Status[] = ["active", "trialing", "past_due"];

/** Admin only: every family's Stripe subscription, keyed by parent id. */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims.sub) return Response.json({ error: "Please log in." }, { status: 401 });
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return Response.json({ error: "Admins only." }, { status: 403 });
  if (!billingEnabled()) return Response.json({ enabled: false, plans: {} });

  try {
    const plans: Record<string, AdminPlan> = {};
    for await (const sub of stripe().subscriptions.list({ status: "all", limit: 100, expand: ["data.customer"] })) {
      const customer = typeof sub.customer === "string" ? null : sub.customer;
      const parentId =
        sub.metadata?.parent_id || (customer && !customer.deleted ? customer.metadata?.parent_id : undefined);
      if (!parentId) continue;
      // Keep the live subscription if there is one, otherwise the newest.
      const current = plans[parentId];
      if (current && LIVE.includes(current.status) && !LIVE.includes(sub.status)) continue;
      const item = sub.items.data[0];
      const interval: string | undefined = item?.price.recurring?.interval;
      plans[parentId] = {
        status: sub.status,
        interval: interval === "month" || interval === "year" ? interval : null,
        amount: item?.price.unit_amount ?? null,
        periodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end || sub.cancel_at),
      };
    }
    return Response.json({ enabled: true, plans });
  } catch (err) {
    console.error("Admin plans error", err instanceof Error ? err.message : err);
    return Response.json({ error: "Couldn't load plans from Stripe." }, { status: 502 });
  }
}
