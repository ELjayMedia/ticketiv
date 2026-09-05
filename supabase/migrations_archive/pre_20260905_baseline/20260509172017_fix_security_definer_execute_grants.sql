
-- ================================================================
-- SECTION A: Trigger-only / internal functions
-- Revoke EXECUTE from both anon AND authenticated
-- These are never meant to be called via REST RPC
-- ================================================================
REVOKE EXECUTE ON FUNCTION public.artists_create_org_on_insert()               FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_order_currency_matches_pricing()      FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_pricing_plan_org_cohesion()           FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_event_venue_in_same_org(uuid, uuid)   FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_mirror_user_phone_to_profile()             FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_scanner_checkin_only()                  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                             FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_refund_processed()                     FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_event_change()                         FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.order_items_status_transition_guard()         FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.order_ledger_summary_fn_definer()             FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.order_ledger_summary_fn_impl()                FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_buyer_contact_update()                FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_pricing_changes_after_paid()          FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.run_analyze(text[])                           FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_order_status_from_ledger()               FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_scan_and_checkin()                   FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_transfer_order_item_status()         FROM anon, authenticated;

-- ================================================================
-- SECTION B: Authenticated-only RPCs
-- Revoke EXECUTE from anon only; keep authenticated access
-- ================================================================

-- Authorization helpers
REVOKE EXECUTE ON FUNCTION public.can_manage_event(uuid, uuid)               FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_org(uuid, uuid)                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_update_ticket_types_by_user(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin()                                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_event_staff(uuid, uuid)                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_global_admin(uuid)                      FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_order_item_org_member(uuid)             FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid)                   FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid)                  FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_staff(uuid, uuid)                   FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_has_org_role(uuid, text[])            FROM anon;

-- Org/user context
REVOKE EXECUTE ON FUNCTION public.current_user_org_ids()                     FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_orgs()                            FROM anon;

-- Event management
REVOKE EXECUTE ON FUNCTION public.create_event_draft(uuid, text, text)       FROM anon;

-- Order / ticket operations
REVOKE EXECUTE ON FUNCTION public.fn_get_my_order_totals(uuid)               FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_my_order_totals_json(uuid)          FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_list_my_order_totals(integer, integer)  FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_mint_tickets(uuid)                      FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_issue_guestlist(uuid, integer)          FROM anon;

-- Scanner / check-in (scanner devices use authenticated accounts)
REVOKE EXECUTE ON FUNCTION public.fn_check_in(uuid, uuid)                    FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_check_in(uuid)                          FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_check_in(text)                          FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_check_in(text, uuid, text)              FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_check_in(text, uuid, uuid, text)        FROM anon;
REVOKE EXECUTE ON FUNCTION public.scanner_mark_checkin(uuid)                 FROM anon;

-- ================================================================
-- SECTION C: Public RPCs — intentionally left open
-- fn_quote_order (anon price check) + get_ticket_type_event (public browsing)
-- No changes needed
-- ================================================================
;
