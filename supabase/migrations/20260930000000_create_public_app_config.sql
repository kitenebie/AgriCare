-- Public, read-only configuration consumed by the mobile app.
-- Store only values that are safe to expose to app clients, such as a restricted MapTiler key.
create table if not exists public.app_config (
  config_key text primary key,
  config_value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

revoke all on table public.app_config from anon, authenticated;
grant select on table public.app_config to anon, authenticated;

drop policy if exists "App clients can read MapTiler key" on public.app_config;
create policy "App clients can read MapTiler key"
  on public.app_config
  for select
  to anon, authenticated
  using (config_key = 'maptiler_api_key');
