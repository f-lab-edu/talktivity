create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  provider text not null check (provider in ('kakao', 'google')),
  nickname text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No policies: anon/authenticated cannot read or write profiles.
alter table public.profiles enable row level security;
