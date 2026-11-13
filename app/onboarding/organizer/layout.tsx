import type React from "react"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { ORGANIZER_ICONS } from "@/lib/brand/icons"

/**
 * Creating an organisation needs a permanent, verified account:
 * fn_create_organization calls app.require_claimed_account(), which rejects
 * anonymous sessions. Guest buyers carry an anonymous session after checkout,
 * so send them to organizer registration (email code) before they fill in
 * the form, instead of letting the submit fail.
 */
export const metadata = { icons: ORGANIZER_ICONS }

export default async function OrganizerOnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient()
  if (!supabase) redirect("/login?from=/onboarding/organizer")

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?from=/onboarding/organizer")
  if (user.is_anonymous) redirect("/organizer/register")

  return <>{children}</>
}
