begin;

-- Remove policies that treated any claimed account as authorized for every row.
drop policy if exists claimed_admin_users_access on public.admin_users;
drop policy if exists claimed_device_sessions_access on public.device_sessions;
drop policy if exists claimed_devices_access on public.devices;
drop policy if exists claimed_guestlist_mutation on public.guestlist_entries;
drop policy if exists claimed_org_members_delete on public.org_members;
drop policy if exists claimed_org_members_mutation on public.org_members;
drop policy if exists claimed_org_members_update on public.org_members;
drop policy if exists claimed_payout_accounts_mutation on public.payout_accounts;
drop policy if exists claimed_payouts_mutation on public.payouts;
drop policy if exists claimed_profiles_update on public.profiles;
drop policy if exists claimed_refund_items_mutation on public.refund_items;
drop policy if exists claimed_refunds_mutation on public.refunds;

-- Keep rate-limit storage internal and prevent clients from invoking maintenance cleanup.
revoke all on table public.rate_limits from anon, authenticated;
revoke execute on function public.fn_rate_limit_gc(interval) from public, anon, authenticated;
grant execute on function public.fn_rate_limit_gc(interval) to service_role;

commit;
