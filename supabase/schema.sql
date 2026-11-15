-- Habit tracker schema. Run once in Supabase: SQL Editor -> New query -> paste -> Run.

-- ---------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  tz text not null default 'America/Los_Angeles',
  created_at timestamptz not null default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  slug text not null,
  name text not null,
  weekly_target int not null check (weekly_target between 1 and 7),
  travel_ok boolean not null default true,   -- false = hidden in travel mode (phase 2)
  auto_source text check (auto_source in ('steps')),
  sort int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  habit_id uuid not null references public.habits on delete cascade,
  day date not null,
  source text not null default 'app' check (source in ('app', 'shortcut', 'auto')),
  created_at timestamptz not null default now(),
  unique (habit_id, day)
);
create index if not exists checkins_user_day on public.checkins (user_id, day);

create table if not exists public.days (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  words text,
  rating int check (rating between 1 and 5),
  sleep_minutes int,
  steps int,
  travel boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Works whether or not you ran an earlier version of this file
alter table public.days add column if not exists rating int check (rating between 1 and 5);
alter table public.days drop column if exists photo_path;

-- One row per week (weeks start Sunday): the Sunday reflection
create table if not exists public.weeks (
  user_id uuid not null references auth.users on delete cascade,
  week_start date not null,
  reflection text,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

create table if not exists public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  token_hash text not null unique,
  label text not null default 'Shortcuts',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- ---------------------------------------------------------------
-- Row level security: every row belongs to one user
-- ---------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.checkins enable row level security;
alter table public.days enable row level security;
alter table public.weeks enable row level security;
alter table public.api_tokens enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own habits" on public.habits;
create policy "own habits" on public.habits
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own checkins" on public.checkins;
create policy "own checkins" on public.checkins
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own days" on public.days;
create policy "own days" on public.days
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own weeks" on public.weeks;
create policy "own weeks" on public.weeks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own tokens" on public.api_tokens;
create policy "own tokens" on public.api_tokens
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------
-- New user: create profile and the starting eight habits
-- ---------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;

  insert into public.habits (user_id, slug, name, weekly_target, travel_ok, auto_source, sort) values
    (new.id, 'lights-out',  'Lights out',         5, true,  null,    1),
    (new.id, 'train',       'Train',              3, true,  null,    2),
    (new.id, 'steps',       '10k steps',          5, true,  'steps', 3),
    (new.id, 'top-3',       'Top 3 for tomorrow', 5, true,  null,    4),
    (new.id, 'deep-work',   'Deep work block',    3, false, null,    5),
    (new.id, 'read',        'Read',               5, true,  null,    6),
    (new.id, 'try-new',     'Try something new',  1, true,  null,    7),
    (new.id, 'call-family', 'Call family',        1, true,  null,    8)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
