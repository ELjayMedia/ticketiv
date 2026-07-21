-- TICK-338: second protected RPC batch.

alter function public.fn_accept_membership_invite(text) rename to fn_accept_membership_invite_unchecked;
revoke all on function public.fn_accept_membership_invite_unchecked(text) from public, anon, authenticated;
grant execute on function public.fn_accept_membership_invite_unchecked(text) to service_role;

create function public.fn_accept_membership_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  return public.fn_accept_membership_invite_unchecked(p_token);
end;
$$;
revoke all on function public.fn_accept_membership_invite(text) from public, anon;
grant execute on function public.fn_accept_membership_invite(text) to authenticated, service_role;

alter function public.fn_create_membership_invite(uuid, text, app_role, uuid, text, interval) rename to fn_create_membership_invite_unchecked;
revoke all on function public.fn_create_membership_invite_unchecked(uuid, text, app_role, uuid, text, interval) from public, anon, authenticated;
grant execute on function public.fn_create_membership_invite_unchecked(uuid, text, app_role, uuid, text, interval) to service_role;

create function public.fn_create_membership_invite(p_org_id uuid, p_kind text, p_role app_role, p_event_id uuid default null, p_invited_email text default null, p_expires_in interval default interval '14 days')
returns public.membership_invites
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  return public.fn_create_membership_invite_unchecked(p_org_id, p_kind, p_role, p_event_id, p_invited_email, p_expires_in);
end;
$$;
revoke all on function public.fn_create_membership_invite(uuid, text, app_role, uuid, text, interval) from public, anon;
grant execute on function public.fn_create_membership_invite(uuid, text, app_role, uuid, text, interval) to authenticated, service_role;

alter function public.fn_revoke_membership_invite(uuid) rename to fn_revoke_membership_invite_unchecked;
revoke all on function public.fn_revoke_membership_invite_unchecked(uuid) from public, anon, authenticated;
grant execute on function public.fn_revoke_membership_invite_unchecked(uuid) to service_role;

create function public.fn_revoke_membership_invite(p_id uuid)
returns void
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  perform public.fn_revoke_membership_invite_unchecked(p_id);
end;
$$;
revoke all on function public.fn_revoke_membership_invite(uuid) from public, anon;
grant execute on function public.fn_revoke_membership_invite(uuid) to authenticated, service_role;

alter function public.fn_issue_guestlist(uuid, integer) rename to fn_issue_guestlist_unchecked;
revoke all on function public.fn_issue_guestlist_unchecked(uuid, integer) from public, anon, authenticated;
grant execute on function public.fn_issue_guestlist_unchecked(uuid, integer) to service_role;

create function public.fn_issue_guestlist(p_guestlist_entry_id uuid, p_allocate integer default null)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  return public.fn_issue_guestlist_unchecked(p_guestlist_entry_id, p_allocate);
end;
$$;
revoke all on function public.fn_issue_guestlist(uuid, integer) from public, anon;
grant execute on function public.fn_issue_guestlist(uuid, integer) to authenticated, service_role;

alter function public.issue_comp_ticket(uuid, uuid, text, integer, text) rename to issue_comp_ticket_unchecked;
revoke all on function public.issue_comp_ticket_unchecked(uuid, uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.issue_comp_ticket_unchecked(uuid, uuid, text, integer, text) to service_role;

create function public.issue_comp_ticket(p_org_id uuid, p_ticket_type_id uuid, p_recipient_email text, p_qty integer default 1, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  return public.issue_comp_ticket_unchecked(p_org_id, p_ticket_type_id, p_recipient_email, p_qty, p_note);
end;
$$;
revoke all on function public.issue_comp_ticket(uuid, uuid, text, integer, text) from public, anon;
grant execute on function public.issue_comp_ticket(uuid, uuid, text, integer, text) to authenticated, service_role;

alter function public.fn_pos_charge(uuid, jsonb, text, text, text, text) rename to fn_pos_charge_unchecked;
revoke all on function public.fn_pos_charge_unchecked(uuid, jsonb, text, text, text, text) from public, anon, authenticated;
grant execute on function public.fn_pos_charge_unchecked(uuid, jsonb, text, text, text, text) to service_role;

create function public.fn_pos_charge(p_event_id uuid, p_items jsonb, p_payment_method text, p_buyer_name text default null, p_buyer_email text default null, p_buyer_phone text default null)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  return public.fn_pos_charge_unchecked(p_event_id, p_items, p_payment_method, p_buyer_name, p_buyer_email, p_buyer_phone);
end;
$$;
revoke all on function public.fn_pos_charge(uuid, jsonb, text, text, text, text) from public, anon;
grant execute on function public.fn_pos_charge(uuid, jsonb, text, text, text, text) to authenticated, service_role;

alter function public.fn_scan_ticket(text, uuid, uuid, uuid, uuid, text, timestamptz, text) rename to fn_scan_ticket_unchecked;
revoke all on function public.fn_scan_ticket_unchecked(text, uuid, uuid, uuid, uuid, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.fn_scan_ticket_unchecked(text, uuid, uuid, uuid, uuid, text, timestamptz, text) to service_role;

create function public.fn_scan_ticket(p_ticket_code text, p_event_id uuid, p_scanned_by uuid, p_device_id uuid default null, p_session_id uuid default null, p_gate text default null, p_scanned_at timestamptz default now(), p_attempt_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  return public.fn_scan_ticket_unchecked(p_ticket_code, p_event_id, p_scanned_by, p_device_id, p_session_id, p_gate, p_scanned_at, p_attempt_id);
end;
$$;
revoke all on function public.fn_scan_ticket(text, uuid, uuid, uuid, uuid, text, timestamptz, text) from public, anon;
grant execute on function public.fn_scan_ticket(text, uuid, uuid, uuid, uuid, text, timestamptz, text) to authenticated, service_role;

alter function public.fn_update_my_profile(text, text, text, text) rename to fn_update_my_profile_unchecked;
revoke all on function public.fn_update_my_profile_unchecked(text, text, text, text) from public, anon, authenticated;
grant execute on function public.fn_update_my_profile_unchecked(text, text, text, text) to service_role;

create function public.fn_update_my_profile(p_display_name text default null, p_name text default null, p_surname text default null, p_phone text default null)
returns void
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  perform public.fn_update_my_profile_unchecked(p_display_name, p_name, p_surname, p_phone);
end;
$$;
revoke all on function public.fn_update_my_profile(text, text, text, text) from public, anon;
grant execute on function public.fn_update_my_profile(text, text, text, text) to authenticated, service_role;

alter function public.fn_create_talent_profile(text) rename to fn_create_talent_profile_unchecked;
revoke all on function public.fn_create_talent_profile_unchecked(text) from public, anon, authenticated;
grant execute on function public.fn_create_talent_profile_unchecked(text) to service_role;

create function public.fn_create_talent_profile(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  return public.fn_create_talent_profile_unchecked(p_name);
end;
$$;
revoke all on function public.fn_create_talent_profile(text) from public, anon;
grant execute on function public.fn_create_talent_profile(text) to authenticated, service_role;

alter function public.fn_deactivate_payment_method(uuid) rename to fn_deactivate_payment_method_unchecked;
revoke all on function public.fn_deactivate_payment_method_unchecked(uuid) from public, anon, authenticated;
grant execute on function public.fn_deactivate_payment_method_unchecked(uuid) to service_role;

create function public.fn_deactivate_payment_method(p_id uuid)
returns void
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  perform public.fn_deactivate_payment_method_unchecked(p_id);
end;
$$;
revoke all on function public.fn_deactivate_payment_method(uuid) from public, anon;
grant execute on function public.fn_deactivate_payment_method(uuid) to authenticated, service_role;

alter function public.fn_set_default_payment_method(uuid) rename to fn_set_default_payment_method_unchecked;
revoke all on function public.fn_set_default_payment_method_unchecked(uuid) from public, anon, authenticated;
grant execute on function public.fn_set_default_payment_method_unchecked(uuid) to service_role;

create function public.fn_set_default_payment_method(p_id uuid)
returns void
language plpgsql
security definer
set search_path = 'pg_catalog', 'app', 'public'
as $$
begin
  perform app.require_claimed_account();
  perform public.fn_set_default_payment_method_unchecked(p_id);
end;
$$;
revoke all on function public.fn_set_default_payment_method(uuid) from public, anon;
grant execute on function public.fn_set_default_payment_method(uuid) to authenticated, service_role;

alter function public.fn_bulk_check_in(uuid[], uuid) rename to fn_bulk_check_in_unchecked;
revoke all on function public.fn_bulk_check_in_unchecked(uuid[], uuid) from public, anon, authenticated;
grant execute on function public.fn_bulk_check_in_unchecked(uuid[], uuid) to service_role;

create function public.fn_bulk_check_in(p_order_item_ids uuid[], p_org_id uuid)
returns table(checked_count integer, skipped_count integer)
language plpgsql security definer set search_path = 'pg_catalog', 'app', 'public' as $$
begin
  perform app.require_claimed_account();
  return query select * from public.fn_bulk_check_in_unchecked(p_order_item_ids, p_org_id);
end; $$;
revoke all on function public.fn_bulk_check_in(uuid[], uuid) from public, anon;
grant execute on function public.fn_bulk_check_in(uuid[], uuid) to authenticated, service_role;

alter function public.fn_publish_resale_listing(uuid, integer, integer) rename to fn_publish_resale_listing_unchecked;
revoke all on function public.fn_publish_resale_listing_unchecked(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.fn_publish_resale_listing_unchecked(uuid, integer, integer) to service_role;

create function public.fn_publish_resale_listing(p_order_item_id uuid, p_price_cents integer, p_listing_hours integer default 24)
returns table(listing_id uuid, order_item_id uuid, price_cents integer, currency text, listing_expires_at timestamptz, transfer_fee_cents integer)
language plpgsql security definer set search_path = 'pg_catalog', 'app', 'public' as $$
begin
  perform app.require_claimed_account();
  return query select * from public.fn_publish_resale_listing_unchecked(p_order_item_id, p_price_cents, p_listing_hours);
end; $$;
revoke all on function public.fn_publish_resale_listing(uuid, integer, integer) from public, anon;
grant execute on function public.fn_publish_resale_listing(uuid, integer, integer) to authenticated, service_role;
