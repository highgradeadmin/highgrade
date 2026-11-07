-- HighGrade Writing — database schema.
-- Run once on a fresh Supabase project (SQL Editor → New query → Run).
-- To start over on a test project, first run supabase/scripts/reset_database.sql.
--
-- Model: only adults (18+) have logins (email/password or Google). Each parent
-- adds child profiles; children pick their profile on the family device.
-- Parent-only actions require a PIN that is checked on the server.

create extension if not exists pgcrypto with schema extensions;

-- ─── Admins ─────────────────────────────────────────────────────────────────
-- Make someone an admin (after they have signed up):
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'admin@example.com';
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS on with no policies: not readable or writable through the API.
alter table public.admins enable row level security;

create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- ─── Parents (one per login) ────────────────────────────────────────────────
create table public.parents (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  birth_year int not null check (birth_year between 1900 and 2100),
  consent_at timestamptz not null default now(),
  pin_hash text,
  pin_failed_attempts int not null default 0,
  pin_locked_until timestamptz,
  created_at timestamptz not null default now()
);

alter table public.parents enable row level security;

create policy "Parents read their own row"
  on public.parents for select to authenticated
  using ((select auth.uid()) = id);

create policy "Parents update their own row"
  on public.parents for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- The PIN hash and lockout fields are never readable or writable through the API.
revoke all on public.parents from authenticated, anon;
grant select (id, name, birth_year, consent_at, created_at) on public.parents to authenticated;
grant update (name) on public.parents to authenticated;

-- Email sign-up sends name + birth year + consent with the sign-up request, so the
-- parent row is created right away. Google sign-in sends none of these: the
-- parent row is created later by complete_parent_signup() on the "Finish setting
-- up" page. Either way, under-18s are refused.
create function public.handle_new_parent()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  meta jsonb := new.raw_user_meta_data;
  birth_yr int := nullif(meta ->> 'birth_year', '')::int;
begin
  if not (meta ? 'birth_year') then
    return new; -- e.g. Google sign-in: finish on the setup page
  end if;
  if birth_yr is null or extract(year from now())::int - birth_yr < 18 then
    raise exception 'Only parents or guardians aged 18 or older can create an account.'
      using errcode = '22023';
  end if;
  if coalesce((meta ->> 'parent_consent')::boolean, false) is not true then
    raise exception 'Parent or guardian consent is required.' using errcode = '22023';
  end if;
  insert into public.parents (id, name, birth_year)
  values (new.id, coalesce(nullif(left(trim(meta ->> 'name'), 60), ''), 'Parent'), birth_yr);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_parent();

-- "Finish setting up" (Google sign-in): create the parent row for this login.
create function public.complete_parent_signup(p_name text, p_birth_year int, p_consent boolean)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;
  if p_birth_year is null or extract(year from now())::int - p_birth_year < 18 then
    raise exception 'Only parents or guardians aged 18 or older can create an account.'
      using errcode = '22023';
  end if;
  if p_consent is not true then
    raise exception 'Parent or guardian consent is required.' using errcode = '22023';
  end if;
  if nullif(trim(p_name), '') is null then
    raise exception 'Please enter your name.' using errcode = '22023';
  end if;
  insert into public.parents (id, name, birth_year)
  values ((select auth.uid()), left(trim(p_name), 60), p_birth_year)
  on conflict (id) do nothing;
end;
$$;

-- ─── Parent PIN ─────────────────────────────────────────────────────────────
-- True if the current session was created in the last 10 minutes
-- (i.e. the parent just typed their password). Used for "forgot PIN".
create function public.session_is_fresh()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select coalesce(
    (select s.created_at > now() - interval '10 minutes'
       from auth.sessions s
      where s.id = nullif((select auth.jwt()) ->> 'session_id', '')::uuid),
    false);
$$;

create function public.parent_pin_status()
returns table (has_pin boolean, locked_until timestamptz, can_reset boolean)
language sql
stable
security definer set search_path = ''
as $$
  select p.pin_hash is not null,
         case when p.pin_locked_until > now() then p.pin_locked_until end,
         public.session_is_fresh()
    from public.parents p
   where p.id = (select auth.uid());
$$;

-- Internal: check a PIN with lockout (5 wrong tries → locked 15 minutes).
create function public.check_parent_pin(p_pin text)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  rec public.parents%rowtype;
begin
  select * into rec from public.parents where id = (select auth.uid()) for update;
  if not found or rec.pin_hash is null then
    return false;
  end if;
  if rec.pin_locked_until is not null and rec.pin_locked_until > now() then
    raise exception 'Too many wrong PINs. Try again in a few minutes.' using errcode = '42501';
  end if;
  if p_pin is not null and extensions.crypt(p_pin, rec.pin_hash) = rec.pin_hash then
    update public.parents set pin_failed_attempts = 0, pin_locked_until = null where id = rec.id;
    return true;
  end if;
  update public.parents
     set pin_failed_attempts = rec.pin_failed_attempts + 1,
         pin_locked_until = case when rec.pin_failed_attempts + 1 >= 5
                                 then now() + interval '15 minutes' end
   where id = rec.id;
  return false;
end;
$$;

-- Public wrapper: does NOT roll back the failed-attempt counter.
create function public.verify_parent_pin(p_pin text)
returns boolean
language sql
security definer set search_path = ''
as $$
  select public.check_parent_pin(p_pin);
$$;

-- Set or change the PIN. Changing needs the current PIN, or a fresh login (forgot PIN).
-- Returns false (instead of raising) on a wrong current PIN so the failed attempt is kept.
create function public.set_parent_pin(p_new_pin text, p_current_pin text default null)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  existing text;
begin
  if p_new_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits.' using errcode = '22023';
  end if;
  select pin_hash into existing from public.parents where id = (select auth.uid());
  if not found then
    raise exception 'Parent account not found.' using errcode = '42501';
  end if;
  if existing is not null
     and not public.session_is_fresh()
     and not public.check_parent_pin(p_current_pin) then
    return false;
  end if;
  update public.parents
     set pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf')),
         pin_failed_attempts = 0,
         pin_locked_until = null
   where id = (select auth.uid());
  return true;
end;
$$;

-- Parent-only actions below return NULL/false on a wrong PIN rather than raising:
-- raising would roll back the failed-attempt counter and defeat the lockout.

-- ─── Children ───────────────────────────────────────────────────────────────
create table public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  grade int not null check (grade between 5 and 12),
  birth_year int check (birth_year between 1990 and 2100),
  created_at timestamptz not null default now()
);

create index children_parent_idx on public.children (parent_id);

alter table public.children enable row level security;

-- Parents can see their children; changes only through the PIN-checked functions below.
create policy "Parents read their children"
  on public.children for select to authenticated
  using ((select auth.uid()) = parent_id);

revoke insert, update, delete on public.children from authenticated, anon;

create function public.add_child(p_pin text, p_name text, p_grade int, p_birth_year int default null)
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
  insert into public.children (parent_id, name, grade, birth_year)
  values ((select auth.uid()), left(trim(p_name), 40), p_grade, p_birth_year)
  returning id into new_id;
  return new_id;
end;
$$;

create function public.update_child(p_pin text, p_child uuid, p_name text, p_grade int)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.check_parent_pin(p_pin) then
    return false;
  end if;
  update public.children
     set name = left(trim(p_name), 40), grade = p_grade
   where id = p_child and parent_id = (select auth.uid());
  if not found then
    raise exception 'Child not found.' using errcode = '42501';
  end if;
  return true;
end;
$$;

create function public.delete_child(p_pin text, p_child uuid)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.check_parent_pin(p_pin) then
    return false;
  end if;
  delete from public.children where id = p_child and parent_id = (select auth.uid());
  if not found then
    raise exception 'Child not found.' using errcode = '42501';
  end if;
  return true;
end;
$$;

-- ─── Works & drafts (per child) ─────────────────────────────────────────────
create function public.owns_child(p_child uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.children c where c.id = p_child and c.parent_id = (select auth.uid()));
$$;

create table public.works (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null default auth.uid() references public.parents (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  task_key text not null check (char_length(task_key) <= 100),
  lesson_slug text,
  title text not null default '',
  prompt text not null default '',
  genre text not null check (genre in ('paragraph', 'narrative', 'persuasive', 'informative')),
  notes jsonb not null default '{}'::jsonb,
  outline jsonb not null default '[]'::jsonb,
  text text not null default '' check (char_length(text) <= 20000),
  checked jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id, task_key)
);

alter table public.works enable row level security;

create policy "Parents manage their children's work"
  on public.works for all to authenticated
  using ((select auth.uid()) = parent_id)
  with check ((select auth.uid()) = parent_id and public.owns_child(child_id));

create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  parent_id uuid not null default auth.uid() references public.parents (id) on delete cascade,
  text text not null check (char_length(text) <= 20000),
  feedback jsonb,
  created_at timestamptz not null default now()
);

create index drafts_work_idx on public.drafts (work_id, created_at);
create index drafts_child_day_idx on public.drafts (child_id, created_at);

alter table public.drafts enable row level security;

create policy "Parents read their children's drafts"
  on public.drafts for select to authenticated
  using ((select auth.uid()) = parent_id);

-- Inserted by /api/feedback. No update/delete, so daily/try limits can't be reset.
create policy "Parents add drafts to their children's work"
  on public.drafts for insert to authenticated
  with check (
    (select auth.uid()) = parent_id
    and exists (
      select 1 from public.works w
       where w.id = work_id and w.child_id = drafts.child_id and w.parent_id = (select auth.uid())
    )
  );

-- Keep each child's 100 most recent drafts.
create function public.trim_old_drafts()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  delete from public.drafts
  where id in (
    select id from public.drafts
     where child_id = new.child_id
     order by created_at desc, id desc
    offset 100
  );
  return null;
end;
$$;

create trigger drafts_keep_last_100
  after insert on public.drafts
  for each row execute function public.trim_old_drafts();

-- ─── AI usage (one row per model per Claude call) ───────────────────────────
create table public.ai_usage (
  id bigint generated always as identity primary key,
  parent_id uuid not null default auth.uid() references public.parents (id) on delete cascade,
  child_id uuid references public.children (id) on delete set null,
  work_id uuid references public.works (id) on delete set null,
  model text not null check (char_length(model) <= 100),
  input_tokens int not null default 0 check (input_tokens >= 0),
  output_tokens int not null default 0 check (output_tokens >= 0),
  cache_read_tokens int not null default 0 check (cache_read_tokens >= 0),
  cache_write_tokens int not null default 0 check (cache_write_tokens >= 0),
  created_at timestamptz not null default now()
);

create index ai_usage_parent_time_idx on public.ai_usage (parent_id, created_at);

alter table public.ai_usage enable row level security;

create policy "Parents log their family's usage"
  on public.ai_usage for insert to authenticated
  with check ((select auth.uid()) = parent_id and (child_id is null or public.owns_child(child_id)));

create policy "Parents see their usage; admins see all"
  on public.ai_usage for select to authenticated
  using ((select auth.uid()) = parent_id or (select public.is_admin()));

-- ─── Admin: every family with its children and usage ────────────────────────
create function public.admin_list_families()
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
               'created_at', c.created_at,
               'pieces', (select count(*) from public.works w where w.child_id = c.id),
               'last_active_at', greatest(
                  (select max(w.updated_at) from public.works w where w.child_id = c.id),
                  (select max(x.created_at) from public.ai_usage x where x.child_id = c.id)),
               'feedback_requests', (select count(distinct x.created_at) from public.ai_usage x where x.child_id = c.id),
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

-- ─── Function permissions ───────────────────────────────────────────────────
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_admin(),
  public.complete_parent_signup(text, int, boolean),
  public.parent_pin_status(),
  public.verify_parent_pin(text),
  public.set_parent_pin(text, text),
  public.add_child(text, text, int, int),
  public.update_child(text, uuid, text, int),
  public.delete_child(text, uuid),
  public.admin_list_families()
to authenticated;
-- Internal helpers (used inside policies/functions only).
revoke execute on function public.check_parent_pin(text) from authenticated;
grant execute on function public.owns_child(uuid), public.session_is_fresh() to authenticated;
