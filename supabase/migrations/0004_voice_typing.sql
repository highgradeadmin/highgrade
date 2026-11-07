-- 0004: parents can let a child use speech-to-text (🎤) instead of typing.
-- Off by default: browser speech recognition sends the audio to the browser's maker
-- (Google for Chrome/Edge, Apple for Safari), so a parent must choose to turn it on.
-- Additive: safe to run on a database that already has 0001-0003.

alter table public.children
  add column voice_typing boolean not null default false;

-- Parent only (needs the parent PIN), like other child settings.
create function public.set_child_voice_typing(p_pin text, p_child uuid, p_enabled boolean)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.check_parent_pin(p_pin) then
    return false;
  end if;
  update public.children
     set voice_typing = p_enabled
   where id = p_child and parent_id = (select auth.uid());
  if not found then
    raise exception 'Child not found.' using errcode = '42501';
  end if;
  return true;
end;
$$;

revoke execute on function public.set_child_voice_typing(text, uuid, boolean) from public, anon;
grant execute on function public.set_child_voice_typing(text, uuid, boolean) to authenticated;
