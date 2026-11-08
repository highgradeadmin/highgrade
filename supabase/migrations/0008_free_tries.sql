-- 0008: 15 free coach feedback tries per family, no card needed.
-- Additive and safe to run more than once (on a database that already has 0001-0007).
--
-- Tries are counted per email address (stored only as a SHA-256 hash), not per account,
-- so deleting the account and signing up again with the same email doesn't reset them.
-- A hidden spending cap also stops a family's free tries from costing more than $2.50.
-- Families with a paid plan, and admins, don't use free tries.

create table if not exists public.free_tries (
  email_hash text primary key,
  used int not null default 0 check (used >= 0),
  cost_usd numeric(10, 4) not null default 0 check (cost_usd >= 0),
  updated_at timestamptz not null default now()
);

-- Only the functions below can read or change it.
alter table public.free_tries enable row level security;
revoke all on public.free_tries from public, anon, authenticated;

create or replace function public.my_email_hash()
returns text
language sql
stable
security definer set search_path = ''
as $$
  select encode(extensions.digest(lower(trim(u.email)), 'sha256'), 'hex')
    from auth.users u where u.id = (select auth.uid()) and u.email is not null;
$$;

-- The logged-in family's free tries: { used, limit, left }.
create or replace function public.free_tries_status()
returns jsonb
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  lim constant int := 15;
  cap constant numeric := 2.50;
  rec public.free_tries%rowtype;
begin
  select * into rec from public.free_tries where email_hash = public.my_email_hash();
  return jsonb_build_object(
    'used', coalesce(rec.used, 0),
    'limit', lim,
    'left', case when coalesce(rec.cost_usd, 0) >= cap then 0 else greatest(0, lim - coalesce(rec.used, 0)) end
  );
end;
$$;

-- Called by the server after a free try succeeds. Calling it directly only uses up your own tries.
create or replace function public.record_free_try(p_cost numeric)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  h text := public.my_email_hash();
begin
  if h is null then
    return;
  end if;
  insert into public.free_tries as f (email_hash, used, cost_usd)
  values (h, 1, least(greatest(coalesce(p_cost, 0), 0), 1))
  on conflict (email_hash) do update
     set used = f.used + 1,
         cost_usd = f.cost_usd + least(greatest(coalesce(p_cost, 0), 0), 1),
         updated_at = now();
end;
$$;

revoke execute on function public.my_email_hash() from public, anon, authenticated;
revoke execute on function public.free_tries_status() from public, anon;
revoke execute on function public.record_free_try(numeric) from public, anon;
grant execute on function public.free_tries_status() to authenticated;
grant execute on function public.record_free_try(numeric) to authenticated;
