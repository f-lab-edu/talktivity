create table public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta int not null check (delta <> 0),
  reason text not null check (reason in ('purchase', 'coupon', 'report', 'refund')),
  ref text not null,
  created_at timestamptz not null default now(),
  unique (user_id, reason, ref)
);
create index credit_ledger_user_id_idx on public.credit_ledger(user_id);

create table public.coupons (
  code text primary key check (code ~ '^[A-Z0-9-]{4,32}$'),
  credits int not null check (credits > 0),
  max_redemptions int check (max_redemptions > 0),
  redeemed_count int not null default 0 check (redeemed_count >= 0),
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content jsonb not null,
  created_at timestamptz not null default now()
);
create index reports_user_created_idx on public.reports(user_id, created_at desc);

alter table public.credit_ledger enable row level security;
alter table public.coupons enable row level security;
alter table public.reports enable row level security;
revoke all on public.credit_ledger, public.coupons, public.reports from public, anon, authenticated;
grant all on public.credit_ledger, public.coupons, public.reports to service_role;
grant usage, select on sequence public.credit_ledger_id_seq to service_role;

create function public.credit_balance(p_user uuid) returns int
language plpgsql set search_path = public as $$
begin
  return (select coalesce(sum(delta), 0)::int from credit_ledger where user_id = p_user);
end;
$$;

create function public.grant_credits(p_user uuid, p_delta int, p_reason text, p_ref text)
returns boolean language plpgsql set search_path = public as $$
declare
  inserted int;
begin
  insert into credit_ledger(user_id, delta, reason, ref)
    values (p_user, p_delta, p_reason, p_ref) on conflict do nothing;
  get diagnostics inserted = row_count;
  return inserted = 1;
end;
$$;

create function public.redeem_coupon(p_user uuid, p_code text) returns int
language plpgsql set search_path = public as $$
declare
  coupon coupons%rowtype;
begin
  select * into coupon from coupons where code = p_code for update;
  if not found or not coupon.active then
    raise exception using errcode = 'P0001', message = 'COUPON_NOT_FOUND';
  end if;
  if coupon.expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'COUPON_EXPIRED';
  end if;
  if coupon.redeemed_count >= coupon.max_redemptions then
    raise exception using errcode = 'P0001', message = 'COUPON_EXHAUSTED';
  end if;
  if exists (select 1 from credit_ledger where user_id = p_user and reason = 'coupon' and ref = p_code) then
    raise exception using errcode = 'P0001', message = 'COUPON_ALREADY_USED';
  end if;
  insert into credit_ledger(user_id, delta, reason, ref) values (p_user, coupon.credits, 'coupon', p_code);
  update coupons set redeemed_count = redeemed_count + 1 where code = p_code;
  return coupon.credits;
end;
$$;

create function public.save_report(p_user uuid, p_content jsonb) returns uuid
language plpgsql set search_path = public as $$
declare
  report_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  if credit_balance(p_user) < 1 then
    raise exception using errcode = 'P0001', message = 'INSUFFICIENT_CREDITS';
  end if;
  insert into reports(user_id, content) values (p_user, p_content) returning id into report_id;
  insert into credit_ledger(user_id, delta, reason, ref) values (p_user, -1, 'report', report_id::text);
  return report_id;
end;
$$;

create function public.revoke_purchase(p_user uuid, p_transaction text, p_ref text) returns boolean
language plpgsql set search_path = public as $$
declare
  inserted int;
begin
  insert into credit_ledger(user_id, delta, reason, ref)
    select p_user, -delta, 'refund', p_ref from credit_ledger
    where user_id = p_user and reason = 'purchase' and ref = p_transaction
    on conflict do nothing;
  get diagnostics inserted = row_count;
  return inserted = 1;
end;
$$;

revoke execute on function public.credit_balance(uuid),
  public.grant_credits(uuid, int, text, text), public.redeem_coupon(uuid, text),
  public.save_report(uuid, jsonb), public.revoke_purchase(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.credit_balance(uuid),
  public.grant_credits(uuid, int, text, text), public.redeem_coupon(uuid, text),
  public.save_report(uuid, jsonb), public.revoke_purchase(uuid, text, text)
  to service_role;
