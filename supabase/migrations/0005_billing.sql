-- 0005: link each parent to their Stripe customer (family plan billing).
-- Additive: safe to run on a database that already has 0001-0004.
--
-- Only the customer ID is stored. Whether the plan is active is always checked live with
-- Stripe by the server, and the server also checks that the Stripe customer belongs to this
-- parent (customer metadata parent_id), so a wrong ID here can't unlock anything.

alter table public.parents
  add column stripe_customer_id text check (stripe_customer_id ~ '^cus_[A-Za-z0-9]+$');

grant select (stripe_customer_id) on public.parents to authenticated;

create function public.set_stripe_customer(p_customer text)
returns void
language sql
security definer set search_path = ''
as $$
  update public.parents set stripe_customer_id = p_customer where id = (select auth.uid());
$$;

revoke execute on function public.set_stripe_customer(text) from public, anon;
grant execute on function public.set_stripe_customer(text) to authenticated;
