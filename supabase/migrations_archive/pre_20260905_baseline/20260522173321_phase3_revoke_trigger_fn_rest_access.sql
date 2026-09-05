-- Trigger functions don't need to be REST-callable. Revoke broadly so
-- only the postgres role (which fires triggers) can execute them.
revoke execute on function public.fn_trg_emit_order_paid() from public, anon, authenticated;
revoke execute on function public.fn_trg_emit_ticket_transferred() from public, anon, authenticated;
revoke execute on function public.fn_trg_emit_payout_paid() from public, anon, authenticated;
revoke execute on function public.fn_feature_flags_touch_last_changed() from public, anon, authenticated;
revoke execute on function public.fn_event_artists_refresh_event_search() from public, anon, authenticated;
revoke execute on function public.fn_webhook_endpoints_touch_updated_at() from public, anon, authenticated;
revoke execute on function public.fn_events_refresh_search() from public, anon, authenticated;
revoke execute on function public.fn_payment_routing_rules_touch_updated_at() from public, anon, authenticated;
;
