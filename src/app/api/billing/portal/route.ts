import { billingEnabled, ensureCustomer, pinOk, stripe } from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";

/** Opens Stripe's customer portal: change card, switch monthly/yearly, invoices, cancel. */
export async function POST(request: Request) {
  if (!billingEnabled()) return Response.json({ error: "Billing isn't set up." }, { status: 503 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const parentId = auth?.claims.sub;
  if (!parentId) return Response.json({ error: "Please log in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { pin?: string };
  if (!(await pinOk(supabase, body.pin))) {
    return Response.json({ error: "Your PIN was not accepted. Please unlock the parent area again." }, { status: 403 });
  }
  try {
    const customer = await ensureCustomer(supabase, parentId, auth.claims.email as string | undefined);
    const session = await stripe().billingPortal.sessions.create({
      customer,
      return_url: `${new URL(request.url).origin}/parent`,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Portal error", err instanceof Error ? err.message : err);
    return Response.json({ error: "Couldn't open plan settings. Please try again." }, { status: 502 });
  }
}
