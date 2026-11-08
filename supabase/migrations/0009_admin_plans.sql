-- 0009: admins can see each family's free tries (paid status comes from Stripe via /api/admin/plans).
-- Additive and safe to run more than once (on a database that already has 0001-0008).

-- One place for the free-tries rules (15 tries, hidden $2.50 cost cap), used by both functions below.
create or replace function public.free_tries_left(p_used int, p_cost numeric)
returns int
language sql
immutable
set search_path = ''
as $$
  select case when coalesce(p_cost, 0) >= 2.50 then 0 else greatest(0, 15 - coalesce(p_used, 0)) end;
$$;

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
    'limit', 15,
    'left', public.free_tries_left(rec.used, rec.cost_usd)
  );
end;
$$;

-- Every family's free tries, for the admin page.
create or replace function public.admin_free_tries()
returns table (parent_id uuid, used int, tries_left int, cost_usd numeric)
language plpgsql
stable
security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select u.id, coalesce(f.used, 0), public.free_tries_left(f.used, f.cost_usd), coalesce(f.cost_usd, 0)
    from auth.users u
    left join public.free_tries f
      on f.email_hash = encode(extensions.digest(lower(trim(u.email)), 'sha256'), 'hex');
end;
$$;

revoke execute on function public.free_tries_left(int, numeric) from public, anon, authenticated;
revoke execute on function public.admin_free_tries() from public, anon;
grant execute on function public.admin_free_tries() to authenticated;
