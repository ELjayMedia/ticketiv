-- 1/6: Create _internal schema and move policy_backups + project_docs out of public

CREATE SCHEMA IF NOT EXISTS _internal;
COMMENT ON SCHEMA _internal IS 'Internal operational artifacts (policy backups, design notes). Not part of the public API.';

REVOKE ALL ON SCHEMA _internal FROM PUBLIC;
REVOKE ALL ON SCHEMA _internal FROM anon, authenticated;
GRANT USAGE ON SCHEMA _internal TO postgres, service_role;

-- Preserve the financial invariants design doc as a table comment on ledger_entries
COMMENT ON TABLE public.ledger_entries IS
  'Internal accounting truth (double-entry style). Invariant: payments are external truth; ledger_entries are internal accounting truth; orders.status is derived from ledger balance. (Originally documented in deprecated public.project_docs.)';

-- Move artifacts out of public schema
ALTER TABLE public.policy_backups SET SCHEMA _internal;
ALTER TABLE public.project_docs SET SCHEMA _internal;

COMMENT ON TABLE _internal.policy_backups IS 'Historical RLS policy snapshots from past refactors. Do not write from app code.';
COMMENT ON TABLE _internal.project_docs IS 'Deprecated design-note storage. Content has been migrated to table comments. Retained for history.';;
