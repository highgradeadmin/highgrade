import { billingEnabled, cancelAllSubscriptions, pinOk } from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";

/**
 * Deletes the logged-in family: cancels their Stripe plan first (so nobody is charged
 * again), then deletes the login, which removes the parent, children, writing and scores.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const parentId = auth?.claims.sub;
  if (!parentId) return Response.json({ error: "Please log in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { pin?: string; confirm?: string };
  if (body.confirm !== "DELETE") {
    return Response.json({ error: "Type DELETE to confirm." }, { status: 400 });
  }
  let pinAccepted = false;
  try {
    pinAccepted = await pinOk(supabase, body.pin);
  } catch {
    pinAccepted = false;
  }
  if (!pinAccepted) {
    return Response.json({ error: "Your PIN was not accepted. Please unlock the parent area again." }, { status: 403 });
  }
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin === true) {
    return Response.json(
      { error: "This is an admin account, so it can't be deleted here. Remove its admin access first." },
      { status: 409 },
    );
  }

  // 1. Stop billing. If this fails, nothing is deleted.
  if (billingEnabled()) {
    try {
      await cancelAllSubscriptions(supabase, parentId);
    } catch (err) {
      console.error("Account delete: cancel failed", err instanceof Error ? err.message : err);
      return Response.json(
        { error: "Couldn't cancel your plan, so nothing was deleted. Please try again in a minute." },
        { status: 502 },
      );
    }
  }

  // 2. Delete the account and everything in it.
  const { data, error } = await supabase.rpc("delete_my_account", { p_pin: body.pin });
  if (error || data !== true) {
    console.error("Account delete failed", error?.message);
    return Response.json(
      {
        error:
          "Your plan was cancelled, but the account couldn't be deleted. Please try again, or contact us and we'll delete it for you.",
      },
      { status: 500 },
    );
  }
  await supabase.auth.signOut().catch(() => {});
  return Response.json({ ok: true });
}
