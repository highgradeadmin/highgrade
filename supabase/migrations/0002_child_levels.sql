-- Child levels: each child works on one band of lessons at a time.
-- Additive — keeps existing parents, children and writing.

alter table public.children
  add column level text not null default '5-6'
  check (level in ('5-6', '7-8', '9-10', '11-12'));

-- Lessons currently exist for 5-6 and 7-8; older children start at 7-8.
update public.children set level = case when grade <= 6 then '5-6' else '7-8' end;

-- Start new children at the level that matches their grade.
create or replace function public.add_child(p_pin text, p_name text, p_grade int, p_birth_year int default null)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not public.check_parent_pin(p_pin) then
    return null;
  end if;
  if (select count(*) from public.children where parent_id = (select auth.uid())) >= 6 then
    raise exception 'A family can have up to 6 children.' using errcode = '22023';
  end if;
  insert into public.children (parent_id, name, grade, birth_year, level)
  values ((select auth.uid()), left(trim(p_name), 40), p_grade, p_birth_year,
          case when p_grade <= 6 then '5-6' else '7-8' end)
  returning id into new_id;
  return new_id;
end;
$$;

-- Parents (with PIN) can now also set the level, up or down.
drop function public.update_child(text, uuid, text, int);

create function public.update_child(p_pin text, p_child uuid, p_name text, p_grade int, p_level text)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.check_parent_pin(p_pin) then
    return false;
  end if;
  update public.children
     set name = left(trim(p_name), 40), grade = p_grade, level = p_level
   where id = p_child and parent_id = (select auth.uid());
  if not found then
    raise exception 'Child not found.' using errcode = '42501';
  end if;
  return true;
end;
$$;

-- Move a child up ONE level (offered in the app once every lesson in the level
-- is proficient). No PIN: it only ever moves up one step, and a parent can move
-- the child back in the parent area.
create function public.advance_child_level(p_child uuid)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  next_level text;
begin
  select case c.level when '5-6' then '7-8' end
    into next_level
    from public.children c
   where c.id = p_child and c.parent_id = (select auth.uid());
  if next_level is null then
    return null; -- not this family's child, or no higher level yet
  end if;
  update public.children set level = next_level where id = p_child;
  return next_level;
end;
$$;

revoke execute on function
  public.update_child(text, uuid, text, int, text),
  public.advance_child_level(uuid)
from public, anon;
grant execute on function
  public.update_child(text, uuid, text, int, text),
  public.advance_child_level(uuid)
to authenticated;
