-- RLS cross-tenant isolation verification (TICK-174).
--
-- Runs entirely READ-ONLY against any database (incl. production) by simulating
-- auth roles + JWT claims inside ROLLED-BACK transactions. No writes persist.
-- Complements tests/rls-isolation.test.ts (which needs a seeded test project +
-- real user tokens); this proves the live policies directly via psql / the
-- Supabase SQL editor — no seed, no app, no cost.
--
-- Usage (psql): set the three ids to a real org, that org's buyer, and a user
-- who is a member of a DIFFERENT org, then run each block. Expected results are
-- noted inline.
--   \set org_a      '00000000-0000-0000-0000-000000000000'
--   \set buyer_a    '00000000-0000-0000-0000-000000000000'   -- member/buyer of org_a
--   \set other_user '00000000-0000-0000-0000-000000000000'   -- member of some other org
--
-- Verified on production (radsfmlsjznqvcpogluo) 2026-06-21 — all expectations met.

-- 1. Non-member CANNOT read another org's orders → expect 0.
BEGIN;
  SET LOCAL ROLE authenticated;
  SELECT set_config('request.jwt.claims',
    json_build_object('sub','00000000-0000-0000-0000-000000000000','role','authenticated')::text, true);
  SELECT count(*) AS nonmember_visible_orders   -- EXPECT 0
  FROM public.orders WHERE org_id = :'org_a';
ROLLBACK;

-- 2. The order's owner CAN read it → expect >= 1 (proves it isn't blanket-deny).
BEGIN;
  SET LOCAL ROLE authenticated;
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'buyer_a','role','authenticated')::text, true);
  SELECT count(*) AS owner_visible_orders        -- EXPECT >= 1
  FROM public.orders WHERE org_id = :'org_a';
ROLLBACK;

-- 3. Anonymous role CANNOT read orders → expect 0.
BEGIN;
  SET LOCAL ROLE anon;
  SELECT set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  SELECT count(*) AS anon_visible_orders FROM public.orders;   -- EXPECT 0
ROLLBACK;

-- 4. A user CANNOT forge an order for a DIFFERENT user → expect RLS error:
--    "new row violates row-level security policy for table \"orders\"".
--    (Run on its own; it intentionally raises. The ROLLBACK is belt-and-braces.)
BEGIN;
  SET LOCAL ROLE authenticated;
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', :'other_user','role','authenticated')::text, true);
  INSERT INTO public.orders (org_id, buyer_id, total_cents, currency)
  VALUES (:'org_a', :'buyer_a', 1000, 'SZL');   -- EXPECT: RLS violation error
ROLLBACK;

-- Note: a buyer inserting their OWN order (buyer_id = auth.uid()) into any org's
-- event IS allowed by design (consolidated_orders_insert_authenticated_v2 →
-- `buyer_id = fn_current_user_id()`); buyers aren't org members. Isolation holds
-- because reads are tenant-scoped and a user can never write a row as another
-- user.
