-- TICK-301 follow-up — allow TapBand config to be scoped to an outlet identifier.

begin;

alter table public.tapband_feature_configs
  add column if not exists outlet_id text;

alter table public.tapband_feature_configs
  drop constraint if exists tapband_feature_configs_outlet_id_not_blank;

alter table public.tapband_feature_configs
  add constraint tapband_feature_configs_outlet_id_not_blank
  check (outlet_id is null or btrim(outlet_id) <> '');

drop index if exists tapband_feature_configs_scope_uidx;
create unique index tapband_feature_configs_scope_uidx
  on public.tapband_feature_configs (
    environment,
    coalesce(org_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(event_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(outlet_id, '')
  );

create index if not exists tapband_feature_configs_outlet_idx
  on public.tapband_feature_configs (outlet_id, environment)
  where outlet_id is not null;

commit;
