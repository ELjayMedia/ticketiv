// Source: profiles + user_notification_preferences + auth identities.
// RLS-scoped to the current user. Backs the unified /account/settings page.

import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface NotificationPrefs {
  emailOptIn: boolean
  smsOptIn: boolean
  pushOptIn: boolean
  inAppOptIn: boolean
  eventRemindersEnabled: boolean
  remind24h: boolean
  remind2h: boolean
}

export interface ConnectedAccount {
  provider: string
  email: string | null
}

export interface AccountDeletionBlocker {
  code: string
  count: number
  message: string
}

export interface AccountDeletionStatus {
  canDelete: boolean
  blockers: AccountDeletionBlocker[]
  counts: {
    paidOrdersRetained: number
    ownerOrganizations: number
    upcomingTickets: number
    activeResales: number
    pendingTransfers: number
  }
  retention: {
    orders: string
    tickets: string
    profile: string
  }
}

export interface AccountSettings {
  email: string | null
  displayName: string
  name: string
  surname: string
  phone: string
  avatarUrl: string | null
  hasPassword: boolean
  notifications: NotificationPrefs
  connectedAccounts: ConnectedAccount[]
  deletion: AccountDeletionStatus
}

const DEFAULT_DELETION_STATUS: AccountDeletionStatus = {
  canDelete: false,
  blockers: [
    {
      code: "status_unavailable",
      count: 1,
      message: "Account deletion status is not available right now. Please try again later.",
    },
  ],
  counts: {
    paidOrdersRetained: 0,
    ownerOrganizations: 0,
    upcomingTickets: 0,
    activeResales: 0,
    pendingTransfers: 0,
  },
  retention: {
    orders: "Paid order records are retained without profile/contact details for accounting and tax records.",
    tickets: "Upcoming paid tickets must be resolved before deletion.",
    profile: "Profile data is deleted with the Auth account.",
  },
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}

function parseDeletionStatus(value: unknown): AccountDeletionStatus {
  const root = asRecord(value)
  const counts = asRecord(root.counts)
  const retention = asRecord(root.retention)
  const blockers = Array.isArray(root.blockers)
    ? root.blockers.map((item) => {
        const blocker = asRecord(item)
        return {
          code: asString(blocker.code, "unknown"),
          count: asNumber(blocker.count),
          message: asString(blocker.message, "Resolve this blocker before deleting the account."),
        }
      })
    : DEFAULT_DELETION_STATUS.blockers

  return {
    canDelete: root.canDelete === true,
    blockers,
    counts: {
      paidOrdersRetained: asNumber(counts.paidOrdersRetained),
      ownerOrganizations: asNumber(counts.ownerOrganizations),
      upcomingTickets: asNumber(counts.upcomingTickets),
      activeResales: asNumber(counts.activeResales),
      pendingTransfers: asNumber(counts.pendingTransfers),
    },
    retention: {
      orders: asString(retention.orders, DEFAULT_DELETION_STATUS.retention.orders),
      tickets: asString(retention.tickets, DEFAULT_DELETION_STATUS.retention.tickets),
      profile: asString(retention.profile, DEFAULT_DELETION_STATUS.retention.profile),
    },
  }
}

export async function getAccountSettings(): Promise<AccountSettings | null> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, privateProfileRes, prefsRes, deletionRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle(),
    // This table was introduced by the preceding migration and may not yet be present
    // in generated database types when branches are deployed out of order.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any)("user_private_profiles")
      .select("name, surname, phone")
      .eq("user_id", user.id)
      .maybeSingle(),
    // New reminder columns are migration-backed; keep this read compatible until generated DB types refresh.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any)("user_notification_preferences")
      .select("email_opt_in, sms_opt_in, push_opt_in, in_app_opt_in, event_reminders_enabled, remind_24h, remind_2h")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.rpc("fn_get_my_account_deletion_status"),
  ])

  const profile = profileRes.data
  const privateProfile = privateProfileRes.data
  const prefs = prefsRes.data
  const deletion = deletionRes.error ? DEFAULT_DELETION_STATUS : parseDeletionStatus(deletionRes.data)

  if (deletionRes.error) {
    console.error("[account-settings] deletion status:", deletionRes.error)
  }

  const identities = user.identities ?? []
  const connectedAccounts: ConnectedAccount[] = identities
    .filter((i) => i.provider !== "email")
    .map((i) => ({
      provider: i.provider,
      email:
        (typeof i.identity_data?.email === "string"
          ? i.identity_data.email
          : null) ?? null,
    }))

  const hasPassword = identities.some((i) => i.provider === "email")

  return {
    email: user.email ?? null,
    displayName: profile?.display_name ?? "",
    name: privateProfile?.name ?? "",
    surname: privateProfile?.surname ?? "",
    phone: privateProfile?.phone ?? "",
    avatarUrl: profile?.avatar_url ?? null,
    hasPassword,
    notifications: {
      emailOptIn: prefs?.email_opt_in ?? true,
      smsOptIn: prefs?.sms_opt_in ?? true,
      pushOptIn: prefs?.push_opt_in ?? true,
      inAppOptIn: prefs?.in_app_opt_in ?? true,
      eventRemindersEnabled: prefs?.event_reminders_enabled ?? true,
      remind24h: prefs?.remind_24h ?? true,
      remind2h: prefs?.remind_2h ?? true,
    },
    connectedAccounts,
    deletion,
  }
}
