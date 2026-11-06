-- Keep only each student's 100 most recent drafts (text + feedback + scores).
-- Runs automatically after every new draft; older drafts are removed.

create function public.trim_old_drafts()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  delete from public.drafts
  where id in (
    select id
    from public.drafts
    where user_id = new.user_id
    order by created_at desc, id desc
    offset 100
  );
  return null;
end;
$$;

create trigger drafts_keep_last_100
  after insert on public.drafts
  for each row execute function public.trim_old_drafts();
