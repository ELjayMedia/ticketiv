// Source: profiles + user_notification_preferences + auth identities.
// RLS-scoped to the current user. Backs the unified /account/settings page.

import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface NotificationPrefs {
  emailOptIn: boolean
  smsOptIn: boolean
  pushOptIn: boolean
  inAppOptIn: boolean
}

export interface ConnectedAccount {
  provider: string
  email: string | null
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
}

export async function getAccountSettings(): Promise<AccountSettings | null> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, prefsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, name, surname, phone, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_notification_preferences")
      .select("email_opt_in, sms_opt_in, push_opt_in, in_app_opt_in")
      .eq("user_id", user.id)
      .maybeSingle(),
  ])

  const profile = profileRes.data
  const prefs = prefsRes.data

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
    name: profile?.name ?? "",
    surname: profile?.surname ?? "",
    phone: profile?.phone ?? "",
    avatarUrl: profile?.avatar_url ?? null,
    hasPassword,
    notifications: {
      emailOptIn: prefs?.email_opt_in ?? true,
      smsOptIn: prefs?.sms_opt_in ?? true,
      pushOptIn: prefs?.push_opt_in ?? true,
      inAppOptIn: prefs?.in_app_opt_in ?? true,
    },
    connectedAccounts,
  }
}
