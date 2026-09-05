-- TICK-338: protect direct user-facing RPCs from anonymous Supabase sessions.
--
-- Pattern:
--   1. Preserve the existing implementation under an *_unchecked name.
--   2. Remove public/authenticated execution from the unchecked implementation.
--   3. Recreate the public RPC as a fixed-search_path SECURITY DEFINER wrapper.
--   4. Enforce app.require_claimed_account() before forwarding arguments.
--
-- Guest browsing, checkout, order creation, payment completion and ticket
-- delivery are intentionally not included in this migration.

-- Organization creation
alter function public.fn_create_organization(text, text)
  rename to fn_create_organization_unchecked;
revoke all on function public.fn_create_organization_unchecked(text, text) from public, anon, authenticated;
grant execute on function public.fn_create_organization_unchecked(text, text) to service_role;

create function public.fn_create_organization(p_name text, p_currency text default 'SZL')
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  return public.fn_create_organization_unchecked(p_name, p_currency);
end;
$$;
revoke all on function public.fn_create_organization(text, text) from public, anon;
grant execute on function public.fn_create_organization(text, text) to authenticated, service_role;

-- Event draft creation
alter function public.create_event_draft(uuid, text, text)
  rename to create_event_draft_unchecked;
revoke all on function public.create_event_draft_unchecked(uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_event_draft_unchecked(uuid, text, text) to service_role;

create function public.create_event_draft(
  p_org_id uuid,
  p_title text,
  p_visibility text default 'private'
)
returns uuid
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  return public.create_event_draft_unchecked(p_org_id, p_title, p_visibility);
end;
$$;
revoke all on function public.create_event_draft(uuid, text, text) from public, anon;
grant execute on function public.create_event_draft(uuid, text, text) to authenticated, service_role;

-- Organization deletion
alter function public.fn_delete_organization(uuid, text)
  rename to fn_delete_organization_unchecked;
revoke all on function public.fn_delete_organization_unchecked(uuid, text) from public, anon, authenticated;
grant execute on function public.fn_delete_organization_unchecked(uuid, text) to service_role;

create function public.fn_delete_organization(p_org_id uuid, p_confirm_name text)
returns void
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  perform public.fn_delete_organization_unchecked(p_org_id, p_confirm_name);
end;
$$;
revoke all on function public.fn_delete_organization(uuid, text) from public, anon;
grant execute on function public.fn_delete_organization(uuid, text) to authenticated, service_role;

-- Event duplication
alter function public.fn_duplicate_event(uuid)
  rename to fn_duplicate_event_unchecked;
revoke all on function public.fn_duplicate_event_unchecked(uuid) from public, anon, authenticated;
grant execute on function public.fn_duplicate_event_unchecked(uuid) to service_role;

create function public.fn_duplicate_event(p_event_id uuid)
returns json
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  return public.fn_duplicate_event_unchecked(p_event_id);
end;
$$;
revoke all on function public.fn_duplicate_event(uuid) from public, anon;
grant execute on function public.fn_duplicate_event(uuid) to authenticated, service_role;

-- Event status transition
alter function public.fn_transition_event_status(uuid, text)
  rename to fn_transition_event_status_unchecked;
revoke all on function public.fn_transition_event_status_unchecked(uuid, text) from public, anon, authenticated;
grant execute on function public.fn_transition_event_status_unchecked(uuid, text) to service_role;

create function public.fn_transition_event_status(p_event_id uuid, p_new_status text)
returns json
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  return public.fn_transition_event_status_unchecked(p_event_id, p_new_status);
end;
$$;
revoke all on function public.fn_transition_event_status(uuid, text) from public, anon;
grant execute on function public.fn_transition_event_status(uuid, text) to authenticated, service_role;

-- Event artist management
alter function public.fn_link_event_artist_by_name(uuid, text, text, text, text)
  rename to fn_link_event_artist_by_name_unchecked;
revoke all on function public.fn_link_event_artist_by_name_unchecked(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.fn_link_event_artist_by_name_unchecked(uuid, text, text, text, text) to service_role;

create function public.fn_link_event_artist_by_name(
  p_event_id uuid,
  p_artist_name text,
  p_role text default null,
  p_bio text default null,
  p_image_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  return public.fn_link_event_artist_by_name_unchecked(
    p_event_id, p_artist_name, p_role, p_bio, p_image_url
  );
end;
$$;
revoke all on function public.fn_link_event_artist_by_name(uuid, text, text, text, text) from public, anon;
grant execute on function public.fn_link_event_artist_by_name(uuid, text, text, text, text) to authenticated, service_role;

-- Organization finance summary
alter function public.fn_org_finance_summary(uuid, timestamptz, timestamptz)
  rename to fn_org_finance_summary_unchecked;
revoke all on function public.fn_org_finance_summary_unchecked(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.fn_org_finance_summary_unchecked(uuid, timestamptz, timestamptz) to service_role;

create function public.fn_org_finance_summary(
  p_org_id uuid,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  return public.fn_org_finance_summary_unchecked(p_org_id, p_from, p_to);
end;
$$;
revoke all on function public.fn_org_finance_summary(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.fn_org_finance_summary(uuid, timestamptz, timestamptz) to authenticated, service_role;

-- Payout request
alter function public.fn_request_payout(uuid, integer)
  rename to fn_request_payout_unchecked;
revoke all on function public.fn_request_payout_unchecked(uuid, integer) from public, anon, authenticated;
grant execute on function public.fn_request_payout_unchecked(uuid, integer) to service_role;

create function public.fn_request_payout(p_org_id uuid, p_amount_cents integer)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  return public.fn_request_payout_unchecked(p_org_id, p_amount_cents);
end;
$$;
revoke all on function public.fn_request_payout(uuid, integer) from public, anon;
grant execute on function public.fn_request_payout(uuid, integer) to authenticated, service_role;

-- Ticket transfer request
alter function public.fn_request_transfer_by_email(uuid, text)
  rename to fn_request_transfer_by_email_unchecked;
revoke all on function public.fn_request_transfer_by_email_unchecked(uuid, text) from public, anon, authenticated;
grant execute on function public.fn_request_transfer_by_email_unchecked(uuid, text) to service_role;

create function public.fn_request_transfer_by_email(
  p_order_item_id uuid,
  p_recipient_email text
)
returns json
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  return public.fn_request_transfer_by_email_unchecked(p_order_item_id, p_recipient_email);
end;
$$;
revoke all on function public.fn_request_transfer_by_email(uuid, text) from public, anon;
grant execute on function public.fn_request_transfer_by_email(uuid, text) to authenticated, service_role;

-- Ticket transfer completion
alter function public.fn_complete_transfer(uuid)
  rename to fn_complete_transfer_unchecked;
revoke all on function public.fn_complete_transfer_unchecked(uuid) from public, anon, authenticated;
grant execute on function public.fn_complete_transfer_unchecked(uuid) to service_role;

create function public.fn_complete_transfer(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  return public.fn_complete_transfer_unchecked(p_transfer_id);
end;
$$;
revoke all on function public.fn_complete_transfer(uuid) from public, anon;
grant execute on function public.fn_complete_transfer(uuid) to authenticated, service_role;

-- Organizer KPI read
alter function public.get_organizer_kpis(text)
  rename to get_organizer_kpis_unchecked;
revoke all on function public.get_organizer_kpis_unchecked(text) from public, anon, authenticated;
grant execute on function public.get_organizer_kpis_unchecked(text) to service_role;

create function public.get_organizer_kpis(p_range text default '30d')
returns json
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  return public.get_organizer_kpis_unchecked(p_range);
end;
$$;
revoke all on function public.get_organizer_kpis(text) from public, anon;
grant execute on function public.get_organizer_kpis(text) to authenticated, service_role;

-- Event KPI read
alter function public.get_event_kpis(uuid)
  rename to get_event_kpis_unchecked;
revoke all on function public.get_event_kpis_unchecked(uuid) from public, anon, authenticated;
grant execute on function public.get_event_kpis_unchecked(uuid) to service_role;

create function public.get_event_kpis(p_event_id uuid)
returns json
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  return public.get_event_kpis_unchecked(p_event_id);
end;
$$;
revoke all on function public.get_event_kpis(uuid) from public, anon;
grant execute on function public.get_event_kpis(uuid) to authenticated, service_role;
