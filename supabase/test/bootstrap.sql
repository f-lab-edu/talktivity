create schema auth;
create table auth.users (id uuid primary key);
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to service_role;
grant select on auth.users to service_role;

-- Match Supabase defaults so an omitted REVOKE is observable.
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
