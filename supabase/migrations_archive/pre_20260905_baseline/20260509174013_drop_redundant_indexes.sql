
-- PK-column duplicates (indexing the PK is always a no-op)
DROP INDEX IF EXISTS public.idx_orders_id;
DROP INDEX IF EXISTS public.idx_payments_id;
DROP INDEX IF EXISTS public.idx_profiles_user_id;

-- Exact duplicate composite (keeping idx_orders_buyer_status_created)
DROP INDEX IF EXISTS public.orders_buyer_status_created_idx;

-- org_members redundancy cascade:
-- {org_id} ⊂ {org_id,user_id} ⊂ {org_id,user_id,role}  → drop the two shorter ones
DROP INDEX IF EXISTS public.idx_org_members_org_id;
DROP INDEX IF EXISTS public.idx_org_members_org_user;

-- {user_id} ⊂ {user_id,org_id}  → drop the single-column one
DROP INDEX IF EXISTS public.idx_org_members_user_id;
;
