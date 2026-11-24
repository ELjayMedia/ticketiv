-- Allow every notification type the platform actually writes.
--
-- check_notifications_type_channel (production baseline) only lists the 18
-- types that existed before the Event Companion, follows, reminders, resale,
-- waitlist and duplicate-guard work. Those features insert other types, and
-- their triggers swallow errors so publishing never fails — so the inserts
-- were silently rejected. Verified on production 2026-11-24: zero rows of any
-- of the types below exist, although org_follows has followers.
--
-- Affected writers (all in supabase/migrations):
--   organizer_new_event        companion_release_3   app.notify_org_followers_of_new_event
--   artist_new_event           artist_follows        app.notify_artist_followers_of_new_event
--   event_update               event_companion       fn_post_event_update
--   event_reminder             companion_release_2   fn_companion_reminders_tick
--   saved_event_reminder       companion_release_2   fn_companion_reminders_tick
--   feedback_request           companion_release_3   fn_feedback_requests_tick
--   duplicate_permission_request / _decision   event_duplicate_guard
--   email_broadcast, refund_request, resale_listing_created,
--   resale_purchase_completed, waitlist_offer_fulfilled   production baseline
--
-- Widening a CHECK is additive: every existing row already satisfies it.
-- Rollback: re-add the previous constraint (the 18-type list in the baseline)
-- after deleting rows of the new types.

alter table public.notifications drop constraint if exists check_notifications_type_channel;
alter table public.notifications add constraint check_notifications_type_channel check (
  type = any (array[
    -- original 18
    'email_confirmation', 'ticket_delivery', 'transfer_notification', 'refund_alert', 'generic',
    'ticket_purchase_succeeded', 'payment_succeeded', 'payment_failed', 'event_published',
    'event_changed', 'event_invite', 'refund_updated', 'payout_updated', 'ticket_transfer_updated',
    'tapband_credential_lost', 'ticket_transfer', 'ticket_transfer_accepted', 'ticket_transfer_declined',
    -- written by later features but previously rejected
    'organizer_new_event', 'artist_new_event', 'event_update', 'event_reminder', 'saved_event_reminder',
    'feedback_request', 'duplicate_permission_request', 'duplicate_permission_decision',
    'email_broadcast', 'refund_request', 'resale_listing_created', 'resale_purchase_completed',
    'waitlist_offer_fulfilled'
  ]::text[])
  and (channel is null or channel = any (array['email', 'sms', 'push', 'in_app']::text[]))
);
