-- HighGrade Writing: initial schema.
-- Run in the Supabase dashboard (SQL Editor) or with `supabase db push`.

-- ─── Profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  grade int not null check (grade between 5 and 12),
  birth_year int check (birth_year between 1900 and 2100),
  parent_email text check (parent_email is null or char_length(parent_email) <= 254),
  -- COPPA: students under 13 need verified parental consent before launch.
  parental_consent text not null default 'not_required'
    check (parental_consent in ('not_required', 'pending', 'granted')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Students read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Students update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Students may only change name and grade; consent fields are server-managed.
revoke update on public.profiles from authenticated, anon;
grant update (name, grade) on public.profiles to authenticated;

-- Create the profile automatically from sign-up metadata.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  meta jsonb := new.raw_user_meta_data;
  birth_yr int := nullif(meta ->> 'birth_year', '')::int;
  -- Conservative (matches the sign-up form): anyone who could still be 12 this year.
  under_13 boolean := birth_yr is not null and extract(year from now())::int - birth_yr <= 13;
begin
  insert into public.profiles (id, name, grade, birth_year, parent_email, parental_consent)
  values (
    new.id,
    coalesce(nullif(left(trim(meta ->> 'name'), 40), ''), 'Writer'),
    least(12, greatest(5, coalesce(nullif(meta ->> 'grade', '')::int, 5))),
    birth_yr,
    case when under_13 then nullif(trim(meta ->> 'parent_email'), '') end,
    case when under_13 then 'pending' else 'not_required' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Works (one per lesson / daily prompt per student) ───────────────────────
create table public.works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_key text not null check (char_length(task_key) <= 100),
  lesson_slug text,
  title text not null default '',
  prompt text not null default '',
  genre text not null check (genre in ('paragraph', 'narrative', 'persuasive', 'informative')),
  notes jsonb not null default '{}'::jsonb,
  outline jsonb not null default '[]'::jsonb,
  text text not null default '' check (char_length(text) <= 20000),
  checked jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, task_key)
);

alter table public.works enable row level security;

create policy "Students manage their own work"
  on public.works for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ─── Drafts (a snapshot + coach feedback each time feedback is requested) ───
create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null check (char_length(text) <= 20000),
  feedback jsonb,
  created_at timestamptz not null default now()
);

create index drafts_work_id_idx on public.drafts (work_id, created_at);
create index drafts_user_day_idx on public.drafts (user_id, created_at);

alter table public.drafts enable row level security;

create policy "Students read their own drafts"
  on public.drafts for select to authenticated
  using ((select auth.uid()) = user_id);

-- Inserted by /api/feedback using the student's session. No update/delete
-- policy, so the daily feedback limit (which counts drafts) can't be reset.
create policy "Students add drafts to their own work"
  on public.drafts for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.works w where w.id = work_id and w.user_id = (select auth.uid()))
  );
