create table public.products (
  price_id text primary key check (price_id ~ '^pri_'),
  name text not null,
  credits int not null check (credits > 0),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
revoke all on public.products from public, anon, authenticated;
grant all on public.products to service_role;
