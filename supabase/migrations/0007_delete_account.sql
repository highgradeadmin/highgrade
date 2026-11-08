-- 0007: parents can delete their whole family account.
-- Additive and safe to run more than once (on a database that already has 0001-0006).
--
-- Deleting the login (auth.users) removes everything else through "on delete cascade":
-- the parent row, every child, all writing and drafts, and AI usage records.
-- The app cancels the family's Stripe plan before calling this (see /api/account/delete).

create or replace function public.delete_my_account(p_pin text)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.check_parent_pin(p_pin) then
    return false;
  end if;
  -- Keep at least one way into the admin page: admins must have admin access removed first.
  if public.is_admin() then
    raise exception 'Admin accounts can''t be deleted here.' using errcode = '42501';
  end if;
  delete from auth.users where id = (select auth.uid());
  return true;
end;
$$;

revoke execute on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
