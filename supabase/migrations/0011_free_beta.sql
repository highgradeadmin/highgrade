-- 0011: free beta. Every family gets 100 free coach feedback tries (up from 15), and the hidden
-- spending cap on a family's free tries rises from $0.25 to $1.00 so longer essays still reach 100.
-- Tries already used still count. Additive and safe to run more than once (needs 0001-0010).
-- Keep the 100 in sync with FREE_TRIES in src/lib/plans.ts.

create or replace function public.free_tries_left(p_used int, p_cost numeric)
returns int
language sql
immutable
set search_path = ''
as $$
  select case when coalesce(p_cost, 0) >= 1.00 then 0 else greatest(0, 100 - coalesce(p_used, 0)) end;
$$;

revoke execute on function public.free_tries_left(int, numeric) from public, anon, authenticated;

create or replace function public.free_tries_status()
returns jsonb
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  rec public.free_tries%rowtype;
begin
  select * into rec from public.free_tries where email_hash = public.my_email_hash();
  return jsonb_build_object(
    'used', coalesce(rec.used, 0),
    'limit', 100,
    'left', public.free_tries_left(rec.used, rec.cost_usd)
  );
end;
$$;

revoke execute on function public.free_tries_status() from public, anon;
grant execute on function public.free_tries_status() to authenticated;
