# RPC permission matrix (TICK-337)

The privileged database surface, who can reach it, and how that is kept from
drifting. Machine-readable snapshot: `supabase/permissions/rpc-grants.json`
(256 functions). Checker: `pnpm check:permissions`.

## Why a database role is not a trust boundary here

Ticketiv uses Supabase anonymous sessions for guest checkout. An anonymous
guest and a fully signed-up buyer both arrive as the `authenticated` database
role. `authenticated` therefore means "has some session", not "has an account",
and it never proves org membership, staff status or admin tier.

Three things carry the actual authorization, and a user-facing RPC needs all
that apply:

- `app.is_claimed_account()` / `app.require_claimed_account()` — separates a
  guest session from a real account (see `docs/CLAIMED_ACCOUNT_GUARD.md`).
- Org/event ownership checks inside the function body — `can_manage_event`,
  `can_manage_org`, membership lookups.
- RLS on the tables the function touches, for anything not `SECURITY DEFINER`.

## The surface

| Schema | Security mode | Reachable from a browser role | Count |
|---|---|---|---|
| `public` | `SECURITY DEFINER` | yes | 64 |
| `public` | `SECURITY DEFINER` | no (service_role / owner / triggers) | 104 |
| `public` | `SECURITY INVOKER` | yes | 42 |
| `public` | `SECURITY INVOKER` | no | 13 |
| `app` | either | yes | 24 |
| `app` | either | no | 9 |

"Reachable from a browser role" means EXECUTE is granted to `PUBLIC`, `anon` or
`authenticated`.

`public` is the schema PostgREST publishes, so its grants are the external
attack surface. `app` is the internal helper schema and is **not** in the
exposed-schema list; its `anon`/`authenticated` grants exist only so that
`SECURITY INVOKER` RLS policies can call the helpers while running as the end
user. Revoking them would break RLS evaluation, not tighten it.

Every one of the 192 `SECURITY DEFINER` functions has a pinned `search_path`.
The checker enforces this, so a new definer function without one fails CI.

## Anonymous-reachable definer functions

Only three, and each is deliberate. The checker's `ANON_ALLOWLIST` is the
authoritative list; adding to it is a security review.

| Function | Why anon needs it |
|---|---|
| `fn_preview_promo_code` | Guest checkout previews a code before sign-in. `STABLE`, writes nothing, scoped to `status = 'published'`. |
| `fn_ticket_type_remaining` | Public event pages show remaining counts to signed-out visitors. `STABLE`, writes nothing. |
| `fn_apply_pricing_to_order` | Reprice-trigger helper. The grant must stay because the three reprice triggers are `SECURITY INVOKER` and run as the buyer — including a guest. A direct PostgREST call is refused at runtime by a `pg_trigger_depth() = 0` guard. See `20260725140000_close_anon_reprice_rpc_and_search_path.sql`. |

The third still appears under Supabase Advisor's
`anon_security_definer_function_executable`; that lint inspects the grant and
cannot see the runtime guard. It is an accepted warning, not an open finding.

## Caller boundaries for the authenticated surface

The 61 definer functions granted to `authenticated` (and not to anon) group as:

- **Own-account operations** — `fn_update_my_profile`, `fn_set_my_locale`,
  `fn_set_my_avatar_url`, `fn_get_my_notification_mutes`,
  `fn_toggle_notification_mute`, `fn_update_my_notification_preferences`,
  `fn_store_push_subscription`, `fn_remove_push_subscription`,
  `fn_get_my_account_deletion_status`, `fn_toggle_favourite`,
  `fn_set_default_payment_method`, `fn_deactivate_payment_method`. Scoped to
  `auth.uid()` internally.
- **Buyer journey** — `fn_create_seat_hold`, `fn_create_resale_checkout_order`,
  `fn_create_waitlist_checkout_order`, `fn_publish_resale_listing`,
  `fn_request_transfer_by_email`, `fn_complete_transfer`,
  `fn_my_waitlist_positions`, `fn_seller_completed_resales`,
  `fn_claim_guest_orders`, `fn_find_claimable_guest_orders`. The claim pair is
  how a guest session's orders move to a real account.
- **Organizer/workspace** — `create_event_draft`, `fn_duplicate_event`,
  `fn_transition_event_status`, `fn_delete_organization`,
  `fn_create_organization`, `fn_issue_guestlist`, `issue_comp_ticket`,
  `fn_link_event_artist_by_name`, `fn_create_membership_invite`,
  `fn_revoke_membership_invite`, `fn_accept_membership_invite`,
  `fn_claim_email_broadcast`, `get_event_kpis`, `get_organizer_kpis`. Each
  checks org/event authority in-body; the grant alone confers nothing.
- **Money** — `fn_org_finance_summary`, `fn_request_payout`,
  `fn_transition_payout`, `fn_transition_refund`. Gated on finance role plus,
  for payouts, a configured payout account.
- **Gate and POS** — `fn_scan_ticket`, `fn_bulk_check_in`,
  `fn_register_device`, `fn_start_device_session`, `fn_end_device_session`,
  `fn_pos_charge`, `fn_pos_charge_with_shift`, `fn_open_pos_shift`,
  `fn_close_pos_shift`, `fn_pos_receipt`, `fn_pos_shift_summary`,
  `fn_pos_shift_transactions`. Device/session authorization is checked inside.
- **Authorization helpers** — `can_manage_event`, `current_user_org_ids`,
  `is_super_admin`, `is_org_finance_viewer`, `fn_get_ticketiv_effective_roles`,
  `get_ticket_type_event`, `fn_bootstrap_ticketiv_user`. Read-only role
  resolution; they answer questions about the caller, they do not grant.

## Never client-callable

Enforced by name in the checker, because a grant here is a money bug:

- `fn_complete_resale_after_payment`, `fn_complete_waitlist_after_payment`,
  `fn_complete_resale_after_payment_webhook`,
  `fn_complete_waitlist_after_payment_webhook` — payment completion runs only
  behind verified provider evidence. See the completion contract in
  `docs/PAYMENTS.md` (TICK-339).
- `fn_export_rpc_permissions` — the exporter behind this document.

## Drift control

`pnpm check:permissions` runs in `check:release`, so it gates every PR.

1. **Invariants over the committed snapshot** — always run, no credentials
   needed. They fail when a definer function has no pinned `search_path`, when
   a never-client-callable function gains a browser grant, or when a new
   anon-reachable definer function appears without an allowlist entry.
2. **Live diff** — runs when `NEXT_PUBLIC_SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` are set, comparing the database against the
   snapshot via `fn_export_rpc_permissions()`. This is what catches a grant
   applied straight to the database with no migration behind it.

Regenerate the snapshot only alongside the migration that changed the surface:

```bash
node scripts/check-rpc-permissions.mjs --write
```

The regenerated file is re-checked against the invariants before it is
accepted, so `--write` cannot be used to launder a violation into the snapshot.
