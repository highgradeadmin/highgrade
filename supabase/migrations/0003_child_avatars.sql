-- 0003: each child picks an avatar and a colour for their profile.
-- Additive: safe to run on a database that already has 0001 and 0002.

alter table public.children
  add column avatar text not null default 'owl'
    check (avatar in ('owl','fox','cat','dog','panda','tiger','frog','unicorn','octopus','penguin','dragon','robot')),
  add column color text not null default 'indigo'
    check (color in ('indigo','emerald','amber','rose','sky','violet'));

-- Give existing children different colours so profiles are easy to tell apart.
with ranked as (
  select id, row_number() over (partition by parent_id order by created_at) - 1 as n
  from public.children
)
update public.children c
   set color = (array['indigo','emerald','amber','rose','sky','violet'])[(r.n % 6) + 1]
  from ranked r
 where r.id = c.id;

-- The child sets this themselves from the profile screen, so no parent PIN is needed.
-- Only works for a child of the logged-in parent.
create function public.set_child_avatar(p_child uuid, p_avatar text, p_color text)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.children
     set avatar = p_avatar, color = p_color
   where id = p_child and parent_id = (select auth.uid());
  return found;
end;
$$;

revoke execute on function public.set_child_avatar(uuid, text, text) from public, anon;
grant execute on function public.set_child_avatar(uuid, text, text) to authenticated;
