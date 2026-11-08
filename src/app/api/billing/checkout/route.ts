import { billingEnabled, ensureCustomer, pinOk, PLAN_PRICES, planStatus, stripe } from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";

/** Starts Stripe Checkout for the family plan (no trial: families try it first with free tries). */
export async function POST(request: Request) {
  if (!billingEnabled()) return Response.json({ error: "Billing isn't set up." }, { status: 503 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const parentId = auth?.claims.sub;
  if (!parentId) return Response.json({ error: "Please log in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { interval?: string; pin?: string };
  if (!(await pinOk(supabase, body.pin))) {
    return Response.json({ error: "Your PIN was not accepted. Please unlock the parent area again." }, { status: 403 });
  }
  const interval = body.interval === "year" ? "year" : "month";

  try {
    const status = await planStatus(supabase, parentId);
    if (status.active) {
      return Response.json({ error: "You already have a plan. Use Manage plan to change it." }, { status: 409 });
    }
    const customer = await ensureCustomer(supabase, parentId, auth.claims.email as string | undefined);
    const prices = await stripe().prices.list({ lookup_keys: [PLAN_PRICES[interval]], active: true });
    const price = prices.data[0];
    if (!price) throw new Error(`Price ${PLAN_PRICES[interval]} not found — run scripts/stripe-setup.mjs`);

    const origin = new URL(request.url).origin;
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: parentId,
      line_items: [{ price: price.id, quantity: 1 }],
      subscription_data: { metadata: { parent_id: parentId } },
      allow_promotion_codes: true,
      success_url: `${origin}/parent?billing=success`,
      cancel_url: `${origin}/parent?billing=cancelled`,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error", err instanceof Error ? err.message : err);
    return Response.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
  }
}
