import { billingEnabled, planStatus, TRIAL_DAYS } from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";

/** The logged-in parent's family plan status. */
export async function GET() {
  if (!billingEnabled()) return Response.json({ enabled: false });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const parentId = auth?.claims.sub;
  if (!parentId) return Response.json({ error: "Please log in." }, { status: 401 });
  try {
    return Response.json({ enabled: true, trialDays: TRIAL_DAYS, ...(await planStatus(supabase, parentId)) });
  } catch (err) {
    console.error("Billing status error", err instanceof Error ? err.message : err);
    return Response.json({ error: "Couldn't check your plan right now." }, { status: 502 });
  }
}
