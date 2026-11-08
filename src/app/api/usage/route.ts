import { createClient } from "@/lib/supabase/server";
import { familyUsage } from "@/lib/usage";

/** The logged-in family's coach feedback usage this month and today, for the parent area. */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const parentId = auth?.claims.sub;
  if (!parentId) return Response.json({ error: "Please log in." }, { status: 401 });
  try {
    return Response.json(await familyUsage(supabase, parentId));
  } catch (err) {
    console.error("Usage error", err instanceof Error ? err.message : err);
    return Response.json({ error: "Couldn't load usage right now." }, { status: 502 });
  }
}
