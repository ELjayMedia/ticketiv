CREATE INDEX IF NOT EXISTS idx_order_items_current_owner_id
  ON public.order_items USING btree (current_owner_id);

DROP INDEX IF EXISTS public.idx_admin_users_user;
DROP INDEX IF EXISTS public.idx_items_ticket_code;
DROP INDEX IF EXISTS public.idx_user_notification_preferences_user_id;
DROP INDEX IF EXISTS public.idx_pricing_plans_org;
DROP INDEX IF EXISTS public.webhooks_provider_event_uidx;;
