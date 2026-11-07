-- Admin console, phase 3: settings history with restore, and saved replies.
--
-- Settings history
--   Every insert, update and delete on the platform's settings tables is copied
--   into admin_settings_history by a trigger, whoever made it (console, generic
--   resource editor, RPC, SQL editor). Values that look secret (keys, secrets,
--   tokens, passwords) are replaced with "[hidden]" before they are stored, so
--   the history never holds provider credentials.
--
--   admin_restore_setting(id) puts a row back to how it was before a change.
--   Hidden values are left as they are now (they can't be restored from
--   history), and undoing a newly created row is refused: switch it off instead.
--   A restore is itself a change, so it shows in the history too.
--
-- Saved replies
--   admin_saved_replies: answers support reuses in Chatwoot.
--
-- RLS on, no policies, revoked from anon and authenticated: only the admin
-- console's server code (service role) reaches these.

create table if not exists public.admin_settings_history (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text not null,
  operation text not null check (operation in ('insert', 'update', 'delete')),
  old_row jsonb,
  new_row jsonb,
  changed_fields text[] not null default '{}',
  actor_id uuid,
  changed_at timestamptz not null default now()
);

create index if not exists admin_settings_history_record_idx on public.admin_settings_history (table_name, record_id, changed_at desc);
create index if not exists admin_settings_history_changed_idx on public.admin_settings_history (changed_at desc);
alter table public.admin_settings_history enable row level security;
revoke all on public.admin_settings_history from anon, authenticated;

-- Replace secret-looking values. Keys only; values are never inspected.
create or replace function app.mask_secret_fields(p_row jsonb)
returns jsonb
language sql
immutable
set search_path to ''
as $function$
  select coalesce(
    jsonb_object_agg(
      key,
      case
        when key ~* '(secret|token|password|private|api_?key|encrypted)' and value <> 'null'::jsonb then to_jsonb('[hidden]'::text)
        else value
      end
    ),
    '{}'::jsonb
  )
  from jsonb_each(coalesce(p_row, '{}'::jsonb));
$function$;

create or replace function app.record_settings_history()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then app.mask_secret_fields(to_jsonb(old)) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then app.mask_secret_fields(to_jsonb(new)) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_pk text := tg_argv[0];
  v_fields text[];
  v_actor uuid;
begin
  if tg_op = 'UPDATE' then
    select coalesce(array_agg(n.key order by n.key), '{}')
      into v_fields
      from jsonb_each(to_jsonb(new)) n
     where n.value is distinct from (to_jsonb(old) -> n.key);
    -- Nothing changed (e.g. a save with the same values): don't record noise.
    if v_fields = '{}' then
      return new;
    end if;
  end if;

  -- Who: the signed-in user when there is one, else the row's own "changed by" column.
  v_actor := coalesce(
    (select auth.uid()),
    nullif(v_row ->> 'last_changed_by', '')::uuid,
    nullif(v_row ->> 'updated_by', '')::uuid,
    case when tg_op = 'INSERT' then nullif(v_row ->> 'created_by', '')::uuid end
  );

  insert into public.admin_settings_history (table_name, record_id, operation, old_row, new_row, changed_fields, actor_id)
  values (tg_table_name, v_row ->> v_pk, lower(tg_op), v_old, v_new, coalesce(v_fields, '{}'), v_actor);

  return coalesce(new, old);
exception
  -- History must never block a settings change.
  when others then
    raise warning 'settings history not recorded for %.%: %', tg_table_name, v_row ->> v_pk, sqlerrm;
    return coalesce(new, old);
end;
$function$;

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('feature_flags', 'id'),
      ('payment_routing_rules', 'id'),
      ('platform_fee_settings', 'id'),
      ('pricing_plans', 'id'),
      ('tapband_feature_configs', 'id'),
      ('payment_provider_settings', 'provider')
    ) as v(table_name, pk)
  loop
    if to_regclass('public.' || t.table_name) is not null then
      execute format('drop trigger if exists trg_settings_history on public.%I', t.table_name);
      execute format(
        'create trigger trg_settings_history after insert or update or delete on public.%I for each row execute function app.record_settings_history(%L)',
        t.table_name, t.pk
      );
    end if;
  end loop;
end;
$$;

create or replace function public.admin_restore_setting(p_history_id bigint)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  h public.admin_settings_history;
  v_pk text;
  v_set text;
  v_exists boolean;
begin
  select * into h from public.admin_settings_history where id = p_history_id;
  if not found then
    raise exception 'history_not_found' using errcode = 'P0002';
  end if;

  v_pk := case h.table_name
    when 'feature_flags' then 'id'
    when 'payment_routing_rules' then 'id'
    when 'platform_fee_settings' then 'id'
    when 'pricing_plans' then 'id'
    when 'tapband_feature_configs' then 'id'
    when 'payment_provider_settings' then 'provider'
  end;
  if v_pk is null then
    raise exception 'table_not_restorable' using errcode = '22023';
  end if;
  if h.operation = 'insert' or h.old_row is null then
    raise exception 'cannot_undo_insert' using errcode = '22023';
  end if;

  -- Columns to put back: everything stored, except the key and hidden values.
  select string_agg(format('%I = r.%I', key, key), ', ')
    into v_set
    from jsonb_each(h.old_row)
   where key <> v_pk and value <> to_jsonb('[hidden]'::text);
  if v_set is null then
    raise exception 'nothing_to_restore' using errcode = '22023';
  end if;

  execute format('select exists (select 1 from public.%I where %I::text = $1)', h.table_name, v_pk)
    into v_exists using h.record_id;

  if v_exists then
    execute format(
      'update public.%I t set %s from jsonb_populate_record(null::public.%I, $1) r where t.%I::text = $2',
      h.table_name, v_set, h.table_name, v_pk
    ) using h.old_row, h.record_id;
    return 'restored';
  end if;

  if exists (select 1 from jsonb_each(h.old_row) where value = to_jsonb('[hidden]'::text)) then
    raise exception 'cannot_recreate_hidden_values' using errcode = '22023';
  end if;
  execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)', h.table_name, h.table_name)
    using h.old_row;
  return 'recreated';
end;
$function$;

create table if not exists public.admin_saved_replies (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_saved_replies enable row level security;
revoke all on public.admin_saved_replies from anon, authenticated;

revoke all on function public.admin_restore_setting(bigint) from public, anon, authenticated;
grant execute on function public.admin_restore_setting(bigint) to service_role;
revoke all on function app.record_settings_history() from public, anon, authenticated;
revoke all on function app.mask_secret_fields(jsonb) from public, anon, authenticated;
