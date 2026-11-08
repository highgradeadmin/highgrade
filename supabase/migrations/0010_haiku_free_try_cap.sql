-- 0010: the coach now runs on Claude Haiku 5.5 (about $0.002 per feedback), so the hidden
-- spending cap on a family's 15 free tries drops from $2.50 to $0.25.
-- Additive and safe to run more than once (on a database that already has 0001-0009).

create or replace function public.free_tries_left(p_used int, p_cost numeric)
returns int
language sql
immutable
set search_path = ''
as $$
  select case when coalesce(p_cost, 0) >= 0.25 then 0 else greatest(0, 15 - coalesce(p_used, 0)) end;
$$;

revoke execute on function public.free_tries_left(int, numeric) from public, anon, authenticated;
