-- 0006: keep every child's progress, and show it on the admin page.
-- Additive and safe to run more than once (on a database that already has 0001-0005).
--
-- 1. Drafts are no longer trimmed to the latest 100 per child: a child's whole history
--    is kept until the parent removes the child (or the family account is deleted).
-- 2. Admins can see each child's progress: scores, piece titles, dates and word counts.
--    They never see the children's writing or the coach's comments.

drop trigger if exists drafts_keep_last_100 on public.drafts;
drop function if exists public.trim_old_drafts();

-- Average of the six skill scores in one feedback (null if it has none).
create or replace function public.draft_overall(p_feedback jsonb)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select avg((t ->> 'score')::numeric)
    from jsonb_array_elements(case when jsonb_typeof(p_feedback -> 'traits') = 'array'
                                   then p_feedback -> 'traits' else '[]'::jsonb end) t
   where jsonb_typeof(t -> 'score') = 'number';
$$;

-- Same as before, plus each child's level, number of scored tries, and writing level
-- now (average of the latest 5 tries) vs. at the start (average of the first 5).
create or replace function public.admin_list_families()
returns table (
  parent_id uuid,
  email text,
  parent_name text,
  is_admin boolean,
  joined_at timestamptz,
  last_sign_in_at timestamptz,
  children jsonb
)
language plpgsql
stable
security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.email::text,
    p.name,
    exists (select 1 from public.admins a where a.user_id = u.id),
    u.created_at,
    u.last_sign_in_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'child_id', c.id,
               'name', c.name,
               'grade', c.grade,
               'level', c.level,
               'created_at', c.created_at,
               'pieces', (select count(*) from public.works w where w.child_id = c.id),
               'last_active_at', greatest(
                  (select max(w.updated_at) from public.works w where w.child_id = c.id),
                  (select max(x.created_at) from public.ai_usage x where x.child_id = c.id)),
               'feedback_requests', (select count(distinct x.created_at) from public.ai_usage x where x.child_id = c.id),
               'scored_tries', (select count(*) from public.drafts d
                                 where d.child_id = c.id and jsonb_typeof(d.feedback -> 'traits') = 'array'),
               'score_now', (select round(avg(s.overall), 2) from (
                               select public.draft_overall(d.feedback) overall from public.drafts d
                                where d.child_id = c.id and jsonb_typeof(d.feedback -> 'traits') = 'array'
                                order by d.created_at desc limit 5) s),
               'score_start', (select round(avg(s.overall), 2) from (
                               select public.draft_overall(d.feedback) overall from public.drafts d
                                where d.child_id = c.id and jsonb_typeof(d.feedback -> 'traits') = 'array'
                                order by d.created_at asc limit 5) s),
               'usage_by_model', coalesce((
                  select jsonb_object_agg(t.model, jsonb_build_object(
                           'input', t.inp, 'output', t.outp, 'cache_read', t.cr, 'cache_write', t.cw))
                    from (select x.model,
                                 sum(x.input_tokens) inp, sum(x.output_tokens) outp,
                                 sum(x.cache_read_tokens) cr, sum(x.cache_write_tokens) cw
                            from public.ai_usage x where x.child_id = c.id group by x.model) t
               ), '{}'::jsonb)
             ) order by c.created_at)
        from public.children c where c.parent_id = u.id
    ), '[]'::jsonb)
  from auth.users u
  left join public.parents p on p.id = u.id
  order by u.created_at desc;
end;
$$;

-- One child's progress for the admin page: the child, and every piece with its scored tries
-- (scores only, oldest first). No writing and no coach comments.
drop function if exists public.admin_child_progress(uuid);

create function public.admin_child_progress(p_child uuid)
returns jsonb
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
           'child_id', c.id,
           'name', c.name,
           'grade', c.grade,
           'level', c.level,
           'created_at', c.created_at,
           'family_email', (select u.email::text from auth.users u where u.id = c.parent_id),
           'pieces', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'task_key', w.task_key,
                      'lesson_slug', w.lesson_slug,
                      'title', w.title,
                      'genre', w.genre,
                      'updated_at', w.updated_at,
                      'words', coalesce(array_length(regexp_split_to_array(nullif(trim(w.text), ''), '\s+'), 1), 0),
                      'tries', coalesce((
                        select jsonb_agg(jsonb_build_object(
                                 'at', d.created_at,
                                 'traits', (select coalesce(jsonb_agg(jsonb_build_object(
                                                     'trait', t ->> 'trait', 'score', t -> 'score')), '[]'::jsonb)
                                              from jsonb_array_elements(d.feedback -> 'traits') t))
                                 order by d.created_at)
                          from public.drafts d
                         where d.work_id = w.id and jsonb_typeof(d.feedback -> 'traits') = 'array'
                      ), '[]'::jsonb))
                    order by w.updated_at desc)
               from public.works w where w.child_id = c.id
           ), '[]'::jsonb))
    into result
    from public.children c
   where c.id = p_child;

  return result;
end;
$$;

revoke execute on function public.draft_overall(jsonb) from public, anon, authenticated;
revoke execute on function public.admin_child_progress(uuid) from public, anon;
grant execute on function public.admin_child_progress(uuid) to authenticated;
