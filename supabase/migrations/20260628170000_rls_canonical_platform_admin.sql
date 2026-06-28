-- TICK-278 (S13) Batch 3 — platform-admin tables RLS onto canonical app.* helpers.
--
-- Tables: admin_action_catalog, admin_users, event_categories,
-- payment_routing_rules, feature_flags, webhook_endpoints, webhook_deliveries,
-- webhooks, event_live_stats, event_metrics_daily, audit_log.
--
-- The legacy is_super_admin(uid) / is_global_admin(uid) / is_admin() functions
-- are all defined identically — they each check "exists in admin_users" with NO
-- role-tier filter. They are therefore exact equivalents of app.is_platform_admin();
-- swapping them does NOT broaden access to lower admin tiers. Likewise
-- is_org_admin(org) == app.is_org_admin_of(org).
--
-- Latent-bug fix (intentional): event_metrics_daily SELECT/INSERT compared
-- auth.uid() = org_id (a user uuid vs an org uuid — always false, broken for
-- everyone). Replaced with member-read / admin-write, mirroring org_metrics_daily
-- (Batch 1). uid predicates canonicalized to app.uid().
--
-- Left untouched: audit_log SELECT (org_id = get_user_org()) and the
-- event_live_stats / event_categories public-read predicates.

begin;

-- ── admin_action_catalog (platform admin only) ───────────────────────────────
drop policy if exists admin_action_catalog_super_admin_select on public.admin_action_catalog;
create policy admin_action_catalog_select on public.admin_action_catalog
  for select to authenticated using (app.is_platform_admin());
drop policy if exists admin_action_catalog_super_admin_insert on public.admin_action_catalog;
create policy admin_action_catalog_insert on public.admin_action_catalog
  for insert to authenticated with check (app.is_platform_admin());
drop policy if exists admin_action_catalog_super_admin_update on public.admin_action_catalog;
create policy admin_action_catalog_update on public.admin_action_catalog
  for update to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());
drop policy if exists admin_action_catalog_super_admin_delete on public.admin_action_catalog;
create policy admin_action_catalog_delete on public.admin_action_catalog
  for delete to authenticated using (app.is_platform_admin());

-- ── admin_users (platform admin only; was is_super_admin OR is_admin) ─────────
drop policy if exists admin_users_super_admin_select on public.admin_users;
create policy admin_users_select on public.admin_users
  for select to authenticated using (app.is_platform_admin());
drop policy if exists admin_users_super_admin_insert on public.admin_users;
create policy admin_users_insert on public.admin_users
  for insert to authenticated with check (app.is_platform_admin());
drop policy if exists admin_users_super_admin_update on public.admin_users;
create policy admin_users_update on public.admin_users
  for update to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());
drop policy if exists admin_users_super_admin_delete on public.admin_users;
create policy admin_users_delete on public.admin_users
  for delete to authenticated using (app.is_platform_admin());

-- ── event_categories (public read of active; platform admin writes) ──────────
drop policy if exists event_categories_read_active_or_super_admin on public.event_categories;
create policy event_categories_select on public.event_categories
  for select to anon, authenticated
  using (is_active = true or app.is_platform_admin());
drop policy if exists event_categories_super_admin_insert on public.event_categories;
create policy event_categories_insert on public.event_categories
  for insert to authenticated with check (app.is_platform_admin());
drop policy if exists event_categories_super_admin_update on public.event_categories;
create policy event_categories_update on public.event_categories
  for update to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());
drop policy if exists event_categories_super_admin_delete on public.event_categories;
create policy event_categories_delete on public.event_categories
  for delete to authenticated using (app.is_platform_admin());

-- ── payment_routing_rules (platform admin only) ──────────────────────────────
drop policy if exists payment_routing_rules_select on public.payment_routing_rules;
create policy payment_routing_rules_select on public.payment_routing_rules
  for select to authenticated using (app.is_platform_admin());
drop policy if exists payment_routing_rules_insert on public.payment_routing_rules;
create policy payment_routing_rules_insert on public.payment_routing_rules
  for insert to authenticated with check (app.is_platform_admin());
drop policy if exists payment_routing_rules_update on public.payment_routing_rules;
create policy payment_routing_rules_update on public.payment_routing_rules
  for update to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());
drop policy if exists payment_routing_rules_delete on public.payment_routing_rules;
create policy payment_routing_rules_delete on public.payment_routing_rules
  for delete to authenticated using (app.is_platform_admin());

-- ── feature_flags (global flags = platform admin; org flags = members) ───────
drop policy if exists feature_flags_select on public.feature_flags;
create policy feature_flags_select on public.feature_flags
  for select to authenticated
  using (app.is_org_member_of(org_id) or app.is_platform_admin());
drop policy if exists feature_flags_insert on public.feature_flags;
create policy feature_flags_insert on public.feature_flags
  for insert to authenticated
  with check ((org_id is null) and app.is_platform_admin());
drop policy if exists feature_flags_update on public.feature_flags;
create policy feature_flags_update on public.feature_flags
  for update to authenticated
  using ((org_id is null) and app.is_platform_admin())
  with check ((org_id is null) and app.is_platform_admin());
drop policy if exists feature_flags_delete on public.feature_flags;
create policy feature_flags_delete on public.feature_flags
  for delete to authenticated
  using ((org_id is null) and app.is_platform_admin());

-- ── webhook_endpoints (platform admin OR org admin) ──────────────────────────
drop policy if exists webhook_endpoints_select on public.webhook_endpoints;
create policy webhook_endpoints_select on public.webhook_endpoints
  for select to authenticated using (app.is_org_admin_of(org_id));
drop policy if exists webhook_endpoints_insert on public.webhook_endpoints;
create policy webhook_endpoints_insert on public.webhook_endpoints
  for insert to authenticated with check (app.is_org_admin_of(org_id));
drop policy if exists webhook_endpoints_update on public.webhook_endpoints;
create policy webhook_endpoints_update on public.webhook_endpoints
  for update to authenticated using (app.is_org_admin_of(org_id)) with check (app.is_org_admin_of(org_id));
drop policy if exists webhook_endpoints_delete on public.webhook_endpoints;
create policy webhook_endpoints_delete on public.webhook_endpoints
  for delete to authenticated using (app.is_org_admin_of(org_id));

-- ── webhook_deliveries (via endpoint's org admin / platform admin) ───────────
drop policy if exists webhook_deliveries_select on public.webhook_deliveries;
create policy webhook_deliveries_select on public.webhook_deliveries
  for select to authenticated
  using (exists (select 1 from public.webhook_endpoints e where e.id = webhook_deliveries.endpoint_id and app.is_org_admin_of(e.org_id)));

-- ── webhooks (any org member; uid canonicalized) ─────────────────────────────
drop policy if exists webhooks_org_read on public.webhooks;
create policy webhooks_org_read on public.webhooks
  for select to public
  using (exists (select 1 from public.org_members m where m.user_id = app.uid()));

-- ── event_live_stats (public published OR any org member OR platform admin) ──
drop policy if exists event_live_stats_org_read on public.event_live_stats;
create policy event_live_stats_org_read on public.event_live_stats
  for select to authenticated
  using (
    exists (select 1 from public.events e
            where e.id = event_live_stats.event_id
              and e.status::text = 'published' and e.visibility = 'public'
              and (e.publish_at is null or e.publish_at <= now())
              and (e.unpublish_at is null or e.unpublish_at > now()))
    or exists (select 1 from public.events e where e.id = event_live_stats.event_id and app.is_org_member_of(e.org_id))
    or app.is_platform_admin()
  );
-- (event_live_stats_public_read for {anon} left untouched)

-- ── event_metrics_daily (FIX: was auth.uid() = org_id) ───────────────────────
drop policy if exists "Select: owner only" on public.event_metrics_daily;
create policy event_metrics_daily_select on public.event_metrics_daily
  for select to authenticated using (app.is_org_member_of(org_id));
drop policy if exists "Insert: owner set" on public.event_metrics_daily;
create policy event_metrics_daily_insert on public.event_metrics_daily
  for insert to authenticated with check (app.is_org_admin_of(org_id));

-- ── audit_log (canonicalize uid predicates; SELECT left untouched) ───────────
drop policy if exists audit_log_insert_auth on public.audit_log;
create policy audit_log_insert_auth on public.audit_log
  for insert to authenticated with check (app.uid() is not null);
drop policy if exists audit_log_update_own on public.audit_log;
create policy audit_log_update_own on public.audit_log
  for update to authenticated using (actor_id = app.uid()) with check (actor_id = app.uid());

commit;
