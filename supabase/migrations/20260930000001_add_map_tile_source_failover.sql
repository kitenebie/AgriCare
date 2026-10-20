-- Store multiple public XYZ raster sources in priority order.
-- Only enabled sources are visible to app clients; clients cannot modify this table.
create table if not exists public.map_tile_sources (
  id text primary key,
  display_name text not null,
  url_template text not null,
  api_key text,
  attribution text not null,
  priority integer not null default 100,
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint map_tile_sources_https_url check (url_template like 'https://%')
);

alter table public.map_tile_sources enable row level security;

revoke all on table public.map_tile_sources from anon, authenticated;
grant select on table public.map_tile_sources to anon, authenticated;

drop policy if exists "App clients can read enabled map tile sources" on public.map_tile_sources;
create policy "App clients can read enabled map tile sources"
  on public.map_tile_sources
  for select
  to anon, authenticated
  using (is_enabled = true);

-- Preserve the single-key setup from the previous migration as the first source.
do $$
begin
  if to_regclass('public.app_config') is not null then
    insert into public.map_tile_sources (
      id,
      display_name,
      url_template,
      api_key,
      attribution,
      priority
    )
    select
      'maptiler_primary',
      'MapTiler',
      'https://api.maptiler.com/maps/streets-v4/256/{z}/{x}/{y}.png?key={key}',
      config_value,
      '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      10
    from public.app_config
    where config_key = 'maptiler_api_key'
    on conflict (id) do nothing;
  end if;
end $$;
