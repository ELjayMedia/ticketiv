-- TICK-403: manage payment-provider production readiness from the admin console.
--
-- Builds on TICK-400 (payment_provider_readiness, the fail-closed real-money
-- gate). Adds:
--   * a per-provider evidence checklist inside evidence_refs (one object per
--     checklist item: what was checked and where the proof lives — never a
--     credential),
--   * an append-only history of every approval, revocation, block and evidence
--     change,
--   * one service-role-only function the console calls after its own role check,
--     so each change and its history row are written together.
--
-- Emergency disable ("block") also switches the provider off at checkout
-- (payment_provider_settings.is_enabled = false) and remembers whether it was on,
-- so lifting the block puts it back exactly as it was. Test/sandbox use is not
-- affected by approval: production_ready=false keeps real money off, nothing else.

alter table public.payment_provider_readiness
  add column if not exists enabled_before_block boolean;

create table if not exists public.payment_provider_readiness_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  action text not null,
  actor_id uuid references auth.users(id) on delete set null,
  reason text,
  item text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint payment_provider_readiness_events_action_check
    check (action in ('evidence_recorded', 'evidence_removed', 'approved', 'revoked', 'blocked', 'unblocked'))
);

create index if not exists payment_provider_readiness_events_provider_idx
  on public.payment_provider_readiness_events (provider, created_at desc);

alter table public.payment_provider_readiness_events enable row level security;
revoke all on table public.payment_provider_readiness_events from public, anon, authenticated;
grant select on table public.payment_provider_readiness_events to service_role;

comment on table public.payment_provider_readiness_events is
  'TICK-403 append-only history of provider readiness changes made from the admin console.';

-- The minimum checklist before a provider may take real money. Card validation
-- only applies to card rails.
create or replace function app.provider_readiness_required_items(p_provider text)
returns text[]
language sql
immutable
set search_path to ''
as $$
  select case
    when p_provider = 'paystack' then array[
      'merchant_agreement', 'kyb', 'credentials', 'callback', 'uat',
      'data_protection', 'card_validation', 'settlement_refunds'
    ]
    else array[
      'merchant_agreement', 'kyb', 'credentials', 'callback', 'uat',
      'data_protection', 'settlement_refunds'
    ]
  end
$$;

create or replace function public.fn_admin_provider_readiness(
  p_provider text,
  p_action text,
  p_actor uuid,
  p_reason text,
  p_item text,
  p_ref text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_row public.payment_provider_readiness%rowtype;
  v_required text[] := app.provider_readiness_required_items(p_provider);
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_ref text := nullif(btrim(coalesce(p_ref, '')), '');
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_evidence jsonb;
  v_present text[];
  v_missing text[];
  v_enabled boolean;
begin
  if p_provider not in ('paystack', 'momo', 'deltapay') then
    raise exception 'Unknown payment provider' using errcode = '22023';
  end if;
  if p_actor is null then
    raise exception 'An admin must be recorded for this change' using errcode = '22023';
  end if;

  select * into v_row from public.payment_provider_readiness where provider = p_provider for update;
  if not found then
    insert into public.payment_provider_readiness (provider) values (p_provider)
    returning * into v_row;
  end if;

  if p_action = 'record_evidence' then
    if p_item is null or not (p_item = any (v_required)) then
      raise exception 'That checklist item does not apply to this provider' using errcode = '22023';
    end if;
    if v_ref is null or length(v_ref) > 500 then
      raise exception 'Add where the proof lives (a link or reference, up to 500 characters)' using errcode = '22023';
    end if;
    if v_note is not null and length(v_note) > 500 then
      raise exception 'Keep the note under 500 characters' using errcode = '22023';
    end if;
    v_evidence := (
      select coalesce(jsonb_agg(e), '[]'::jsonb)
      from jsonb_array_elements(v_row.evidence_refs) e
      where e->>'item' is distinct from p_item
    ) || jsonb_build_array(jsonb_build_object(
      'item', p_item, 'ref', v_ref, 'note', v_note,
      'recorded_at', now(), 'recorded_by', p_actor
    ));
    update public.payment_provider_readiness
      set evidence_refs = v_evidence, updated_at = now()
      where provider = p_provider;
    insert into public.payment_provider_readiness_events (provider, action, actor_id, reason, item, detail)
      values (p_provider, 'evidence_recorded', p_actor, v_reason, p_item, jsonb_build_object('ref', v_ref, 'note', v_note));

  elsif p_action = 'remove_evidence' then
    if v_row.production_ready then
      raise exception 'Revoke approval before removing evidence' using errcode = '22023';
    end if;
    update public.payment_provider_readiness
      set evidence_refs = (
            select coalesce(jsonb_agg(e), '[]'::jsonb)
            from jsonb_array_elements(v_row.evidence_refs) e
            where e->>'item' is distinct from p_item
          ),
          updated_at = now()
      where provider = p_provider;
    insert into public.payment_provider_readiness_events (provider, action, actor_id, reason, item)
      values (p_provider, 'evidence_removed', p_actor, v_reason, p_item);

  elsif p_action = 'approve' then
    if v_reason is null then
      raise exception 'Say why this provider is ready for real money' using errcode = '22023';
    end if;
    if v_row.blocked_at is not null then
      raise exception 'Lift the block before approving' using errcode = '22023';
    end if;
    select coalesce(array_agg(e->>'item'), array[]::text[]) into v_present
      from jsonb_array_elements(v_row.evidence_refs) e;
    select coalesce(array_agg(i), array[]::text[]) into v_missing
      from unnest(v_required) i where not (i = any (v_present));
    if array_length(v_missing, 1) > 0 then
      raise exception 'Checklist incomplete: %', array_to_string(v_missing, ', ') using errcode = '22023';
    end if;
    update public.payment_provider_readiness
      set production_ready = true, approved_at = now(), approved_by = p_actor, updated_at = now()
      where provider = p_provider;
    insert into public.payment_provider_readiness_events (provider, action, actor_id, reason)
      values (p_provider, 'approved', p_actor, v_reason);

  elsif p_action = 'revoke' then
    if v_reason is null then
      raise exception 'Say why approval is being revoked' using errcode = '22023';
    end if;
    update public.payment_provider_readiness
      set production_ready = false, approved_at = null, approved_by = null, updated_at = now()
      where provider = p_provider;
    insert into public.payment_provider_readiness_events (provider, action, actor_id, reason)
      values (p_provider, 'revoked', p_actor, v_reason);

  elsif p_action = 'block' then
    if v_reason is null then
      raise exception 'Say why the provider is being disabled' using errcode = '22023';
    end if;
    if v_row.blocked_at is not null then
      return jsonb_build_object('provider', p_provider, 'unchanged', true);
    end if;
    select is_enabled into v_enabled from public.payment_provider_settings where provider = p_provider;
    update public.payment_provider_readiness
      set production_ready = false, approved_at = null, approved_by = null,
          blocked_at = now(), blocked_reason = v_reason,
          enabled_before_block = coalesce(v_enabled, false), updated_at = now()
      where provider = p_provider;
    insert into public.payment_provider_settings (provider, is_enabled, updated_by, updated_at)
      values (p_provider, false, p_actor, now())
      on conflict (provider) do update
        set is_enabled = false, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
    insert into public.payment_provider_readiness_events (provider, action, actor_id, reason, detail)
      values (p_provider, 'blocked', p_actor, v_reason,
              jsonb_build_object('was_enabled', coalesce(v_enabled, false), 'was_approved', v_row.production_ready));

  elsif p_action = 'unblock' then
    if v_reason is null then
      raise exception 'Say why the block is being lifted' using errcode = '22023';
    end if;
    if v_row.blocked_at is null then
      return jsonb_build_object('provider', p_provider, 'unchanged', true);
    end if;
    update public.payment_provider_readiness
      set blocked_at = null, blocked_reason = null, enabled_before_block = null, updated_at = now()
      where provider = p_provider;
    update public.payment_provider_settings
      set is_enabled = coalesce(v_row.enabled_before_block, false), updated_by = p_actor, updated_at = now()
      where provider = p_provider;
    insert into public.payment_provider_readiness_events (provider, action, actor_id, reason, detail)
      values (p_provider, 'unblocked', p_actor, v_reason,
              jsonb_build_object('restored_enabled', coalesce(v_row.enabled_before_block, false)));

  else
    raise exception 'Unknown readiness action' using errcode = '22023';
  end if;

  return jsonb_build_object('provider', p_provider, 'action', p_action);
end;
$$;

revoke all on function public.fn_admin_provider_readiness(text, text, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.fn_admin_provider_readiness(text, text, uuid, text, text, text, text) to service_role;

comment on function public.fn_admin_provider_readiness(text, text, uuid, text, text, text, text) is
  'TICK-403: admin-console readiness changes (evidence, approve, revoke, emergency block/unblock) with history. Service role only; the console checks the admin role first.';
