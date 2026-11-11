import { billingEnabled, freeTries, planStatus } from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";
import { FREE_BETA } from "@/lib/plans";
import { allowance } from "@/lib/usage";

/** The logged-in parent's family plan status (or, during the free beta, their free tries). */
export async function GET() {
  if (!billingEnabled() && !FREE_BETA) return Response.json({ enabled: false });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const parentId = auth?.claims.sub;
  if (!parentId) return Response.json({ error: "Please log in." }, { status: 401 });
  try {
    if (FREE_BETA) {
      // Families who already subscribed keep unlimited feedback; everyone else uses free tries.
      const [plan, free] = await Promise.all([
        billingEnabled() ? planStatus(supabase, parentId) : null,
        freeTries(supabase),
      ]);
      return Response.json({ enabled: true, beta: true, ...plan, active: plan?.active ?? false, freeTries: free, allowance: allowance() });
    }
    const [plan, free] = await Promise.all([planStatus(supabase, parentId), freeTries(supabase)]);
    return Response.json({ enabled: true, ...plan, freeTries: free, allowance: allowance() });
  } catch (err) {
    console.error("Billing status error", err instanceof Error ? err.message : err);
    return Response.json({ error: "Couldn't check your plan right now." }, { status: 502 });
  }
}
