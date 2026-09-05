
-- ================================================================
-- Trigger-only / internal functions
-- REVOKE from PUBLIC entirely — Postgres invokes triggers as owner,
-- no explicit grant needed for internal invocation
-- ================================================================
REVOKE EXECUTE ON FUNCTION public.artists_create_org_on_insert()            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_order_currency_matches_pricing()   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_pricing_plan_org_cohesion()        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_event_venue_in_same_org(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_mirror_user_phone_to_profile()          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guard_scanner_checkin_only()               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_refund_processed()                  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_event_change()                      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.order_items_status_transition_guard()      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_buyer_contact_update()             FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_pricing_changes_after_paid()       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_analyze(text[])                        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_order_status_from_ledger()            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_scan_and_checkin()                FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_transfer_order_item_status()      FROM PUBLIC;

-- ================================================================
-- Authenticated-only RPCs
-- REVOKE from PUBLIC, re-grant to authenticated role only
-- ================================================================
REVOKE EXECUTE ON FUNCTION public.can_manage_event(uuid, uuid)               FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.can_manage_event(uuid, uuid)               TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_manage_org(uuid, uuid)                 FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.can_manage_org(uuid, uuid)                 TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_update_ticket_types_by_user(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.can_update_ticket_types_by_user(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_event_draft(uuid, text, text)       FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.create_event_draft(uuid, text, text)       TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_user_org_ids()                     FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.current_user_org_ids()                     TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_check_in(uuid, uuid)                    FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_check_in(uuid, uuid)                    TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_check_in(text)                          FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_check_in(text)                          TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_check_in(text, uuid, text)              FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_check_in(text, uuid, text)              TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_check_in(text, uuid, uuid, text)        FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_check_in(text, uuid, uuid, text)        TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_get_my_order_totals(uuid)               FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_get_my_order_totals(uuid)               TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_get_my_order_totals_json(uuid)          FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_get_my_order_totals_json(uuid)          TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_issue_guestlist(uuid, integer)          FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_issue_guestlist(uuid, integer)          TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_list_my_order_totals(integer, integer)  FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_list_my_order_totals(integer, integer)  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_mint_tickets(uuid)                      FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_mint_tickets(uuid)                      TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin()                                 FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_admin()                                 TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_event_staff(uuid, uuid)                 FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_event_staff(uuid, uuid)                 TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_global_admin(uuid)                      FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_global_admin(uuid)                      TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_order_item_org_member(uuid)             FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_order_item_org_member(uuid)             TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid)                   FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid)                   TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid)                  FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_org_member(uuid, uuid)                  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_org_staff(uuid, uuid)                   FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_org_staff(uuid, uuid)                   TO authenticated;

REVOKE EXECUTE ON FUNCTION public.scanner_mark_checkin(uuid)                 FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.scanner_mark_checkin(uuid)                 TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_has_org_role(uuid, text[])            FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.user_has_org_role(uuid, text[])            TO authenticated;

-- fn_quote_order and get_ticket_type_event: PUBLIC grant intentionally left intact
;
