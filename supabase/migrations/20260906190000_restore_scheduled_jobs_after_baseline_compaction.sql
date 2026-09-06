-- Restore the pg_cron schedules omitted by the 5 September 2026 production-baseline
-- compaction.
--
-- The baseline is a schema dump. `cron.job` rows live outside the dumped schemas, so
-- every scheduled job except the uptime watchdog (restored separately) was lost from
-- the repository even though production kept running them. A database rebuilt from
-- this chain had no ops alerting, no settlement ingest, no refund reconciliation, no
-- retention sweeps and no hold expiry — silently, because nothing fails when a job is
-- simply never scheduled.
--
-- Job names, schedules and commands below are the ones production is running. The
-- named form of cron.schedule updates a job in place, so re-applying this is a no-op
-- against production and a full restore anywhere else.

do $do$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron is not installed; skipping scheduled-job restore';
    return;
  end if;

  -- Ops alerting: calls the Next.js ops-alert endpoint and logs each delivery.
  perform cron.schedule(
    'ticketiv-ops-alerts',
    '*/5 * * * *',
    $cron$select public.fn_ops_alerts_tick();$cron$
  );

  -- Provider settlement ingestion.
  perform cron.schedule(
    'ticketiv-settlement-ingest',
    '20 4 * * *',
    $cron$select public.fn_settlement_ingest_tick();$cron$
  );

  -- Paystack refund reconciliation.
  perform cron.schedule(
    'ticketiv-refund-reconciliation',
    '*/15 * * * *',
    $cron$select public.fn_refund_reconciliation_tick();$cron$
  );

  -- Inventory: release checkout holds that were never completed.
  perform cron.schedule(
    'expire-stale-checkout-holds',
    '*/5 * * * *',
    $cron$select public.fn_expire_stale_checkout_holds();$cron$
  );

  -- Anonymous-user hygiene.
  perform cron.schedule(
    'anon-user-cleanup',
    '0 2 * * *',
    $cron$select public.fn_cleanup_anon_users(false);$cron$
  );

  -- Retention sweeps.
  perform cron.schedule(
    'ticketiv-audit-log-retention',
    '30 3 * * *',
    $cron$select public.fn_archive_audit_log();$cron$
  );

  perform cron.schedule(
    'ticketiv-scans-retention',
    '45 3 * * *',
    $cron$select public.fn_archive_scans();$cron$
  );

  -- Reporting rollups and planner/observability maintenance.
  perform cron.schedule(
    'nightly_rollup_metrics',
    '0 2 * * *',
    $cron$select public.fn_rollup_metrics(current_date - 1);$cron$
  );

  perform cron.schedule(
    'daily_analyze_public_schema',
    '0 3 * * *',
    $cron$select public.run_analyze(array['public']);$cron$
  );

  perform cron.schedule(
    'monitoring.capture_slow_queries_hourly',
    '0 * * * *',
    $cron$select monitoring.capture_slow_queries();$cron$
  );
end;
$do$;
