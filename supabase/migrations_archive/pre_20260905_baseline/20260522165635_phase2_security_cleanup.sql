-- Lock down search_path on new functions and revoke anon from fn_pos_charge.

alter function public.fn_feature_flags_touch_last_changed() set search_path = public;
alter function public.fn_event_artists_refresh_event_search() set search_path = public;
alter function public.fn_search_events(text, text, text, timestamptz, timestamptz, int, boolean, int, int) set search_path = public;
alter function public.fn_webhook_endpoints_touch_updated_at() set search_path = public;
alter function public.fn_events_refresh_search() set search_path = public;
alter function public.fn_payment_routing_rules_touch_updated_at() set search_path = public;

-- fn_pos_charge must not be callable by anon. Box-office charges are
-- always made by signed-in staff.
revoke execute on function public.fn_pos_charge(uuid, jsonb, text, text, text, text) from anon, public;
grant execute on function public.fn_pos_charge(uuid, jsonb, text, text, text, text) to authenticated;
;
