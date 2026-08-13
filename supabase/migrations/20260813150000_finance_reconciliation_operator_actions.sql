-- TICK-340: complete the operator-facing reconciliation queue contract.
--
-- Status changes require a real human identity, a write-capable finance role,
-- and a resolution note for terminal decisions. The note and audit entry are
-- written in the same transaction as the status change.

alter table public.finance_reconciliation_issues
  add column if not exists resolution_note text;

create or replace view public.v_finance_reconciliation_queue
with (security_invoker = true)
as
select
  id,
  detector_key,
  entity_key,
  org_id,
  order_id,
  payment_id,
  refund_id,
  severity,
  status,
  title,
  details,
  runbook_key,
  owner_user_id,
  first_detected_at,
  last_detected_at,
  acknowledged_at,
  resolved_at,
  extract(epoch from (now() - first_detected_at))::bigint as age_seconds,
  resolution_note
from public.finance_reconciliation_issues;

revoke all on table public.v_finance_reconciliation_queue from public, anon;
grant select on table public.v_finance_reconciliation_queue to authenticated, service_role;

drop function if exists public.fn_update_finance_reconciliation_issue(uuid, text);

create function public.fn_update_finance_reconciliation_issue(
  p_issue_id uuid,
  p_new_status text,
  p_resolution_note text default null
)
returns public.finance_reconciliation_issues
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_issue public.finance_reconciliation_issues%rowtype;
  v_actor uuid := auth.uid();
  v_previous_status text;
  v_note text := nullif(btrim(coalesce(p_resolution_note, '')), '');
  v_is_write_admin boolean := false;
begin
  if v_actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_new_status not in ('open', 'acknowledged', 'resolved', 'ignored') then
    raise exception 'invalid_reconciliation_status' using errcode = '22023';
  end if;

  if char_length(coalesce(v_note, '')) > 1000 then
    raise exception 'resolution_note_too_long' using errcode = '22023';
  end if;

  if p_new_status in ('resolved', 'ignored') and v_note is null then
    raise exception 'resolution_note_required' using errcode = '22023';
  end if;

  select * into v_issue
  from public.finance_reconciliation_issues
  where id = p_issue_id
  for update;

  if not found then
    raise exception 'reconciliation_issue_not_found' using errcode = 'P0002';
  end if;

  select exists (
    select 1
    from public.admin_users au
    where au.user_id = v_actor
      and au.active is true
      and au.role_tier::text in ('super_admin', 'finance_admin')
  ) into v_is_write_admin;

  if not (
    v_is_write_admin
    or (v_issue.org_id is not null and app.is_org_finance_viewer(v_issue.org_id))
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  v_previous_status := v_issue.status;

  update public.finance_reconciliation_issues
  set status = p_new_status,
      owner_user_id = case
        when p_new_status in ('acknowledged', 'resolved', 'ignored')
          then coalesce(owner_user_id, v_actor)
        else owner_user_id
      end,
      acknowledged_at = case
        when p_new_status = 'acknowledged' then coalesce(acknowledged_at, now())
        when p_new_status = 'open' then null
        else acknowledged_at
      end,
      resolved_at = case
        when p_new_status in ('resolved', 'ignored') then now()
        when p_new_status = 'open' then null
        else resolved_at
      end,
      resolution_note = case
        when p_new_status = 'open' then null
        when v_note is not null then v_note
        else resolution_note
      end,
      updated_at = now()
  where id = p_issue_id
  returning * into v_issue;

  insert into public.audit_log (
    org_id,
    actor_id,
    table_name,
    record_id,
    action,
    changes
  ) values (
    v_issue.org_id,
    v_actor,
    'finance_reconciliation_issues',
    v_issue.id::text,
    'update'::public.audit_action,
    jsonb_build_object(
      'business_action', 'finance_reconciliation_issue_status_changed',
      'detector_key', v_issue.detector_key,
      'previous_status', v_previous_status,
      'new_status', p_new_status,
      'resolution_note', v_note
    )
  );

  return v_issue;
end;
$function$;

revoke all on function public.fn_update_finance_reconciliation_issue(uuid, text, text)
  from public, anon, service_role;
grant execute on function public.fn_update_finance_reconciliation_issue(uuid, text, text)
  to authenticated;

comment on function public.fn_update_finance_reconciliation_issue(uuid, text, text) is
  'TICK-340 authenticated operator transition with write-role enforcement, resolution notes, ownership, and atomic audit logging.';
